import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const BEND_DIR = join(ROOT, "bend");
const PORT = Number(process.env.PORT ?? 3847);

type BendResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  command: string;
  bendAvailable: boolean;
  bendVersion: string | null;
};

const BEND_TIMEOUT_MS = 10_000;

const SAMPLE = {
  proof: "All terms check.",
  parallel: [
    "pow2(12) = 4096",
    "pow2(16) = 65536",
    "",
    "The line `a b = pow2(p) pow2(p)` is a parallel call.",
    "Bend schedules both recursive calls independently — no threads, no locks.",
  ].join("\n"),
};

function bendBin(): string {
  const home = process.env.BEND_HOME ?? join(process.env.HOME ?? "", ".bend");
  return join(home, "bin", "bend");
}

type BendChild = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError: string | null;
};

type VersionProbe = {
  version: string | null;
  timedOut: boolean;
};

function timeoutMessage(command: string, waitedMs: number): string {
  const seconds = Math.max(1, Math.round(waitedMs / 1000));
  return `${command} timed out after ${seconds}s`;
}

function execBend(args: string[], cwd: string | undefined, timeoutMs: number): Promise<BendChild> {
  return new Promise((resolve) => {
    execFile(
      bendBin(),
      args,
      {
        cwd,
        env: process.env,
        encoding: "utf8",
        timeout: timeoutMs,
        killSignal: "SIGKILL",
        maxBuffer: 1_048_576,
      },
      (err, stdout, stderr) => {
        const out = stdout ?? "";
        const errText = stderr ?? "";
        if (!err) {
          resolve({ code: 0, stdout: out, stderr: errText, timedOut: false, spawnError: null });
          return;
        }
        if (err.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
          resolve({ code: null, stdout: out, stderr: errText, timedOut: false, spawnError: err.message });
          return;
        }
        if (err.killed) {
          resolve({ code: null, stdout: out, stderr: errText, timedOut: true, spawnError: null });
          return;
        }
        if (typeof err.code === "number") {
          resolve({ code: err.code, stdout: out, stderr: errText, timedOut: false, spawnError: null });
          return;
        }
        resolve({
          code: null,
          stdout: out,
          stderr: errText,
          timedOut: false,
          spawnError: err.message,
        });
      },
    );
  });
}

async function bendVersion(): Promise<VersionProbe> {
  const child = await execBend(["--version"], undefined, BEND_TIMEOUT_MS);
  if (child.timedOut) return { version: null, timedOut: true };
  if (child.spawnError !== null || child.code !== 0) return { version: null, timedOut: false };
  return { version: child.stdout.trim(), timedOut: false };
}

async function runBend(file: string): Promise<BendResult> {
  const command = `bend ${file}`;
  const started = Date.now();
  const probed = await bendVersion();

  if (probed.timedOut) {
    return {
      ok: false,
      stdout: "",
      stderr: timeoutMessage("bend --version", BEND_TIMEOUT_MS),
      command,
      bendAvailable: false,
      bendVersion: null,
    };
  }

  if (probed.version === null) {
    const sample = file === "PROOF.bend" ? SAMPLE.proof : SAMPLE.parallel;
    return {
      ok: false,
      stdout: `[bend not installed — sample output]\n${sample}`,
      stderr: "",
      command,
      bendAvailable: false,
      bendVersion: null,
    };
  }

  const remaining = BEND_TIMEOUT_MS - (Date.now() - started);
  if (remaining <= 0) {
    return {
      ok: false,
      stdout: "",
      stderr: timeoutMessage(command, BEND_TIMEOUT_MS),
      command,
      bendAvailable: true,
      bendVersion: probed.version,
    };
  }

  const child = await execBend([file], BEND_DIR, remaining);
  if (child.timedOut) {
    return {
      ok: false,
      stdout: child.stdout.trim(),
      stderr: timeoutMessage(command, remaining),
      command,
      bendAvailable: true,
      bendVersion: probed.version,
    };
  }
  if (child.spawnError !== null) {
    return {
      ok: false,
      stdout: "",
      stderr: child.spawnError,
      command,
      bendAvailable: false,
      bendVersion: null,
    };
  }
  return {
    ok: child.code === 0,
    stdout: child.stdout.trim(),
    stderr: child.stderr.trim(),
    command,
    bendAvailable: true,
    bendVersion: probed.version,
  };
}

const SOURCES: Record<string, string> = {
  "demo.bend": "bend/demo.bend",
  "LAWS.bend": "bend/LAWS.bend",
  "PROOF.bend": "bend/PROOF.bend",
  "parallel.bend": "bend/parallel.bend",
};

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      const html = await readFile(join(import.meta.dir, "index.html"), "utf8");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/app.css") {
      const css = await readFile(join(import.meta.dir, "app.css"), "utf8");
      return new Response(css, { headers: { "Content-Type": "text/css" } });
    }

    if (url.pathname === "/app.js") {
      const js = await readFile(join(import.meta.dir, "app.js"), "utf8");
      return new Response(js, { headers: { "Content-Type": "application/javascript" } });
    }

    if (url.pathname === "/api/status") {
      const probed = await bendVersion();
      return Response.json({
        bendAvailable: probed.version !== null,
        bendVersion: probed.version,
        bendDir: BEND_DIR,
      });
    }

    if (url.pathname === "/api/source" && req.method === "GET") {
      const name = url.searchParams.get("file");
      if (!name || !(name in SOURCES)) {
        return Response.json({ error: "unknown file" }, { status: 400 });
      }
      const text = await readFile(join(ROOT, SOURCES[name]), "utf8");
      return Response.json({ file: name, source: text });
    }

    if (url.pathname === "/api/proof" && req.method === "POST") {
      const result = await runBend("PROOF.bend");
      return Response.json(result);
    }

    if (url.pathname === "/api/parallel" && req.method === "POST") {
      const result = await runBend("parallel.bend");
      return Response.json(result);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Bend sticky playground → http://localhost:${server.port}`);
