import { FAST_LEVERS } from "./planner";
import { SAMPLE_SKILL } from "./skill";
import type { Levers, Metrics } from "./types";
import { DEFAULT_GOAL_TEXT } from "./world";

export const STORAGE_KEY = "slow-assistant-lab:v1";

export type ModelMode = "deterministic" | "hf";
export const SPEEDS = [10, 20, 50, 100] as const;
export type Speed = (typeof SPEEDS)[number];

export type Saved = {
  goalText: string;
  skillText: string;
  levers: Levers;
  modelMode: ModelMode;
  speed: Speed;
  lastMetrics: { slow: Metrics | null; fast: Metrics | null };
};

export const DEFAULT_SAVED: Saved = {
  goalText: DEFAULT_GOAL_TEXT,
  skillText: SAMPLE_SKILL,
  levers: FAST_LEVERS,
  modelMode: "deterministic",
  speed: 20,
  lastMetrics: { slow: null, fast: null },
};

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseLevers(value: unknown): Levers {
  const fallback = DEFAULT_SAVED.levers;
  if (!isRecord(value)) return fallback;
  return {
    parallel: bool(value.parallel, fallback.parallel),
    skill: bool(value.skill, fallback.skill),
    fastTurns: bool(value.fastTurns, fallback.fastTurns),
  };
}

const METRIC_KEYS = ["toolCalls", "modelTurns", "parallelBatches", "failedCalls", "wallMs"] as const;

function parseMetrics(value: unknown): Metrics | null {
  if (!isRecord(value)) return null;
  const out: Metrics = { toolCalls: 0, modelTurns: 0, parallelBatches: 0, failedCalls: 0, wallMs: 0 };
  for (const key of METRIC_KEYS) {
    const n = value[key];
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[key] = n;
  }
  return out;
}

export function parseSaved(raw: string | null): Saved {
  if (raw === null) return DEFAULT_SAVED;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SAVED;
  }
  if (!isRecord(data)) return DEFAULT_SAVED;

  const speed = SPEEDS.find((s) => s === data.speed) ?? DEFAULT_SAVED.speed;
  const last = isRecord(data.lastMetrics) ? data.lastMetrics : {};
  return {
    goalText: str(data.goalText, DEFAULT_SAVED.goalText),
    skillText: str(data.skillText, DEFAULT_SAVED.skillText),
    levers: parseLevers(data.levers),
    modelMode: data.modelMode === "hf" ? "hf" : "deterministic",
    speed,
    lastMetrics: { slow: parseMetrics(last.slow), fast: parseMetrics(last.fast) },
  };
}
