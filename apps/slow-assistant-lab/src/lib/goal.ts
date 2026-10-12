import type { Goal, Restaurant, World } from "./types";

const DEFAULT_PARTY_SIZE = 2;
const FALLBACK_CHECK_MS = 5000;

export function parseGoal(text: string): Goal {
  const party = /\bfor\s+(\d+)\b/i.exec(text);
  const partySize = party?.[1] ? Number(party[1]) : DEFAULT_PARTY_SIZE;
  const list = /one of:\s*(.*)$/is.exec(text)?.[1] ?? "";
  const candidates = list
    .replace(/\.\s*$/, "")
    .split(/\s*,\s*(?:or\s+)?|\s+or\s+/i)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return { text, partySize, candidates };
}

export function lookupRestaurant(world: World, name: string): Restaurant {
  const key = name.toLowerCase();
  return (
    world.restaurants.find((r) => r.name.toLowerCase() === key) ?? { name, slots: [], checkMs: FALLBACK_CHECK_MS }
  );
}
