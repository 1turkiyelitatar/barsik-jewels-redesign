export const SIZE = 8;
export const TYPES = 5;
export type Special = "row" | "col" | "bomb" | "color";
export type Tile = { id: number; t: number; s?: Special | undefined };
export type Board = (Tile | null)[];

let nextId = 1;
export const newTile = (t = Math.floor(Math.random() * TYPES), s?: Special): Tile => ({
  id: nextId++,
  t,
  s,
});
export const rc = (i: number) => [Math.floor(i / SIZE), i % SIZE] as const;
export const idx = (r: number, c: number) => r * SIZE + c;

export function makeBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      let t: number;
      do t = Math.floor(Math.random() * TYPES);
      while (
        (c >= 2 && b[idx(r, c - 1)]!.t === t && b[idx(r, c - 2)]!.t === t) ||
        (r >= 2 && b[idx(r - 1, c)]!.t === t && b[idx(r - 2, c)]!.t === t)
      );
      b.push(newTile(t));
    }
  return hasMoves(b) ? b : makeBoard();
}

export type Group = { cells: number[]; create?: { at: number; s: Special; t: number } | undefined };

export function findGroups(b: Board, prefer: number[] = []): Group[] {
  const runs: { cells: number[]; dir: "h" | "v" }[] = [];
  const tt = (i: number) => (b[i] && b[i]!.s !== "color" ? b[i]!.t : -1);
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE;) {
      const t = tt(idx(r, c));
      let e = c;
      while (e < SIZE && t >= 0 && tt(idx(r, e)) === t) e++;
      if (e - c >= 3)
        runs.push({ dir: "h", cells: Array.from({ length: e - c }, (_, k) => idx(r, c + k)) });
      c = Math.max(e, c + 1);
    }
  for (let c = 0; c < SIZE; c++)
    for (let r = 0; r < SIZE;) {
      const t = tt(idx(r, c));
      let e = r;
      while (e < SIZE && t >= 0 && tt(idx(e, c)) === t) e++;
      if (e - r >= 3)
        runs.push({ dir: "v", cells: Array.from({ length: e - r }, (_, k) => idx(r + k, c)) });
      r = Math.max(e, r + 1);
    }
  // merge intersecting runs
  const groups: { runs: typeof runs }[] = [];
  for (const run of runs) {
    const hit = groups.filter((g) =>
      g.runs.some((x) => x.cells.some((c) => run.cells.includes(c))),
    );
    const merged = { runs: [run, ...hit.flatMap((h) => h.runs)] };
    for (const h of hit) groups.splice(groups.indexOf(h), 1);
    groups.push(merged);
  }
  return groups.map((g) => {
    const cells = [...new Set(g.runs.flatMap((r) => r.cells))];
    const max = Math.max(...g.runs.map((r) => r.cells.length));
    const hasH = g.runs.some((r) => r.dir === "h");
    const hasV = g.runs.some((r) => r.dir === "v");
    let s: Special | undefined;
    if (max >= 5) s = "color";
    else if (hasH && hasV) s = "bomb";
    else if (max === 4) s = g.runs[0]!.dir === "h" ? "row" : "col";
    const at = cells.find((c) => prefer.includes(c)) ?? cells[Math.floor(cells.length / 2)]!;
    return { cells, create: s ? { at, s, t: b[cells[0]!]!.t } : undefined };
  });
}

/** Expand cleared set with special-tile effects. */
export function expand(
  b: Board,
  cells: Iterable<number>,
  keep: Set<number> = new Set(),
): Set<number> {
  const out = new Set<number>();
  const q = [...cells];
  while (q.length) {
    const i = q.pop()!;
    if (out.has(i) || !b[i]) continue;
    out.add(i);
    const tile = b[i]!;
    if (!tile.s || keep.has(i)) continue;
    const [r, c] = rc(i);
    const add: number[] = [];
    if (tile.s === "row") for (let k = 0; k < SIZE; k++) add.push(idx(r, k));
    if (tile.s === "col") for (let k = 0; k < SIZE; k++) add.push(idx(k, c));
    if (tile.s === "bomb")
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr,
            cc = c + dc;
          if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) add.push(idx(rr, cc));
        }
    if (tile.s === "color") {
      const t = Math.floor(Math.random() * TYPES);
      b.forEach((x, j) => x && x.t === t && add.push(j));
    }
    q.push(...add);
  }
  return out;
}

/** Collapse columns; returns new board and drop distance per new tile id. */
export function gravity(b: Board): { board: Board; drops: Map<number, number> } {
  const nb: Board = Array(SIZE * SIZE).fill(null);
  const drops = new Map<number, number>();
  for (let c = 0; c < SIZE; c++) {
    let w = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const t = b[idx(r, c)];
      if (t) {
        if (w !== r) drops.set(t.id, w - r);
        nb[idx(w--, c)] = t;
      }
    }
    const empty = w + 1;
    for (; w >= 0; w--) {
      const t = newTile();
      drops.set(t.id, empty);
      nb[idx(w, c)] = t;
    }
  }
  return { board: nb, drops };
}

export function hasMoves(b: Board): boolean {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (b[i]?.s === "color") return true;
    const [r, c] = rc(i);
    for (const j of [c < SIZE - 1 ? i + 1 : -1, r < SIZE - 1 ? i + SIZE : -1]) {
      if (j < 0) continue;
      const nb = [...b];
      const tmp = nb[i]!;
      nb[i] = nb[j]!;
      nb[j] = tmp;
      if (findGroups(nb).length) return true;
    }
  }
  return false;
}

export type Level = {
  n: number;
  moves: number;
  goals: { t: number; count: number }[];
  scoreGoal?: number;
  stars: [number, number, number];
};
const LEVEL_RULES: { moves: number; goals: [number, number][]; scoreGoal?: number }[] = [
  {
    moves: 20,
    goals: [
      [1, 15],
      [0, 15],
    ],
  },
  {
    moves: 22,
    goals: [
      [4, 18],
      [3, 15],
    ],
  },
  {
    moves: 21,
    goals: [
      [2, 20],
      [1, 18],
    ],
  },
  {
    moves: 24,
    goals: [
      [3, 22],
      [4, 20],
    ],
  },
  {
    moves: 23,
    goals: [
      [4, 24],
      [0, 20],
    ],
  },
  { moves: 22, goals: [[2, 25]], scoreGoal: 2400 },
  {
    moves: 24,
    goals: [
      [1, 26],
      [3, 24],
    ],
  },
  { moves: 21, goals: [[0, 25]], scoreGoal: 3000 },
  {
    moves: 25,
    goals: [
      [2, 28],
      [4, 25],
    ],
  },
  {
    moves: 23,
    goals: [
      [3, 30],
      [1, 25],
    ],
  },
  { moves: 24, goals: [[4, 30]], scoreGoal: 3600 },
  {
    moves: 22,
    goals: [
      [2, 30],
      [0, 26],
    ],
  },
  { moves: 25, goals: [[3, 32]], scoreGoal: 4200 },
  {
    moves: 24,
    goals: [
      [1, 32],
      [4, 30],
    ],
  },
  {
    moves: 26,
    goals: [
      [0, 34],
      [2, 34],
    ],
    scoreGoal: 5000,
  },
  {
    moves: 30,
    goals: [
      [0, 40],
      [1, 40],
    ],
    scoreGoal: 6500,
  },
];
export function getLevel(n: number): Level {
  const rule = LEVEL_RULES[n - 1] ?? LEVEL_RULES[0];
  if (!rule) throw new Error("Level rules are missing");
  const base = Math.max(
    rule.goals.reduce((sum, [, count]) => sum + count * 30, 0),
    rule.scoreGoal ?? 0,
  );
  return {
    n,
    moves: rule.moves,
    goals: rule.goals.map(([t, count]) => ({ t, count })),
    ...(rule.scoreGoal === undefined ? {} : { scoreGoal: rule.scoreGoal }),
    stars: [Math.round(base * 0.6), Math.round(base * 1.1), Math.round(base * 1.7)],
  };
}

export const goalsComplete = (level: Level, remaining: number[], score: number) =>
  remaining.length === level.goals.length &&
  remaining.every((g) => g === 0) &&
  score >= (level.scoreGoal ?? 0);

export function starsFor(score: number, l: Level) {
  return l.stars.filter((s) => score >= s).length;
}
