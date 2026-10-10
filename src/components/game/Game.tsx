import { createPortal } from "react-dom";
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Star,
  Volume2,
  VolumeX,
  Share2,
  RotateCcw,
  Copy,
  X,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import {
  SIZE,
  type Board,
  type Level,
  type Special,
  type Tile,
  goalsComplete,
  makeBoard,
  findGroups,
  expand,
  gravity,
  hasMoves,
  getLevel,
  starsFor,
  rc,
  newTile,
} from "@/lib/match3";
import { sfx } from "@/lib/sfx";
import { Button } from "@/components/ui/button";
import { LEVEL_COUNT, LOCATIONS } from "@/lib/saga";
import { TILE_IMG, TILE_NAME, SPECIAL_IMG, BARSIK, BG } from "./assets";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Particle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hue: string;
  sz: number;
};
type Fx = {
  id: number;
  kind: "row" | "col" | "ring" | "flash" | "score" | "wave" | "pull";
  x: number;
  y: number;
  text?: string;
  tx?: number;
  ty?: number;
  lvl?: number;
};
let pid = 0;

/** Static checkerboard — created once, never re-rendered. */
const GRID = Array.from({ length: SIZE * SIZE }).map((_, i) => {
  const [r, c] = rc(i);
  return (
    <div
      key={"c" + i}
      className={`absolute rounded-lg ${(r + c) % 2 ? "bg-emerald/10" : "bg-gold/10"}`}
      style={{
        left: 0,
        top: 0,
        transform: `translate(${c * 100}%, ${r * 100}%)`,
        width: "12.5%",
        height: "12.5%",
      }}
    />
  );
});

/** Animated score counter: updates its own text node per frame instead of re-rendering the game. */
function ScoreCounter({ value }: { value: number }) {
  const el = useRef<HTMLDivElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = shown.current,
      to = value;
    if (to <= from) {
      shown.current = to;
      node.textContent = String(to);
      return;
    }
    node.animate?.(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.18)", color: "var(--gold)", offset: 0.35 },
        { transform: "scale(1)" },
      ],
      { duration: 350, easing: "ease-out" },
    );
    const t0 = performance.now(),
      dur = 450;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      shown.current = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      node.textContent = String(shown.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div
      ref={el}
      className="inline-block font-display text-xl leading-none tabular-nums text-foreground"
    >
      {shown.current}
    </div>
  );
}

type TileProps = {
  t: Tile;
  i: number;
  drop: number | undefined;
  pop: boolean;
  selected: boolean;
  bad: boolean;
  onDown: (i: number, e: React.PointerEvent) => void;
  onUp: (i: number) => void;
};
const TileView = memo(function TileView({
  t,
  i,
  drop,
  pop,
  selected,
  bad,
  onDown,
  onUp,
}: TileProps) {
  const [r, c] = rc(i);
  return (
    <Button
      variant="ghost"
      aria-label={`${TILE_NAME[t.t]}, строка ${r + 1}, столбец ${c + 1}`}
      data-tile-index={i}
      data-tile-type={t.t}
      data-tile-special={t.s ?? ""}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDown(i, { clientX: 0, clientY: 0 } as React.PointerEvent);
          onUp(i);
        }
      }}
      onPointerDown={(e) => onDown(i, e)}
      onPointerUp={() => onUp(i)}
      className={`absolute block rounded-none p-[2px] ${drop ? "" : "transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"} will-change-transform hover:bg-transparent`}
      style={{
        left: 0,
        top: 0,
        transform: `translate(${c * 100}%, ${r * 100}%)`,
        width: "12.5%",
        height: "12.5%",
        zIndex: selected ? 5 : undefined,
      }}
    >
      <div
        className={`relative h-full w-full transition-transform duration-150 ${drop ? "animate-drop2" : ""} ${pop ? "animate-pop3" : ""} ${selected ? "tile-selected" : ""} ${bad ? "animate-wiggle" : ""}`}
        style={
          {
            ["--drop"]: drop ?? 0,
            ["--dur"]: `${0.2 + Math.sqrt(drop ?? 0) * 0.09}s`,
            ["--delay"]: `${c * 0.012}s`,
          } as CSSProperties
        }
      >
        {selected && <div className="sel-aura" />}
        <img
          draggable={false}
          src={t.s ? SPECIAL_IMG[t.s] : TILE_IMG[t.t]}
          alt=""
          className={`h-full w-full object-contain ${t.s ? "animate-glow" : ""}`}
        />
        {(t.s === "row" || t.s === "col") && (
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald text-[10px] font-bold text-primary-foreground">
            {t.s === "row" ? "↔" : "↕"}
          </span>
        )}
        {t.s && t.s !== "color" && (
          <img
            src={TILE_IMG[t.t]}
            alt=""
            className="absolute -left-1 -top-1 h-1/3 w-1/3 object-contain"
          />
        )}
      </div>
    </Button>
  );
});

type GameProps = {
  initialLevel: number;
  mute: boolean;
  toggleMute: () => void;
  onMap: () => void;
  onNext: (n: number) => void;
  onWin: (n: number, score: number, stars: number) => void;
};

export default function Game({ initialLevel, mute, toggleMute, onMap, onNext, onWin }: GameProps) {
  const [levelN, setLevelN] = useState(initialLevel);
  const [level, setLevel] = useState<Level>(() => getLevel(initialLevel));
  const [board, setBoardState] = useState<Board>(() => Array(SIZE * SIZE).fill(null));
  const boardRef = useRef<Board>(board);
  const [drops, setDrops] = useState<Map<number, number>>(new Map());
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [goals, setGoals] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [punch, setPunch] = useState<Set<number>>(new Set());
  const [flyers, setFlyers] = useState<
    { id: number; src: string; x0: number; y0: number; x1: number; y1: number; d: number }[]
  >([]);
  const [doneFlash, setDoneFlash] = useState<Set<number>>(new Set());
  const boardEl = useRef<HTMLDivElement>(null);
  const goalEls = useRef<(HTMLDivElement | null)[]>([]);
  const [bad, setBad] = useState<Set<number>>(new Set());
  const [state, setState] = useState<"play" | "win" | "lose">("play");
  const [shown, setShown] = useState(0);
  const [starsIn, setStarsIn] = useState(0);
  useEffect(() => {
    if (state !== "win") {
      setShown(0);
      setStarsIn(0);
      return;
    }
    const target = scoreRef.current,
      t0 = performance.now(),
      dur = 1400;
    const earned = Math.max(1, starsFor(target, getLevel(levelN)));
    let raf = 0,
      lastTick = 0;
    const timers = [0, 1, 2].slice(0, earned).map((k) =>
      window.setTimeout(
        () => {
          setStarsIn(k + 1);
          sfx.line();
        },
        500 + k * 420,
      ),
    );
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur),
        e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * e));
      if (now - lastTick > 90 && p < 1) {
        lastTick = now;
        sfx.click();
      }
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [state, levelN]);
  const [share, setShare] = useState(false);
  const busy = useRef(false);
  const scoreRef = useRef(0);
  const goalsRef = useRef<number[]>([]);
  const movesRef = useRef(0);

  const commit = (b: Board) => {
    boardRef.current = b;
    setBoardState(b);
  };

  const start = useCallback((n: number) => {
    const l = getLevel(n);
    setLevelN(n);
    setLevel(l);
    const b = makeBoard();
    const d = new Map<number, number>();
    b.forEach((t, i) => t && d.set(t.id, rc(i)[0] + 2));
    setDrops(d);
    commit(b);
    movesRef.current = l.moves;
    setMoves(l.moves);
    scoreRef.current = 0;
    setScore(0);
    goalsRef.current = l.goals.map((g) => g.count);
    setGoals(goalsRef.current);
    setState("play");
    setSel(null);
    busy.current = false;
  }, []);
  const mounted = useRef(true);
  const timers = useRef(new Set<number>());
  const liveParticles = useRef(0);
  const liveFx = useRef(0);
  const [lowFx, setLowFx] = useState(false);
  useEffect(() => {
    setLowFx(window.matchMedia("(pointer: coarse), (max-width: 768px)").matches);
  }, []);
  /** setTimeout that is cancelled on unmount and never fires into an unmounted game. */
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (mounted.current) fn();
    }, ms);
    timers.current.add(id);
  };
  useEffect(() => {
    mounted.current = true;
    start(initialLevel);
    const t = timers.current;
    return () => {
      mounted.current = false;
      t.forEach((id) => clearTimeout(id));
      t.clear();
    };
  }, [start, initialLevel]);

  // Shared effect budget: total live particles / fx nodes are capped; bigger cascades get fewer secondary effects.
  const burst = (cells: number[], big = false, lvl = 1) => {
    if (!cells.length) return;
    const cap = lowFx ? 28 : 64;
    const free = cap - liveParticles.current;
    let want = (big ? 22 : 10) + Math.min(cells.length, 10);
    if (lvl >= 3) want = Math.round(want * 0.5);
    else if (lvl === 2) want = Math.round(want * 0.75);
    if (lowFx) want = Math.round(want * 0.6);
    const total = Math.max(0, Math.min(free, want));
    if (!total) return;
    const ps: Particle[] = [];
    const stride = cells.length / total;
    for (let k = 0; k < total; k++) {
      const [r, c] = rc(cells[Math.floor(k * stride) % cells.length]!);
      const a = Math.random() * Math.PI * 2,
        s = 25 + Math.random() * (big ? 110 : 55);
      ps.push({
        id: pid++,
        x: (c + 0.5) * 12.5,
        y: (r + 0.5) * 12.5,
        dx: Math.cos(a) * s,
        dy: Math.sin(a) * s,
        hue:
          ["var(--gold)", "var(--emerald)", "var(--card)", "var(--blush)"][k % 4] ?? "var(--gold)",
        sz: 6 + Math.random() * (big ? 14 : 9),
      });
    }
    liveParticles.current += ps.length;
    setParticles((p) => [...p, ...ps]);
    later(() => {
      liveParticles.current -= ps.length;
      setParticles((p) => p.filter((x) => !ps.includes(x)));
    }, 800);
  };
  const addFx = (items: Omit<Fx, "id">[], ttl = 1000) => {
    const room = Math.max(0, (lowFx ? 14 : 28) - liveFx.current);
    // keep the score popup and primary effects (front of list) if over budget
    const score = items.filter((f) => f.kind === "score");
    const rest = items.filter((f) => f.kind !== "score").slice(0, Math.max(0, room - score.length));
    const fs = [...rest, ...score].map((f) => ({ ...f, id: pid++ }));
    liveFx.current += fs.length;
    setFx((p) => [...p, ...fs]);
    later(() => {
      liveFx.current -= fs.length;
      setFx((p) => p.filter((x) => !fs.includes(x)));
    }, ttl);
  };

  const clearCells = async (
    cleared: Set<number>,
    creates: { at: number; s: Special; t: number }[],
    c: number,
  ) => {
    const b = [...boardRef.current];
    const hasBomb = [...cleared].some((i) => b[i]?.s === "bomb");
    const hasLine = [...cleared].some(
      (i) => b[i]?.s === "row" || b[i]?.s === "col" || b[i]?.s === "color",
    );
    const g = [...goalsRef.current];
    const hit = new Set<number>();
    const fly: { k: number; i: number; t: number }[] = [];
    cleared.forEach((i) => {
      const t = b[i];
      if (!t) return;
      level.goals.forEach((gl, k) => {
        if (gl.t === t.t && !t.s && (g[k] ?? 0) > 0) {
          g[k] = Math.max(0, (g[k] ?? 0) - 1);
          hit.add(k);
          fly.push({ k, i, t: t.t });
        }
      });
    });
    const prev = goalsRef.current;
    const br = boardEl.current?.getBoundingClientRect();
    if (br && fly.length) {
      const cell = br.width / SIZE;
      const fs = fly.slice(0, lowFx ? 8 : 14).flatMap((f, n) => {
        const ge = goalEls.current[f.k]?.getBoundingClientRect();
        if (!ge) return [];
        const [r, c] = rc(f.i);
        return [
          {
            id: pid++,
            src: TILE_IMG[f.t] ?? "",
            x0: br.left + (c + 0.5) * cell,
            y0: br.top + (r + 0.5) * cell,
            x1: ge.left + 20,
            y1: ge.top + ge.height / 2,
            d: n * 45,
          },
        ];
      });
      setFlyers((p) => [...p, ...fs]);
      const lastD = Math.max(0, ...fs.map((x) => x.d));
      later(() => setFlyers((p) => p.filter((x) => !fs.includes(x))), 720 + lastD + 40);
    }
    const flyMs = 750;
    later(() => {
      if (!mounted.current) return;
      setGoals(g);
      if (hit.size) {
        setPunch(new Set(hit));
        sfx.click();
        later(() => setPunch(new Set()), 400);
      }
      const done = new Set(g.flatMap((v, k) => (v === 0 && (prev[k] ?? 0) > 0 ? [k] : [])));
      if (done.size) {
        setDoneFlash(done);
        sfx.line();
        later(() => setDoneFlash(new Set()), 1200);
      }
    }, flyMs);
    goalsRef.current = g;
    const gain = cleared.size * 30 * c + creates.length * 100;
    scoreRef.current += gain;
    setScore(scoreRef.current);
    // effects
    const fxs: Omit<Fx, "id">[] = [];
    cleared.forEach((i) => {
      const t = b[i];
      if (!t?.s) return;
      const [r, col] = rc(i);
      const x = (col + 0.5) * 12.5,
        y = (r + 0.5) * 12.5;
      if (t.s === "row") fxs.push({ kind: "row", x, y });
      else if (t.s === "col") fxs.push({ kind: "col", x, y });
      else if (t.s === "bomb")
        fxs.push({ kind: "wave", x, y }, { kind: "ring", x, y }, { kind: "flash", x, y });
      else {
        fxs.push({ kind: "ring", x, y }, { kind: "flash", x, y });
        const others = [...cleared].filter((j) => j !== i);
        const step = Math.max(1, Math.ceil(others.length / (lowFx ? 6 : 12)));
        others
          .filter((_, k) => k % step === 0)
          .forEach((j, n) => {
            const [jr, jc] = rc(j);
            fxs.push({
              kind: "pull",
              x: (jc + 0.5) * 12.5,
              y: (jr + 0.5) * 12.5,
              tx: x,
              ty: y,
              lvl: n,
            });
          });
      }
    });
    if (c >= 2 && !hasBomb && !hasLine)
      fxs.push({ kind: "flash", x: 50, y: 50, lvl: Math.min(c, 4) });
    const cells = [...cleared].map(rc);
    if (cells.length) {
      const cx = cells.reduce((s, [, cc]) => s + cc, 0) / cells.length,
        cy = cells.reduce((s, [r]) => s + r, 0) / cells.length;
      fxs.push({
        kind: "score",
        x: (cx + 0.5) * 12.5,
        y: (cy + 0.5) * 12.5,
        text: `+${gain}`,
        lvl: Math.min(c, 4) + (cleared.size >= 5 ? 1 : 0),
      });
    }
    addFx(fxs);
    if (hasBomb) {
      sfx.boom();
      setShake(true);
      later(() => setShake(false), 400);
    } else if (hasLine) sfx.line();
    sfx.pop(c);
    burst([...cleared], hasBomb || hasLine, c);
    setPopping(
      new Set(
        [...cleared].flatMap((i) => {
          const tile = b[i];
          return tile ? [tile.id] : [];
        }),
      ),
    );
    await sleep(300);
    cleared.forEach((i) => (b[i] = null));
    creates.forEach((cr) => (b[cr.at] = newTile(cr.t, cr.s)));
    setPopping(new Set());
    const gr = gravity(b);
    setDrops(gr.drops);
    commit(gr.board);
    const maxDrop = Math.max(0, ...gr.drops.values());
    await sleep(Math.round((0.2 + Math.sqrt(maxDrop) * 0.09 + SIZE * 0.012) * 1000) + 60);
  };

  const cascade = async (prefer: number[]) => {
    let c = 0;
    for (;;) {
      if (!mounted.current) return;
      const groups = findGroups(boardRef.current, prefer);
      if (!groups.length) break;
      c++;
      setCombo(c);
      if (c >= 3) {
        setShake(true);
        later(() => setShake(false), 400);
      }
      const creates = groups.flatMap((g) => (g.create ? [g.create] : []));
      const keep = new Set(creates.map((x) => x.at));
      const cleared = expand(
        boardRef.current,
        groups.flatMap((g) => g.cells),
        new Set(),
      );
      creates.forEach((cr) => cleared.delete(cr.at));
      void keep;
      await clearCells(cleared, creates, c);
      prefer = [];
    }
    later(() => setCombo(0), 600);
  };

  const finishTurn = async () => {
    if (!mounted.current) return;
    if (goalsComplete(level, goalsRef.current, scoreRef.current)) {
      // Bonus cascade uses remaining moves after goals are completed.
      await sleep(400);
      let left = movesRef.current,
        n = 0;
      while (left > 0 && mounted.current) {
        left--;
        movesRef.current = left;
        setMoves(left);
        scoreRef.current += 150;
        setScore(scoreRef.current);
        if (n < 10) {
          const idx = boardRef.current.flatMap((t, i) => (t ? [i] : []));
          const pick = idx[Math.floor(Math.random() * idx.length)];
          if (pick !== undefined) {
            const cl = expand(boardRef.current, [pick], new Set());
            await clearCells(cl, [], 1);
            await cascade([]);
          }
        } else {
          sfx.click();
          await sleep(60);
        }
        n++;
      }
      setFrenzy(false);
      await sleep(250);
      if (!mounted.current) return;
      onWin(levelN, scoreRef.current, Math.max(1, starsFor(scoreRef.current, level)));
      sfx.win();
      setState("win");
      return;
    }
    if (movesRef.current <= 0) {
      sfx.lose();
      setState("lose");
      return;
    }
    if (!hasMoves(boardRef.current)) {
      await sleep(300);
      const b = makeBoard();
      setDrops(new Map(b.flatMap((t, i) => (t ? [[t.id, rc(i)[0] + 2] as [number, number]] : []))));
      commit(b);
    }
    busy.current = false;
  };

  const trySwap = async (a: number, bIdx: number) => {
    if (busy.current || state !== "play") return;
    const [ar, ac] = rc(a),
      [br, bc] = rc(bIdx);
    if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) return;
    busy.current = true;
    setSel(null);
    sfx.swipe();
    const b = [...boardRef.current];
    const first = b[a],
      second = b[bIdx];
    if (!first || !second) {
      busy.current = false;
      return;
    }
    b[a] = second;
    b[bIdx] = first;
    setDrops(new Map());
    commit(b);
    await sleep(220);
    if (!mounted.current) return;
    const ta = second,
      tb = first;
    if (ta.s === "color" || tb.s === "color") {
      movesRef.current--;
      setMoves(movesRef.current);
      const colorIdx = ta.s === "color" ? a : bIdx,
        other = colorIdx === a ? tb : ta;
      const cells = new Set<number>([colorIdx]);
      b.forEach((t, i) => {
        if (t && (other.s === "color" || (t.t === other.t && t.s !== "color"))) cells.add(i);
      });
      const cl = expand(
        b,
        [...cells].filter((i) => i !== colorIdx),
      );
      cl.add(colorIdx);
      setShake(true);
      later(() => setShake(false), 400);
      await clearCells(cl, [], 2);
      await cascade([]);
      return finishTurn();
    }
    if (!findGroups(b).length) {
      sfx.bad();
      const back = [...b];
      back[a] = first;
      back[bIdx] = second;
      commit(back);
      await sleep(220);
      setBad(new Set([first.id, second.id]));
      later(() => setBad(new Set()), 420);
      busy.current = false;
      return;
    }
    movesRef.current--;
    setMoves(movesRef.current);
    await cascade([bIdx, a]);
    finishTurn();
  };

  // input
  const drag = useRef<{ i: number; x: number; y: number } | null>(null);
  const onDown = (i: number, e: React.PointerEvent) => {
    drag.current = { i, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    const [r, c] = rc(d.i);
    let tr = r,
      tc = c;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;
    drag.current = null;
    if (tr < 0 || tc < 0 || tr >= SIZE || tc >= SIZE) return;
    trySwap(d.i, tr * SIZE + tc);
  };
  const onUp = (i: number) => {
    if (!drag.current) return;
    drag.current = null;
    if (busy.current) return;
    sfx.click();
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else {
      const [ar, ac] = rc(sel),
        [br, bc] = rc(i);
      if (Math.abs(ar - br) + Math.abs(ac - bc) === 1) trySwap(sel, i);
      else setSel(i);
    }
  };
  // Stable handlers so memoized tiles don't re-render on every HUD/score update
  const handlers = useRef({ onDown, onUp });
  handlers.current = { onDown, onUp };
  const stableDown = useCallback(
    (i: number, e: React.PointerEvent) => handlers.current.onDown(i, e),
    [],
  );
  const stableUp = useCallback((i: number) => handlers.current.onUp(i), []);

  const stars = starsFor(score, level);
  const pct = Math.min(100, (score / level.stars[2]) * 100);

  const shareText = `Я прошёл уровень ${levelN} в «Барсик. Большая игра» на ${Math.max(1, starsFor(score, level))}★ и набрал ${score} очков! Сможешь лучше?`;
  const doShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Барсик. Большая игра", text: shareText, url });
        return;
      } catch {
        // Игрок отменил системное окно «Поделиться» — это не ошибка
      }
    }
    setShare(true);
  };

  return (
    <div className="game-screen relative min-h-[100dvh] w-full overflow-hidden select-none touch-none">
      <img src={BG} alt="" className="game-background absolute inset-0 h-full w-full object-cover" />
      <div className="game-background-shade absolute inset-0 bg-gradient-to-b from-background/10 via-background/0 to-background/40" />

      <div className="game-layout relative mx-auto flex min-h-[100dvh] w-full max-w-[1180px] flex-col items-center gap-3 px-3 py-3">
        <div className="flex w-full items-center justify-between gap-2">
          <Button onClick={onMap} variant="secondary" size="sm" className="rounded-full">
            <ArrowLeft />
            На карту
          </Button>
          <span className="truncate text-xs font-bold text-primary-foreground">
            {LOCATIONS[levelN - 1]}
          </span>
        </div>
        {/* HUD */}
        <div className="game-hud w-full rounded-3xl border-2 border-gold bg-card/90 p-3 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg leading-tight text-emerald sm:text-xl">
                Барсик. Большая игра
              </h1>
              <div className="text-xs font-semibold text-muted-foreground">Уровень {levelN}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-2xl bg-emerald px-3 py-1 text-center text-primary-foreground">
                <div className="text-[10px] uppercase opacity-80">Ходы</div>
                <div className="font-display text-xl leading-none">{moves}</div>
              </div>
              <Button
                onClick={toggleMute}
                aria-label={mute ? "Включить звук" : "Выключить звук"}
                title={mute ? "Включить звук" : "Выключить звук"}
                aria-pressed={mute}
                className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground"
              >
                {mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {level.goals.map((g, k) => (
              <div
                key={k}
                ref={(el) => {
                  goalEls.current[k] = el;
                }}
                className={`relative flex items-center gap-1 rounded-2xl px-2 py-1 ${doneFlash.has(k) ? "animate-goal-done" : ""} ${goals[k] === 0 ? "bg-emerald/20" : "bg-secondary"} ${punch.has(k) ? "animate-hud-punch" : ""}`}
              >
                <img src={TILE_IMG[g.t]} alt={TILE_NAME[g.t]} className="h-8 w-8 object-contain" />
                <span
                  key={goals[k]}
                  className="animate-goal-tick font-display text-lg tabular-nums text-foreground"
                >
                  {goals[k] === 0 ? "✓" : goals[k]}
                </span>
                {doneFlash.has(k) &&
                  Array.from({ length: 10 }).map((_, n) => (
                    <span
                      key={n}
                      className="fx-confetti"
                      style={
                        {
                          ["--a"]: `${n * 36}deg`,
                          ["--c"]: n % 2 ? "var(--gold)" : "var(--emerald)",
                        } as CSSProperties
                      }
                    />
                  ))}
              </div>
            ))}
            {level.scoreGoal && (
              <div className="flex items-center gap-1 rounded-2xl bg-secondary px-2 py-1">
                <Trophy className="h-5 w-5 text-gold" />
                <span className="font-display text-sm">
                  {Math.max(0, level.scoreGoal - score) || "✓"}
                </span>
              </div>
            )}
            <div className="ml-auto text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Счёт</div>
              <ScoreCounter value={score} />
            </div>
          </div>
          <div className="relative mt-2 h-3 rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-emerald transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
            {level.stars.map((s, k) => (
              <Star
                key={k}
                size={16}
                className={`absolute -top-[3px] -translate-x-1/2 ${score >= s ? "fill-gold text-gold" : "fill-muted text-muted-foreground"}`}
                style={{ left: `${(s / level.stars[2]) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Board */}
        <div
          className={`game-board relative aspect-square w-full max-w-[min(100%,calc(100dvh-270px))] rounded-3xl border-4 border-gold bg-card/95 p-1.5 shadow-[var(--shadow-card)] ${shake ? "animate-shake" : ""} ${bad.size ? "animate-board-bad" : ""}`}
        >
          <div
            ref={boardEl}
            className="relative h-full w-full"
            onPointerMove={onMove}
            onPointerLeave={() => (drag.current = null)}
          >
            {GRID}
            {board.map(
              (t, i) =>
                t && (
                  <TileView
                    key={t.id}
                    t={t}
                    i={i}
                    drop={drops.get(t.id)}
                    pop={popping.has(t.id)}
                    selected={sel === i}
                    bad={bad.has(t.id)}
                    onDown={stableDown}
                    onUp={stableUp}
                  />
                ),
            )}
            {fx.map((f) =>
              f.kind === "row" ? (
                <div
                  key={f.id}
                  className="fx-beam-row"
                  style={{ top: `${f.y - 6.25}%`, ["--ox"]: `${f.x}%` } as CSSProperties}
                />
              ) : f.kind === "col" ? (
                <div
                  key={f.id}
                  className="fx-beam-col"
                  style={{ left: `${f.x - 6.25}%`, ["--oy"]: `${f.y}%` } as CSSProperties}
                />
              ) : f.kind === "ring" ? (
                <div key={f.id} className="fx-ring" style={{ left: `${f.x}%`, top: `${f.y}%` }} />
              ) : f.kind === "flash" ? (
                <div
                  key={f.id}
                  className="fx-flash"
                  style={{ ["--int"]: f.lvl ? 0.25 + f.lvl * 0.12 : 0.85 } as CSSProperties}
                />
              ) : f.kind === "wave" ? (
                <div key={f.id} className="fx-wave" style={{ left: `${f.x}%`, top: `${f.y}%` }} />
              ) : f.kind === "pull" ? (
                <div
                  key={f.id}
                  className="fx-pull"
                  style={
                    {
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      ["--px"]: `${((f.tx ?? 0) - f.x) * 8}%`,
                      ["--py"]: `${((f.ty ?? 0) - f.y) * 8}%`,
                      ["--pd"]: `${(f.lvl ?? 0) * 15}ms`,
                    } as CSSProperties
                  }
                />
              ) : (
                <div
                  key={f.id}
                  className="fx-score"
                  style={
                    {
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      ["--s"]: 0.85 + (f.lvl ?? 1) * 0.15,
                    } as CSSProperties
                  }
                >
                  {f.text}
                </div>
              ),
            )}
            {typeof document !== "undefined" &&
              createPortal(
                <>
                  {flyers.map((f) => (
                    <img
                      key={f.id}
                      src={f.src}
                      alt=""
                      className="fx-fly"
                      style={
                        {
                          left: f.x0,
                          top: f.y0,
                          ["--tx"]: `${f.x1 - f.x0}px`,
                          ["--ty"]: `${f.y1 - f.y0}px`,
                          animationDelay: `${f.d}ms`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </>,
                document.body,
              )}
            {particles.map((p) => (
              <span
                key={p.id}
                className="fx-spark"
                style={
                  {
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    ["--c"]: p.hue,
                    ["--sz"]: `${p.sz}px`,
                    ["--dx"]: `${p.dx}px`,
                    ["--dy"]: `${p.dy}px`,
                  } as CSSProperties
                }
              />
            ))}
            {combo > 1 && (
              <div
                key={combo}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <div
                  className={`animate-combo font-display text-gold [text-shadow:0_3px_0_var(--emerald)] ${combo >= 4 ? "text-6xl" : combo >= 3 ? "text-5xl" : "text-4xl"}`}
                >
                  {combo >= 4 ? "Невероятно!" : combo >= 3 ? "Супер!" : "Комбо"} ×{combo}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {state !== "play" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={state === "win" ? "Победа" : "Ходы закончились"}
            className="relative w-full max-w-sm animate-modal rounded-3xl border-4 border-gold bg-card p-5 text-center shadow-[var(--shadow-card)]"
          >
            {state === "win" ? (
              <>
                <div className="pointer-events-none absolute left-1/2 top-10 -z-0 h-64 w-64 -translate-x-1/2 animate-rays rounded-full win-rays" />
                <img
                  src={BARSIK}
                  alt="Барсик с кубком"
                  className="relative mx-auto -mt-24 h-52 animate-barsik object-contain drop-shadow-xl"
                />
                <h2 className="font-display text-3xl text-emerald">Победа!</h2>
                <div className="my-3 flex justify-center gap-2">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="relative" style={{ marginTop: k === 1 ? -10 : 0 }}>
                      <Star size={k === 1 ? 52 : 44} className="fill-muted text-muted-foreground" />
                      {k < starsIn && (
                        <>
                          <Star
                            size={k === 1 ? 52 : 44}
                            className="animate-star-slam absolute inset-0 fill-gold text-gold"
                          />
                          <span className="animate-star-wave absolute inset-0 rounded-full border-4 border-gold" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">Очки</div>
                <div className="font-display text-4xl tabular-nums text-foreground">{shown}</div>
                <div className="mt-4 grid gap-3">
                  {levelN < LEVEL_COUNT ? (
                    <button
                      type="button"
                      onClick={() => {
                        sfx.click();
                        onNext(levelN + 1);
                      }}
                      className="animate-cta game-btn game-btn-emerald py-3 text-xl"
                    >
                      Следующий уровень
                    </button>
                  ) : (
                    <p className="font-display text-emerald">Казань пройдена!</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onMap}
                      className="game-btn game-btn-soft flex items-center justify-center gap-1.5 py-2.5 text-base"
                    >
                      <ArrowLeft size={18} />
                      Карта
                    </button>
                    <button
                      type="button"
                      onClick={doShare}
                      className="game-btn game-btn-gold flex items-center justify-center gap-1.5 py-2.5 text-base"
                    >
                      <Share2 size={18} />
                      Поделиться
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <img src={BARSIK} alt="Барсик" className="mx-auto -mt-16 h-32 object-contain" />
                <h2 className="font-display text-3xl text-destructive">Ходы закончились</h2>
                <p className="mt-2 text-muted-foreground">
                  Барсик верит в тебя — попробуй ещё раз!
                </p>
                {level.goals.some((_, k) => (goals[k] ?? 0) > 0) && (
                  <div className="mt-3">
                    <div className="mb-1 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      Осталось собрать
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {level.goals.map(
                        (g, k) =>
                          (goals[k] ?? 0) > 0 && (
                            <div key={k} className="game-socket">
                              <img
                                src={TILE_IMG[g.t]}
                                alt={TILE_NAME[g.t]}
                                className="h-8 w-8 object-contain"
                              />
                              <span className="font-display text-lg">{goals[k] ?? 0}</span>
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => start(levelN)}
                    className="game-btn game-btn-emerald flex w-full items-center justify-center gap-2 py-3 text-xl"
                  >
                    <RotateCcw size={18} />
                    Ещё раз
                  </button>
                  <button
                    type="button"
                    onClick={onMap}
                    className="game-btn game-btn-soft flex items-center justify-center gap-1.5 py-2.5 text-base"
                  >
                    <ArrowLeft size={18} />
                    Карта
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {share && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/60 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-gold bg-card shadow-[var(--shadow-card)]">
            <Button
              onClick={() => setShare(false)}
              aria-label="Закрыть"
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-card/80"
            >
              <X size={16} />
            </Button>
            <div className="relative h-56">
              <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <img src={BARSIK} alt="" className="absolute bottom-0 right-2 h-52 object-contain" />
              <div className="absolute left-3 top-3 rounded-2xl bg-card/90 p-3">
                <div className="font-display text-emerald">Барсик. Большая игра</div>
                <div className="text-xs text-muted-foreground">Уровень {levelN}</div>
                <div className="flex">
                  {[0, 1, 2].map((k) => (
                    <Star
                      key={k}
                      size={20}
                      className={
                        k < Math.max(1, stars) ? "fill-gold text-gold" : "text-muted-foreground"
                      }
                    />
                  ))}
                </div>
                <div className="font-display text-2xl">{score}</div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-foreground">{shareText}</p>
              <Button
                onClick={async () => {
                  await navigator.clipboard?.writeText(`${shareText} ${window.location.href}`);
                  sfx.click();
                  setShare(false);
                }}
                className="h-auto mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald py-3 font-display text-primary-foreground"
              >
                <Copy size={16} />
                Скопировать текст и ссылку
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
