/* Escenario de LA FINAL — el momento especial de la fase final.
 *
 * Tres estados, según los datos de ESPN:
 *   1) Cuenta regresiva  → los finalistas (uno puede estar "por definir") y un
 *      reloj en vivo al pitazo inicial, con oro y luz.
 *   2) En juego          → marcador grande y "EN VIVO" mientras se juega.
 *   3) Campeón           → takeover dorado: corona, trofeo y el campeón del
 *      mundo con los colores de su selección.
 *
 * Se enciende solo cuando hay un finalista resuelto o ya hay campeón; en el
 * resto del torneo no aparece. Animaciones sobrias y aptas para low-gpu. */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fmtDay, fmtTime, rawEs, winnerOf, type KoMatch } from "../lib/ko";
import { TEAMS, nameEs } from "../data/teams";
import { Flag } from "./Flag";
import { TrophyIcon } from "./icons";

function colorsOf(key: string | null) {
  const t = key ? TEAMS[key] : null;
  return t ?? { c1: "#e7b84b", c2: "#4fd1e0", c3: "#e7b84b" };
}

type TL = { d: number; h: number; m: number; s: number; past: boolean };
function timeLeft(iso: string): TL {
  const diff = iso ? new Date(iso).getTime() - Date.now() : NaN;
  if (isNaN(diff) || diff <= 0) return { d: 0, h: 0, m: 0, s: 0, past: true };
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    past: false,
  };
}
function useCountdown(iso: string): TL {
  const [t, setT] = useState<TL>(() => timeLeft(iso));
  useEffect(() => {
    const id = setInterval(() => setT(timeLeft(iso)), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return t;
}

export function FinalHero({ matches }: { matches: KoMatch[] }) {
  const final = matches.find((m) => m.stage === "F");
  if (!final) return null;
  const champ = final.finished ? winnerOf(final) : null;
  // Solo en el clímax: hay un finalista resuelto o ya hay campeón.
  if (!champ && !final.home && !final.away) return null;
  return champ ? (
    <ChampionHero final={final} champ={champ} />
  ) : (
    <FinalStage final={final} />
  );
}

/* ---- Cuenta regresiva / en vivo ---- */
function FinalStage({ final }: { final: KoMatch }) {
  const t = useCountdown(final.timestamp);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="final-stage relative mb-6 overflow-hidden rounded-3xl border border-gold/30 p-5 pt-4"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-gold">
            La Gran Final
          </span>
        </div>

        <div className="mt-1 grid place-items-center">
          <TrophyIcon size={38} className="text-gold" />
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Finalist team={final.home} raw={final.homeRaw} />
          <div className="flex flex-col items-center gap-1 px-1">
            <span
              className="text-[22px] leading-none text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              VS
            </span>
          </div>
          <Finalist team={final.away} raw={final.awayRaw} />
        </div>

        {final.live ? (
          <LiveBadge final={final} />
        ) : (
          <Countdown t={t} />
        )}

        <p className="mt-3 text-center font-mono text-[11px] tracking-[0.06em] text-muted">
          {fmtDay(final.timestamp)} · {fmtTime(final.timestamp)}
          {final.venue ? ` · ${final.venue}` : ""}
        </p>
      </div>
    </motion.section>
  );
}

function Finalist({ team, raw }: { team: string | null; raw: string }) {
  if (!team) {
    return (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="grid h-11 w-16 place-items-center rounded-md border border-dashed border-line bg-panel/50 text-muted">
          <TrophyIcon size={16} />
        </span>
        <span className="text-[12px] font-semibold leading-tight text-muted">
          Por definir
        </span>
        <span className="max-w-[11ch] font-mono text-[8.5px] uppercase leading-tight tracking-wide text-muted/70">
          {rawEs(raw)}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="rounded-md p-[2px] shadow-[0_0_16px_rgba(231,184,75,0.35)] ring-1 ring-gold/60">
        <Flag team={team} size={64} />
      </span>
      <span className="text-[13px] font-bold leading-tight text-ink">
        {nameEs(team)}
      </span>
      <span className="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-gold">
        ✦ Finalista
      </span>
    </div>
  );
}

function Countdown({ t }: { t: TL }) {
  if (t.past) {
    return (
      <p className="mt-4 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-cyan">
        ¡Es hoy! Arranca en breve
      </p>
    );
  }
  const units: [number, string][] = [
    [t.d, "días"],
    [t.h, "hs"],
    [t.m, "min"],
    [t.s, "seg"],
  ];
  return (
    <div className="mt-4 flex items-stretch justify-center gap-1.5">
      {units.map(([v, label], i) => (
        <div key={label} className="flex items-stretch gap-1.5">
          <div className="flex min-w-[52px] flex-col items-center rounded-xl border border-line bg-panel/50 px-1.5 py-1.5">
            <span
              className="text-[26px] leading-none text-ink"
              style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
            >
              {String(v).padStart(2, "0")}
            </span>
            <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
              {label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="self-center text-[20px] leading-none text-gold/50">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LiveBadge({ final }: { final: KoMatch }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-live">
        <span className="h-2 w-2 rounded-full bg-live" /> En vivo · {final.clock ?? "—"}
      </span>
      <span
        className="text-[38px] leading-none text-ink"
        style={{ fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
      >
        {final.homeScore ?? 0} <span className="text-muted">–</span> {final.awayScore ?? 0}
      </span>
    </div>
  );
}

/* ---- Campeón del mundo ---- */
function ChampionHero({ final, champ }: { final: KoMatch; champ: string }) {
  const runnerUp = final.won === "home" ? final.away : final.home;
  const col = colorsOf(champ);
  const cs = winnerScore(final);
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="champion-stage relative mb-6 overflow-hidden rounded-3xl border border-gold/45 px-5 py-7 text-center"
      style={{
        background: `radial-gradient(120% 80% at 50% -10%, ${hexA(col.c1, 0.28)}, transparent 60%), radial-gradient(90% 70% at 50% 120%, ${hexA(col.c3 || col.c1, 0.2)}, transparent 55%), #0a0e1a`,
      }}
    >
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-gold">
          Campeón del mundo
        </span>
        <div className="my-2 grid place-items-center">
          <TrophyIcon size={54} className="champion-trophy text-gold" />
        </div>
        <span className="rounded-lg p-[3px] shadow-[0_0_30px_rgba(231,184,75,0.5)] ring-2 ring-gold/70">
          <Flag team={champ} size={92} />
        </span>
        <h2
          className="mt-3 text-[40px] leading-[0.95] text-gold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {nameEs(champ).toUpperCase()}
        </h2>
        <p className="mt-1 font-mono text-[12px] tracking-[0.1em] text-muted">
          {cs} en la final ante {runnerUp ? nameEs(runnerUp) : rawEs(final.homeRaw)}
        </p>
        <div className="mt-4 flex gap-1.5">
          {[col.c1, col.c2, col.c3].map((c, i) => (
            <span key={i} className="h-1.5 w-8 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function winnerScore(m: KoMatch): string {
  const hs = m.homeScore ?? 0;
  const as = m.awayScore ?? 0;
  let base = m.won === "home" ? `${hs}–${as}` : `${as}–${hs}`;
  if (m.homePens != null && m.awayPens != null) {
    const hp = m.homePens,
      ap = m.awayPens;
    base += m.won === "home" ? ` (${hp}–${ap} pen.)` : ` (${ap}–${hp} pen.)`;
  }
  return base;
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
