import type { ExecResult, Language, RunRequest, SandboxInfo } from "../lifecycle";
import { languageLabel } from "../lifecycle";
import { snippetById } from "../snippets";
import type { DriverContext, SandboxDriver, SandboxHandle } from "./types";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

function runtimeFor(language: Language): string {
  switch (language) {
    case "python":
      return "python 3.13";
    case "typescript":
      return "node 22 + tsx";
    case "javascript":
      return "node 22";
    case "shell":
      return "bash";
    default: {
      const exhaustive: never = language;
      return exhaustive;
    }
  }
}

function simulatedOutput(req: RunRequest, info: SandboxInfo): string {
  const preset = snippetById(req.presetId);
  if (preset && preset.code === req.code) {
    return preset.mockOutput.replaceAll("{{id}}", info.id.slice(0, 12));
  }
  const lines = req.code.split("\n").filter((l) => l.trim().length > 0).length;
  return [
    `[mock] received ${lines} line${lines === 1 ? "" : "s"} of ${languageLabel(req.language)}.`,
    "[mock] Nothing is executed in mock mode — the host stays untouched.",
    "[mock] Set DAYTONA_API_KEY on the server to run this inside a real sandbox.",
    "",
  ].join("\n");
}

class MockSandbox implements SandboxHandle {
  constructor(public info: SandboxInfo) {}

  private transition(state: SandboxInfo["state"], ctx: DriverContext) {
    this.info = { ...this.info, state };
    ctx.sandbox(this.info);
  }

  async exec(req: RunRequest, ctx: DriverContext): Promise<ExecResult> {
    const started = Date.now();
    ctx.log(`toolbox → ${req.language === "shell" ? "process.executeCommand" : "process.codeRun"} (${runtimeFor(req.language)})`);
    await sleep(jitter(350));
    ctx.log("snippet running…");
    await sleep(jitter(req.presetId === "py-primes" ? 700 : 400));
    const stdout = simulatedOutput(req, this.info);
    ctx.log(`exit code 0 · ${stdout.length} bytes on stdout`);
    return { exitCode: 0, stdout, ms: Date.now() - started, simulated: true };
  }

  async destroy(ctx: DriverContext): Promise<void> {
    ctx.log(`sandbox.delete() · ${this.info.id}`);
    this.transition("destroying", ctx);
    await sleep(jitter(450));
    ctx.log("filesystem, processes and network released");
    this.transition("destroyed", ctx);
  }
}

export class MockDriver implements SandboxDriver {
  readonly mode = "mock" as const;

  async create(req: RunRequest, ctx: DriverContext): Promise<SandboxHandle> {
    const id = crypto.randomUUID();
    let info: SandboxInfo = {
      id,
      name: `lab-${id.slice(0, 8)}`,
      state: "pending",
      target: "mock-us",
      language: req.language,
      cpu: 1,
      memory: 1,
      disk: 3,
      ephemeral: true,
    };
    const push = (state: SandboxInfo["state"]) => {
      info = { ...info, state };
      ctx.sandbox(info);
    };

    ctx.log(`daytona.create({ language: "${req.language}", ephemeral: true })`);
    push("pending");
    await sleep(jitter(250));
    ctx.log(`scheduled on target ${info.target} · 1 vCPU · 1 GiB · 3 GiB disk`);
    push("creating");
    await sleep(jitter(650));
    ctx.log("rootfs mounted, toolbox daemon starting");
    push("starting");
    await sleep(jitter(400));
    ctx.log(`sandbox ${info.name} is started`);
    push("started");
    return new MockSandbox(info);
  }
}
