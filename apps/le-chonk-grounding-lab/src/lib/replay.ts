import type { ReplayFixture } from "./types";

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/[?.!]+$/g, "").replace(/\s+/g, " ");
}

export function findReplay(
  fixtures: readonly ReplayFixture[],
  imageId: string,
  query: string,
): ReplayFixture | undefined {
  const wanted = normalizeQuery(query);
  return fixtures.find(
    (fixture) => fixture.imageId === imageId && normalizeQuery(fixture.query) === wanted,
  );
}
