import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BARSIK } from "./assets";
import { sfx } from "@/lib/sfx";

export default function PortalFinale({ stars, onClose }: { stars: number; onClose: () => void }) {
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    sfx.portal();
    const t = setTimeout(() => setShowText(true), 3600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/80 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-title"
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-4 border-gold bg-card p-6 text-center shadow-2xl"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full"
        >
          <X />
        </Button>
        <div className="portal-stage" aria-hidden="true">
          <div className="portal-ring" />
          <div className="portal-core" />
          {Array.from({ length: 14 }, (_, k) => (
            <span
              key={k}
              className="portal-spark"
              style={{
                ["--a" as string]: `${k * 26}deg`,
                animationDelay: `${1 + (k % 7) * 0.25}s`,
              }}
            />
          ))}
          <img src={BARSIK} alt="" className="portal-barsik" />
        </div>
        {showText ? (
          <div className="portal-text mt-5">
            <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-emerald">
              Глава 1 пройдена!
            </p>
            <h2 id="portal-title" className="font-display text-3xl text-foreground">
              Портал в прошлое
            </h2>
            <p className="mt-3 text-muted-foreground">
              Барсик прошёл современную Казань и шагнул в портал у стен Кремля.
            </p>
            <p className="mt-2 font-display text-lg text-emerald">
              Продолжение следует: Казань, XVI век
            </p>
            <div className="my-4 flex items-center justify-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold">
              <Star className="h-5 w-5 fill-gold text-gold" /> {stars} из 45 звёзд собрано
            </div>
            <Button className="h-12 w-full rounded-xl font-display text-lg" onClick={onClose}>
              Вернуться на карту
            </Button>
          </div>
        ) : (
          <p id="portal-title" className="mt-6 font-display text-xl text-emerald">
            Над Кремлём открывается портал…
          </p>
        )}
      </section>
    </div>
  );
}
