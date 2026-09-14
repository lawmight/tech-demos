import type { ExecResult, Mode, RunRequest, SandboxInfo } from "../lifecycle";

/** Callbacks a driver uses to narrate progress; the server forwards these to the browser. */
export interface DriverContext {
  log(message: string): void;
  sandbox(info: SandboxInfo): void;
}

export interface SandboxHandle {
  readonly info: SandboxInfo;
  exec(req: RunRequest, ctx: DriverContext): Promise<ExecResult>;
  destroy(ctx: DriverContext): Promise<void>;
}

export interface SandboxDriver {
  readonly mode: Mode;
  create(req: RunRequest, ctx: DriverContext): Promise<SandboxHandle>;
}
