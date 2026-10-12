import type { SkillParse } from "./types";

export const SAMPLE_SKILL = `# skill: book-dinner
site: OpenTable-style booking page, one page per restaurant
steps:
1. check_availability for every candidate in parallel (party_size, date=tonight)
2. pick the earliest slot between 18:30 and 21:00
3. book with fields: restaurant, party_size, time, name
4. done with the confirmation code
`;

export function parseSkill(text: string): SkillParse {
  const name = /^\s*#\s*skill:\s*(\S.*?)\s*$/im.exec(text)?.[1];
  if (!name) return { ok: false, error: "Missing '# skill: <name>' header" };

  const steps = text
    .split("\n")
    .map((line) => /^\s*\d+[.)]\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((step): step is string => step !== undefined);
  if (steps.length === 0) return { ok: false, error: "Skill needs at least one numbered step" };

  const fieldList = /book with fields:\s*(.+)$/im.exec(text)?.[1] ?? "";
  const bookFields = fieldList
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field.length > 0);

  return { ok: true, skill: { name, steps, parallel: /parallel/i.test(text), bookFields } };
}
