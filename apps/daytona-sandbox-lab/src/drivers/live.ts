import { CodeLanguage, Daytona, type Sandbox } from "@daytona/sdk";
import type { ExecResult, Language, RunRequest, SandboxInfo } from "../lifecycle";
import type { DriverContext, SandboxDriver, SandboxHandle } from "./types";

/** Seconds to wait for the sandbox to reach `started`. */
const CREATE_TIMEOUT_S = 120;
/** Seconds a single snippet may run before the toolbox kills it. */
const EXEC_TIMEOUT_S = 60;
/** Minutes of inactivity before Daytona stops (and, being ephemeral, deletes) an orphaned sandbox. */
const AUTO_STOP_MINUTES = 5;

function codeLanguageFor(language: Language): CodeLanguage {
  switch (language) {
    case "python":
      return CodeLanguage.PYTHON;
    case "typescript":
      return CodeLanguage.TYPESCRIPT;
    case "javascript":
      return CodeLanguage.JAVASCRIPT;
    case "shell":
      // Shell snippets go through executeCommand; the default (Python) snapshot has bash.
      return CodeLanguage.PYTHON;
    default: {
      const exhaustive: never = language;
      return exhaustive;
    }
  }
}

function toInfo(sandbox: Sandbox, language: Language, state?: SandboxInfo["state"]): SandboxInfo {
  return {
    id: sandbox.id,
    name: sandbox.name,
    state: state ?? sandbox.state ?? "pending",
    target: sandbox.target,
    language,
    cpu: sandbox.cpu,
    memory: sandbox.memory,
    disk: sandbox.disk,
    ephemeral: true,
  };
}

class LiveSandbox implements SandboxHandle {
  info: SandboxInfo;

  constructor(
    private readonly sandbox: Sandbox,
    language: Language,
  ) {
    this.info = toInfo(sandbox, language);
  }

  async exec(req: RunRequest, ctx: DriverContext): Promise<ExecResult> {
    const started = Date.now();
    let response;
    if (req.language === "shell") {
      ctx.log("sandbox.process.executeCommand(...)");
      response = await this.sandbox.process.executeCommand(req.code, undefined, undefined, EXEC_TIMEOUT_S);
    } else {
      ctx.log("sandbox.process.codeRun(...)");
      response = await this.sandbox.process.codeRun(req.code, undefined, EXEC_TIMEOUT_S);
    }
    const stdout = response.result ?? "";
    ctx.log(`exit code ${response.exitCode} · ${stdout.length} bytes on stdout`);
    return { exitCode: response.exitCode, stdout, ms: Date.now() - started, simulated: false };
  }

  async destroy(ctx: DriverContext): Promise<void> {
    ctx.log(`sandbox.delete() · ${this.info.id}`);
    this.info = { ...this.info, state: "destroying" };
    ctx.sandbox(this.info);
    await this.sandbox.delete(60);
    this.info = { ...this.info, state: "destroyed" };
    ctx.sandbox(this.info);
  }
}

export class LiveDriver implements SandboxDriver {
  readonly mode = "live" as const;
  private readonly daytona: Daytona;

  constructor() {
    // Reads DAYTONA_API_KEY / DAYTONA_API_URL / DAYTONA_TARGET from the environment.
    this.daytona = new Daytona();
  }

  async create(req: RunRequest, ctx: DriverContext): Promise<SandboxHandle> {
    const language = codeLanguageFor(req.language);
    ctx.log(`daytona.create({ language: "${language}", ephemeral: true, autoStopInterval: ${AUTO_STOP_MINUTES} })`);
    const sandbox = await this.daytona.create(
      {
        language,
        ephemeral: true,
        autoStopInterval: AUTO_STOP_MINUTES,
        labels: { app: "daytona-sandbox-lab" },
      },
      { timeout: CREATE_TIMEOUT_S },
    );
    ctx.log(`sandbox ${sandbox.id} is ${sandbox.state ?? "started"} on ${sandbox.target}`);
    const handle = new LiveSandbox(sandbox, req.language);
    ctx.sandbox(handle.info);
    return handle;
  }
}
