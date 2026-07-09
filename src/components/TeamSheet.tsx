/* Ficha de selección: sheet de vidrio que sube desde abajo al tocar una
 * tarjeta en Selecciones. Camino en el torneo, identidad, próximo partido
 * con pronóstico y titulares del equipo. */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchDetail,
  nextStepText,
  winnerOf,
  type KoMatch,
  type MatchDetail,
  type Stage,
} from "../lib/ko";
import { nameEs, TEAMS } from "../data/teams";
import { LORE } from "../data/lore";
import { headlinesForTeam } from "../lib/ficha";
import type { News } from "../lib/useNews";
import { Flag } from "./Flag";
import { MatchRow, OddsBar } from "./rows";
import { NewspaperIcon, SparklesIcon, TrophyIcon } from "./icons";

const STAGE_SHORT: Record<Stage, string> = {
  R32: "32avos",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinal",
  TP: "3.er puesto",
  F: "La Final",
};

function CaminoLine({ m, team }: { m: KoMatch; team: string }) {
  const rival = m.home === team ? m.away : m.home;
  const mine = m.home === team;
  const won = winnerOf(m) === team;
  const score =
    m.homeScore != null
      ? `${mine ? m.homeScore : m.awayScore}:${mine ? m.awayScore : m.homeScore}`
      : "";
  const pens =
    m.homePens != null && m.awayPens != null
      ? ` (${mine ? m.homePens : m.awayPens}-${mine ? m.awayPens : m.homePens}p)`
      : "";
  return (
    <div className="flex items-center gap-2.5 border-b border-line/50 py-2 text-[12.5px] last:border-b-0">
      <span className="w-[74px] flex-none font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted">
        {STAGE_SHORT[m.stage]}
      </span>
      <Flag team={rival} size={18} />
      <span className="min-w-0 flex-1 truncate font-medium text-ink">
        {rival ? nameEs(rival) : "Por definir"}
      </span>
      {m.finished ? (
        <span
          className={`font-mono text-[12px] font-bold ${won ? "text-gold" : "text-muted"}`}
        >
          {score}
          {pens}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-cyan">
          {m.live ? m.clock || "EN VIVO" : "por jugar"}
        </span>
      )}
    </div>
  );
}

export function TeamSheet({
  team,
  matches,
  news,
  onClose,
}: {
  team: string;
  matches: KoMatch[];
  news: News | null;
  onClose: () => void;
}) {
  const t = TEAMS[team];
  const lore = LORE[team];
  const mine = matches.filter((m) => m.home === team || m.away === team);
  const next = mine.find((m) => !m.finished) ?? null;
  const stakes = next ? nextStepText(next, matches) : null;
  const headlines = news ? headlinesForTeam(team, news.items) : [];
  const [detail, setDetail] = useState<MatchDetail | null>(null);

  useEffect(() => {
    if (next?.home && next.away)
      fetchDetail(next.id).then((d) => d && setDetail(d));
  }, [next?.id, next?.home, next?.away]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={nameEs(team)}
        className="glass absolute inset-x-0 bottom-0 mx-auto max-h-[86dvh] max-w-[560px] overflow-y-auto rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-3"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/25" />

        <div className="flex items-center gap-3.5">
          <Flag team={team} size={46} />
          <div className="min-w-0 flex-1">
            <h2
              className="text-[24px] leading-none text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {nameEs(team).toUpperCase()}
            </h2>
            {lore && (
              <p className="mt-1 truncate text-[12.5px] text-muted">
                {lore.nick}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ficha"
            className="grid size-8 flex-none place-items-center rounded-full border border-line text-muted"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {t && (
            <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan">
              {t.confed}
            </span>
          )}
          {lore?.title && (
            <span className="rounded-full border border-gold/40 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-gold">
              {lore.title}
            </span>
          )}
        </div>

        {mine.length > 0 && (
          <>
            <h3
              className="mt-5 text-[14px] uppercase tracking-wide text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Su camino
            </h3>
            <div className="mt-1.5 rounded-2xl border border-line/60 px-3.5 py-1">
              {mine.map((m) => (
                <CaminoLine key={m.id} m={m} team={team} />
              ))}
            </div>
          </>
        )}

        {next && (next.home || next.away) && (
          <>
            <h3
              className="mt-5 text-[14px] uppercase tracking-wide text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Próximo partido
            </h3>
            <div className="mt-1.5 flex flex-col gap-2.5">
              <MatchRow m={next} />
              {detail?.odds && !next.finished && (
                <div className="rounded-2xl border border-line/60 px-3.5 py-2.5">
                  <OddsBar m={next} odds={detail.odds} />
                </div>
              )}
              {stakes && (
                <p className="flex items-center gap-2 px-1 text-[12px] text-muted">
                  <TrophyIcon size={12} className="flex-none text-gold" />
                  {stakes}.
                </p>
              )}
            </div>
          </>
        )}

        {headlines.length > 0 && (
          <>
            <h3
              className="mt-5 text-[14px] uppercase tracking-wide text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Titulares
            </h3>
            <div className="mt-1.5 flex flex-col rounded-2xl border border-line/60 px-3.5 py-1">
              {headlines.map((h) => (
                <a
                  key={h.u}
                  href={h.u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 border-b border-line/50 py-2.5 text-[12.5px] leading-snug text-ink/90 last:border-b-0 hover:text-cyan"
                >
                  <NewspaperIcon
                    size={13}
                    className="mt-0.5 flex-none text-cyan"
                  />
                  <span>
                    {h.t}
                    <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      {h.src}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </>
        )}

        {lore && lore.facts.length > 0 && (
          <>
            <h3
              className="mt-5 text-[14px] uppercase tracking-wide text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ¿Sabías?
            </h3>
            <div className="mt-1.5 flex flex-col gap-2">
              {lore.facts.map((f, i) => (
                <p
                  key={i}
                  className="flex gap-2 text-[12.5px] leading-relaxed text-ink/85"
                >
                  <SparklesIcon
                    size={13}
                    className="mt-0.5 flex-none text-cyan"
                  />
                  {f}
                </p>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function TeamSheetHost({
  team,
  matches,
  news,
  onClose,
}: {
  team: string | null;
  matches: KoMatch[];
  news: News | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {team && (
        <TeamSheet team={team} matches={matches} news={news} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}
