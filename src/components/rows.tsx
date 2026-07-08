/* Filas de partido reutilizables: versión compacta y expandible con
 * goleadores (bajo demanda) y "qué se juega". */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchGoals,
  fmtDay,
  fmtTime,
  isToday,
  nextStepText,
  rawEs,
  STAGE_ES,
  type GoalEvent,
  type KoMatch,
} from "../lib/ko";
import { nameEs } from "../data/teams";
import { Flag } from "./Flag";
import { BallIcon, ChevronDownIcon, SparklesIcon, TrophyIcon } from "./icons";

export function SectionTitle({ title, tag }: { title: string; tag?: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-baseline justify-between px-0.5">
      <h2
        className="text-base uppercase tracking-wide text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {tag && (
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
          {tag}
        </span>
      )}
    </div>
  );
}

export function TeamLine({
  team,
  raw,
  score,
  pens,
  winner,
}: {
  team: string | null;
  raw: string;
  score: number | null;
  pens: number | null;
  winner: boolean;
}) {
  return (
    <span className="flex items-center gap-2 text-[13px] font-semibold">
      <Flag team={team} />
      <span className={team ? "" : "font-medium text-muted"}>
        {team ? nameEs(team) : rawEs(raw)}
      </span>
      <span
        className={`ml-auto font-mono text-xs ${winner ? "font-bold text-gold" : "text-muted"}`}
      >
        {score != null ? score : ""}
        {pens != null ? ` (${pens})` : ""}
      </span>
    </span>
  );
}

function GoalsList({ goals, m }: { goals: GoalEvent[]; m: KoMatch }) {
  if (!goals.length)
    return (
      <p className="font-mono text-[10px] text-muted">Sin goles todavía.</p>
    );
  const side = (s: "home" | "away") => goals.filter((g) => g.side === s);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {(["home", "away"] as const).map((s) => (
        <div key={s} className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            {s === "home" ? nameEs(m.home) : nameEs(m.away)}
          </span>
          {side(s).map((g, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 text-[11.5px] text-ink"
            >
              <BallIcon size={11} className="flex-none text-gold" />
              {g.name}
              <span className="font-mono text-[10px] text-muted">
                {g.minute}'
              </span>
            </span>
          ))}
          {side(s).length === 0 && (
            <span className="font-mono text-[10px] text-muted">—</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function MatchRow({
  m,
  matches,
  ai,
}: {
  m: KoMatch;
  /** Con la lista completa la fila se puede expandir (goles + qué se juega). */
  matches?: KoMatch[];
  /** Previa/resumen generado por IA para este partido, si existe. */
  ai?: { kind: "previa" | "resumen"; es: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState<GoalEvent[] | null>(null);
  const canExpand = !!matches && (m.live || m.finished || !!m.venue);
  const showGoals = m.live || m.finished;

  useEffect(() => {
    if (open && showGoals && !goals) {
      fetchGoals(m.id).then((g) => setGoals(g ?? []));
    }
  }, [open, showGoals, goals, m.id]);

  const when = m.live ? (
    <span className="font-mono text-[11px] font-bold text-live">
      {m.clock || "VIVO"}
    </span>
  ) : m.finished ? (
    <span className="font-mono text-[11px] text-muted">FIN</span>
  ) : (
    <span className="font-mono text-[11px] leading-tight text-cyan">
      {isToday(m) ? (
        fmtTime(m.timestamp)
      ) : (
        <>
          {fmtDay(m.timestamp)}
          <br />
          {fmtTime(m.timestamp)}
        </>
      )}
    </span>
  );

  const stakes = matches && !m.finished ? nextStepText(m, matches) : null;

  const inner = (
    <>
      <span className="w-12 flex-none text-left">{when}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <TeamLine
          team={m.home}
          raw={m.homeRaw}
          score={m.homeScore}
          pens={m.homePens}
          winner={m.won === "home"}
        />
        <TeamLine
          team={m.away}
          raw={m.awayRaw}
          score={m.awayScore}
          pens={m.awayPens}
          winner={m.won === "away"}
        />
      </div>
      <span className="flex flex-none flex-col items-end gap-1">
        <span className="rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {STAGE_ES[m.stage].split(" ")[0]}
        </span>
        {canExpand && (
          <ChevronDownIcon
            size={13}
            className="text-muted transition-transform"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        )}
      </span>
    </>
  );

  const frame = `rounded-2xl border bg-panel/50 ${m.live ? "border-cyan/50" : "border-line"}`;

  if (!canExpand) {
    return <div className={`flex items-center gap-3 px-3.5 py-3 ${frame}`}>{inner}</div>;
  }

  return (
    <div className={frame}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
      >
        {inner}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 border-t border-line px-3.5 py-3">
              {showGoals &&
                (goals === null ? (
                  <span className="font-mono text-[10px] text-muted">
                    Buscando goles…
                  </span>
                ) : (
                  <GoalsList goals={goals} m={m} />
                ))}
              {ai && (
                <p className="flex gap-1.5 text-[12px] leading-relaxed text-ink/85">
                  <SparklesIcon size={12} className="mt-0.5 flex-none text-cyan" />
                  <span>
                    {ai.es}
                    <span className="ml-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted">
                      {ai.kind} · IA
                    </span>
                  </span>
                </p>
              )}
              {stakes && (
                <p className="flex items-center gap-1.5 text-[12px] text-muted">
                  <TrophyIcon size={12} className="flex-none text-gold" />
                  {stakes}.
                </p>
              )}
              {m.venue && (
                <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
                  {m.venue}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
