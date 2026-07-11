/* Banner de auspiciantes: barra fija y compacta, encima de las pestañas, para
 * que se vea sin scrollear. Curado a mano desde data/sponsors.ts. El bloque de
 * la marca es el enlace (rel="sponsored noopener"); a la derecha, una X para
 * descartarla (se recuerda durante la sesión). Rota uno a la vez con crossfade;
 * se pausa con la app en segundo plano (batería); respeta reduced-motion y el
 * modo low-gpu (solo hace fade de opacidad). */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SPONSORS, AD_ROTATE_MS, type Sponsor } from "../data/sponsors";
import { ArrowUpRightIcon, CloseIcon, InstagramIcon, StoreIcon } from "./icons";

/* Índice que rota entre auspiciantes; pausa cuando la pestaña está oculta. */
function useRotatingSponsor(): number {
  const [i, setI] = useState(0);
  const n = SPONSORS.length;
  useEffect(() => {
    if (n < 2) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (!document.hidden)
        timer = setInterval(() => setI((v) => (v + 1) % n), AD_ROTATE_MS);
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [n]);
  return i;
}

export function SponsorBar({ onClose }: { onClose: () => void }) {
  const i = useRotatingSponsor();
  if (!SPONSORS.length) return null;
  const s = SPONSORS[i];

  return (
    <div className="mx-4 mb-2">
      <div
        className="glass relative flex h-14 items-center gap-2.5 overflow-hidden rounded-2xl pl-2 pr-1"
        style={{ boxShadow: `inset 0 0 0 1px ${hexA(s.accent, 0.22)}` }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.a
            key={i}
            href={s.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={`Publicidad: ${s.name} — ${s.tagline}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span
              className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-lg"
              style={{ background: s.tileBg }}
            >
              <img
                src={s.logo}
                alt={s.alt}
                loading="lazy"
                className="max-h-7 max-w-[34px] object-contain"
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[7px] font-semibold uppercase leading-none tracking-[0.2em] text-muted/70">
                Publicidad
              </span>
              <span
                className="mt-0.5 block truncate text-[13px] leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.01em" }}
              >
                {s.name}
              </span>
              <span className="block truncate text-[10.5px] leading-tight text-muted">
                {s.tagline}
              </span>
            </span>

            <span className="flex-none" style={{ color: s.accent }}>
              <DestIcon dest={s.dest} />
            </span>
            <ArrowUpRightIcon
              size={14}
              className="flex-none opacity-60"
              style={{ color: s.accent }}
            />
          </motion.a>
        </AnimatePresence>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar publicidad"
          className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted transition-colors hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function DestIcon({ dest }: { dest: Sponsor["dest"] }) {
  return dest === "ig" ? <InstagramIcon size={17} /> : <StoreIcon size={17} />;
}

/* #rrggbb + alpha → rgba(). Para el borde de acento tenue del auspiciante. */
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
