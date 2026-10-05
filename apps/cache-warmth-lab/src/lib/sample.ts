import type { Session } from "./types";

const minute = 60_000;

export const sampleSession: Session = {
  id: "sample-timer",
  title: "Sample coding session",
  source: "sample",
  turns: [
    {
      id: "t1",
      atMs: 0,
      label: "Sketch the cache timer",
      promptTokens: 8_000,
      outputTokens: 600,
    },
    {
      id: "t2",
      atMs: 40_000,
      label: "Draw the TTL bar",
      promptTokens: 9_600,
      outputTokens: 900,
    },
    {
      id: "t3",
      atMs: 80_000,
      label: "Wire play and pause",
      promptTokens: 11_000,
      outputTokens: 700,
    },
    {
      id: "t4",
      atMs: 120_000,
      label: "Leave a note about the idle gap",
      promptTokens: 12_400,
      outputTokens: 500,
    },
    {
      id: "t5",
      atMs: 120_000 + 7 * minute,
      label: "Resume after a seven-minute break",
      promptTokens: 14_000,
      outputTokens: 800,
    },
  ],
};
