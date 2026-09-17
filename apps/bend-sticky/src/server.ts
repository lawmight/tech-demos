import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

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

async function bendVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(bendBin(), ["--version"], { env: process.env });
    let out = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on("close", (code) => {
      resolve(code === 0 ? out.trim() : null);
    });
    proc.on("error", () => resolve(null));
  });
}

async function runBend(file: string): Promise<BendResult> {
  const command = `bend ${file}`;
  const version = await bendVersion();
  const bendAvailable = version !== null;

  if (!bendAvailable) {
    const sample = file === "PROOF.bend" ? SAMPLE.proof : SAMPLE.parallel;
    return {
      ok: true,
      stdout: `[bend not installed — sample output]\n${sample}`,
      stderr: "",
      command,
      bendAvailable: false,
      bendVersion: null,
    };
  }

  return new Promise((resolve) => {
    const proc = spawn(bendBin(), [file], {
      cwd: BEND_DIR,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      resolve({
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
        bendAvailable: true,
        bendVersion: version,
      });
    });
    proc.on("error", (err) => {
      resolve({
        ok: false,
        stdout: "",
        stderr: String(err),
        command,
        bendAvailable: false,
        bendVersion: null,
      });
    });
  });
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
      const version = await bendVersion();
      return Response.json({
        bendAvailable: version !== null,
        bendVersion: version,
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
