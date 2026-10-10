import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  LockKeyhole,
  Star,
  Volume2,
  VolumeX,
  X,
  Footprints,
  Trophy,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getLevel } from "@/lib/match3";
import { LEVEL_COUNT, LEVEL_POINTS, LOCATIONS, totalStars, type Progress } from "@/lib/saga";
import mapImage from "@/assets/kazan-map-15.webp";
import { MAP_BARSIK, TILE_IMG, TILE_NAME } from "./assets";
import { LOCATION_IMG } from "./locationImages";
import { sfx } from "@/lib/sfx";

export function EarnedStars({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div aria-label={`${count} из 3 звёзд`} className={`flex justify-center gap-1 ${className}`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`h-5 w-5 ${n <= count ? "fill-gold text-gold" : "fill-muted text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

type Props = {
  progress: Progress;
  mute: boolean;
  toggleMute: () => void;
  onPlay: (n: number) => void;
  storageError: boolean;
  justUnlocked?: number | null;
  onUnlockShown?: () => void;
  autoOpen?: number | null;
  onAutoOpened?: () => void;
};
export default function SagaMap({
  progress,
  mute,
  toggleMute,
  onPlay,
  storageError,
  justUnlocked = null,
  onUnlockShown,
  autoOpen = null,
  onAutoOpened,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const focusCurrent = (smooth = true) => {
    const container = scroller.current,
      node = current.current;
    if (!container || !node) return;
    container.scrollTo({
      top:
        container.scrollTop +
        node.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        container.clientHeight * 0.58,
      behavior:
        smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "instant",
    });
  };
  useEffect(() => {
    focusCurrent(false);
  }, [imageReady, progress.unlocked]);
  const [anim, setAnim] = useState<number | null>(null);
  useEffect(() => {
    if (!imageReady) return;
    if (!justUnlocked || justUnlocked < 2) {
      if (autoOpen) {
        setSelected(autoOpen);
        onAutoOpened?.();
      }
      return;
    }
    setAnim(justUnlocked);
    const t1 = setTimeout(() => sfx.unlock(), 1250);
    const t2 = setTimeout(() => {
      setAnim(null);
      onUnlockShown?.();
      if (autoOpen) {
        setSelected(autoOpen);
        onAutoOpened?.();
      }
    }, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- эффект должен проиграться один раз на justUnlocked; колбэки родителя не должны его перезапускать
  }, [imageReady, justUnlocked]);
  const from = anim ? LEVEL_POINTS[anim - 2] : undefined,
    to = anim ? LEVEL_POINTS[anim - 1] : undefined;
  const level = selected === null ? null : getLevel(selected);
  const result = selected === null ? undefined : progress.results[selected];

  return (
    <main className="saga-shell">
      <div className="saga-viewport">
        <header className="saga-header">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald text-primary-foreground">
              <Footprints size={22} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-sm leading-tight text-emerald sm:text-lg">
                Барсик. Большая игра
              </h1>
              <p className="text-xs font-bold text-muted-foreground">Путешествие по Казани</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gold/25 pt-2">
            <div className="flex items-center gap-2 font-display text-lg text-foreground">
              <Star className="h-6 w-6 fill-gold text-gold" />
              <span>
                {totalStars(progress)}{" "}
                <span className="text-sm text-muted-foreground">/ {LEVEL_COUNT * 3}</span>
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={toggleMute}
                title={mute ? "Включить звук" : "Выключить звук"}
                aria-label={mute ? "Включить звук" : "Выключить звук"}
                aria-pressed={mute}
              >
                {mute ? <VolumeX /> : <Volume2 />}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full text-emerald"
                onClick={() => focusCurrent()}
                title="К открытому уровню"
              >
                <Crosshair /> Уровень {progress.unlocked}
              </Button>
            </div>
          </div>
        </header>
        <div ref={scroller} className="saga-scroll" aria-label="Карта уровней Казани">
          <div className="saga-art">
            <img
              src={mapImage}
              onLoad={() => setImageReady(true)}
              alt="Яркая объёмная карта Казани с Барсиком: 15 локаций от Ак Барс Банка до Кремля"
              width={1145}
              height={1374}
              draggable={false}
              className="block h-auto w-full select-none"
            />
            {anim && LEVEL_POINTS[anim - 2] && LEVEL_POINTS[anim - 1] && (
              <svg
                className="saga-trail"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  x1={LEVEL_POINTS[anim - 2]!.x}
                  y1={LEVEL_POINTS[anim - 2]!.y}
                  x2={LEVEL_POINTS[anim - 1]!.x}
                  y2={LEVEL_POINTS[anim - 1]!.y}
                  pathLength={1}
                />
              </svg>
            )}
            {from && to && (
              <span
                className="saga-runner"
                aria-hidden="true"
                style={{
                  ["--x1" as string]: `${from.x}%`,
                  ["--y1" as string]: `${from.y}%`,
                  ["--x2" as string]: `${to.x}%`,
                  ["--y2" as string]: `${to.y}%`,
                }}
              >
                <img src={MAP_BARSIK} alt="" />
              </span>
            )}
            {anim && LEVEL_POINTS[anim - 1] && (
              <span
                className="saga-burst"
                aria-hidden="true"
                style={{
                  left: `${LEVEL_POINTS[anim - 1]!.x}%`,
                  top: `${LEVEL_POINTS[anim - 1]!.y}%`,
                }}
              >
                {Array.from({ length: 12 }, (_, k) => (
                  <i key={k} style={{ ["--a" as string]: `${k * 30}deg` }} />
                ))}
              </span>
            )}
            {LEVEL_POINTS.map((point, i) => {
              const n = i + 1,
                completed = progress.results[n],
                active = n === progress.unlocked,
                locked = n > progress.unlocked;
              return (
                <Button
                  key={n}
                  ref={active ? current : undefined}
                  disabled={locked}
                  aria-label={`Уровень ${n} — ${LOCATIONS[i]}${locked ? ", заблокирован" : ""}`}
                  aria-current={active ? "step" : undefined}
                  title={`${n}. ${LOCATIONS[i]}`}
                  className={`saga-node ${anim === n ? "saga-node-unlocking " : ""}${locked ? "saga-node-locked" : completed ? "saga-node-complete" : "saga-node-current"}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  onClick={() => {
                    sfx.click();
                    setSelected(n);
                  }}
                >
                  {active && anim !== n && (
                    <span className="saga-avatar">
                      <img src={MAP_BARSIK} alt="Барсик-путешественник" />
                    </span>
                  )}
                  <span>{n}</span>
                  {locked && <LockKeyhole className="saga-lock" />}
                  {completed && (
                    <span className="saga-node-stars">
                      {[1, 2, 3].map((k) => (
                        <Star
                          key={k}
                          className={
                            k <= completed.stars
                              ? "fill-gold text-gold"
                              : "fill-muted text-muted-foreground"
                          }
                        />
                      ))}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
        {storageError && (
          <p
            role="status"
            className="absolute bottom-3 left-3 right-3 rounded-lg bg-card p-3 text-xs text-destructive"
          >
            Браузер не разрешает сохранить прогресс. Разрешите хранение данных для этой игры.
          </p>
        )}
      </div>
      <Dialog
        open={level !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="level-modal game-frame max-w-sm gap-3 p-0 [&>button:last-child]:hidden">
          {level && (
            <>
              <div className="loc-cover">
                <img
                  src={LOCATION_IMG[level.n - 1]}
                  alt={LOCATIONS[level.n - 1]}
                  width={640}
                  height={358}
                />
                <span className="loc-chip">Уровень {level.n}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Закрыть"
                  className="game-btn game-btn-soft absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="-mt-7 px-5 text-center">
                <DialogTitle asChild>
                  <h2 className="game-ribbon text-lg leading-tight">{LOCATIONS[level.n - 1]}</h2>
                </DialogTitle>
                <DialogDescription className="mt-2 font-display text-base text-emerald">
                  {level.moves} ходов
                </DialogDescription>
              </div>
              <EarnedStars count={result?.stars ?? 0} className="[&_svg]:h-8 [&_svg]:w-8" />
              <div className="px-5">
                <h3 className="mb-2 text-center text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Цели уровня
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {level.goals.map((g) => (
                    <div key={g.t} className="game-socket">
                      <img
                        src={TILE_IMG[g.t]}
                        alt={TILE_NAME[g.t]}
                        className="h-10 w-10 object-contain"
                      />
                      <span className="font-display text-xl text-foreground">{g.count}</span>
                    </div>
                  ))}
                  {level.scoreGoal && (
                    <div className="game-socket">
                      <Trophy className="h-8 w-8 text-gold" />
                      <span className="font-display text-lg">
                        {level.scoreGoal} <span className="text-xs font-normal">очков</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mx-5 flex items-center justify-between rounded-xl bg-secondary px-3 py-1.5 text-sm">
                <span className="font-bold text-muted-foreground">Рекорд</span>
                <span className="font-display text-lg">
                  {result ? result.score.toLocaleString("ru-RU") : "—"}
                </span>
              </div>
              <div className="px-5 pb-6 pt-1">
                <button
                  type="button"
                  className="game-btn game-btn-emerald flex h-14 w-full items-center justify-center gap-2 text-2xl"
                  onClick={() => {
                    sfx.click();
                    onPlay(level.n);
                    setSelected(null);
                  }}
                >
                  <Play className="fill-current" />
                  Играть!
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
