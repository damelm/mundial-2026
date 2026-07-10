/* Banner de auspiciantes: una tarjeta rotativa (uno a la vez) al pie de cada
 * pestaña. Curado a mano desde data/sponsors.ts. Todo el bloque es el enlace
 * (rel="sponsored noopener"). Rota con crossfade suave; se pausa fuera de
 * pantalla y con la app en segundo plano (batería); respeta reduced-motion y
 * el modo low-gpu (solo hace fade de opacidad, sin capas costosas). */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SPONSORS, AD_ROTATE_MS, type Sponsor } from "../data/sponsors";
import { ArrowUpRightIcon, InstagramIcon, StoreIcon } from "./icons";

export function SponsorSlot() {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const n = SPONSORS.length;

  useEffect(() => {
    if (n < 2) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let onScreen = true;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (onScreen && !document.hidden)
        timer = setInterval(() => setI((v) => (v + 1) % n), AD_ROTATE_MS);
    };

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | undefined;
    const el = ref.current;
    if (typeof IntersectionObserver !== "undefined" && el) {
      io = new IntersectionObserver(
        (entries) => {
          onScreen = entries[0]?.isIntersecting ?? true;
          start();
        },
        { threshold: 0 },
      );
      io.observe(el);
    } else {
      start();
    }

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [n]);

  if (!n) return null;
  const s = SPONSORS[i];

  return (
    <section ref={ref} className="mt-8" aria-label="Publicidad">
      <a
        href={s.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`Publicidad: ${s.name} — ${s.tagline}`}
        className="glass-soft relative flex min-h-[84px] items-center gap-3.5 overflow-hidden rounded-2xl p-3 transition-transform active:scale-[0.99]"
        style={{ boxShadow: `inset 0 0 0 1px ${hexA(s.accent, 0.22)}` }}
      >
        <span className="pointer-events-none absolute right-3 top-2 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-muted/70">
          Publicidad
        </span>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="flex flex-1 items-center gap-3.5"
          >
            <span
              className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-xl"
              style={{ background: s.tileBg }}
            >
              <img
                src={s.logo}
                alt={s.alt}
                loading="lazy"
                className="max-h-11 max-w-[52px] object-contain"
              />
            </span>

            <span className="min-w-0 flex-1 pr-6">
              <span
                className="block truncate text-[15px] leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.01em" }}
              >
                {s.name}
              </span>
              <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted">
                {s.tagline}
              </span>
            </span>

            <span
              className="flex flex-none items-center gap-1.5"
              style={{ color: s.accent }}
            >
              <DestIcon dest={s.dest} />
              <ArrowUpRightIcon size={16} className="opacity-70" />
            </span>
          </motion.span>
        </AnimatePresence>
      </a>

      {n > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
          {SPONSORS.map((_, k) => (
            <span
              key={k}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: k === i ? 16 : 6,
                background: k === i ? s.accent : "var(--color-line)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DestIcon({ dest }: { dest: Sponsor["dest"] }) {
  return dest === "ig" ? <InstagramIcon size={18} /> : <StoreIcon size={18} />;
}

/* #rrggbb + alpha → rgba(). Para el borde de acento tenue del auspiciante. */
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
