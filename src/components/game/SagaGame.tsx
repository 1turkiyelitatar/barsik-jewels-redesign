import { useEffect, useState } from "react";
import {
  completeLevel,
  emptyProgress,
  parseProgress,
  PROGRESS_KEY,
  type Progress,
} from "@/lib/saga";
import { setMuted } from "@/lib/sfx";
import Game from "./Game";
import SagaMap from "./SagaMap";
import PortalFinale from "./PortalFinale";

export default function SagaGame() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [mute, setMute] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState<number | null>(null);
  const [autoOpen, setAutoOpen] = useState<number | null>(null);

  useEffect(() => {
    try {
      setProgress(parseProgress(localStorage.getItem(PROGRESS_KEY)));
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);

  const toggleMute = () => {
    setMuted(!mute);
    setMute(!mute);
  };

  const saveWin = (n: number, score: number, stars: number) => {
    const next = completeLevel(progress, n, score, stars);
    if (next.unlocked > progress.unlocked) setJustUnlocked(next.unlocked);
    setProgress(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (n === 15) {
      setPlaying(null);
      setShowFinale(true);
    }
  };

  if (!ready)
    return (
      <div className="grid min-h-dvh place-items-center bg-secondary font-display text-emerald">
        Барсик. Большая игра
      </div>
    );

  return (
    <>
      {playing !== null ? (
        <Game
          key={playing}
          initialLevel={playing}
          mute={mute}
          toggleMute={toggleMute}
          onMap={() => setPlaying(null)}
          onNext={(n) => {
            if (n <= progress.unlocked) {
              setAutoOpen(n);
              setPlaying(null);
            }
          }}
          onWin={saveWin}
        />
      ) : (
        <SagaMap
          progress={progress}
          mute={mute}
          toggleMute={toggleMute}
          storageError={storageError}
          justUnlocked={justUnlocked}
          onUnlockShown={() => setJustUnlocked(null)}
          autoOpen={autoOpen}
          onAutoOpened={() => setAutoOpen(null)}
          onPlay={(n) => {
            if (n <= progress.unlocked) setPlaying(n);
          }}
        />
      )}

      {showFinale && (
        <PortalFinale
          stars={Object.values(progress.results).reduce((sum, r) => sum + r.stars, 0)}
          onClose={() => setShowFinale(false)}
        />
      )}
    </>
  );
}
