export const TILE = 20;
export const COLS = 48;
export const ROWS = 27;

export type Hero = "cinder" | "drift";
export const HEROES: readonly Hero[] = ["cinder", "drift"];

export interface Vec {
  x: number;
  y: number;
}

export interface Rect extends Vec {
  w: number;
  h: number;
}

export interface Hazard {
  rect: Rect;
  kills: Hero;
}

export interface Level {
  rows: readonly string[];
  solids: Rect[];
  hazards: Hazard[];
  plates: Rect[];
  latch: Rect;
  door: Rect[];
  exits: Record<Hero, Rect>;
  spawns: Record<Hero, Vec>;
}

export const HERO_SIZE = { w: 14, h: 24 } as const;

/**
 * Legend: `#` solid, `w` brine (kills Cinder), `f` ash (kills Drift),
 * `p` plate, `l` latch lever, `D` door, `X` Cinder exit, `Y` Drift exit,
 * `1` Cinder spawn, `2` Drift spawn, `.` empty.
 */
export const LEVEL_ROWS: readonly string[] = [
  "################################################",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#..............................................#",
  "#.....................................Dl.......#",
  "#.....................................Dl.......#",
  "#.....................................Dl.......#",
  "#.....................................DlXXX.YYY#",
  "#.....................................DlXXX#YYY#",
  "#....................................###########",
  "#.............................#######..........#",
  "#..............................................#",
  "#..........................###.................#",
  "#..............................................#",
  "#.....#########...#########....................#",
  "#.1.2#..........pp#............................#",
  "#########wwwwww####ffffff#######################",
  "################################################",
];

function cellRect(col: number, row: number): Rect {
  return { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
}

function bounds(rects: Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function requireOne<T>(items: T[], name: string): T {
  const [first] = items;
  if (items.length === 0 || first === undefined) {
    throw new Error(`level is missing ${name}`);
  }
  return first;
}

export function parseLevel(rows: readonly string[]): Level {
  if (rows.length !== ROWS) throw new Error(`level needs ${ROWS} rows`);
  const cells = new Map<string, Rect[]>();
  rows.forEach((line, row) => {
    if (line.length !== COLS) throw new Error(`row ${row} needs ${COLS} columns`);
    [...line].forEach((ch, col) => {
      if (ch === ".") return;
      const list = cells.get(ch) ?? [];
      list.push(cellRect(col, row));
      cells.set(ch, list);
    });
  });
  const of = (ch: string): Rect[] => cells.get(ch) ?? [];
  const thin = (r: Rect): Rect => ({ x: r.x, y: r.y + TILE - 6, w: r.w, h: 6 });
  const spawn = (ch: string): Vec => {
    const cell = requireOne(of(ch), `spawn '${ch}'`);
    return {
      x: cell.x + (TILE - HERO_SIZE.w) / 2,
      y: cell.y + TILE - HERO_SIZE.h,
    };
  };
  return {
    rows,
    solids: of("#"),
    hazards: [
      ...of("w").map((rect): Hazard => ({ rect, kills: "cinder" })),
      ...of("f").map((rect): Hazard => ({ rect, kills: "drift" })),
    ],
    plates: of("p").map(thin),
    latch: bounds(of("l")),
    door: of("D"),
    exits: {
      cinder: bounds(of("X")),
      drift: bounds(of("Y")),
    },
    spawns: { cinder: spawn("1"), drift: spawn("2") },
  };
}

export const LEVEL: Level = parseLevel(LEVEL_ROWS);
