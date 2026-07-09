/* Panel "Selecciones": los que siguen con vida, con su camino recorrido,
 * y los que se despidieron, ordenados por qué tan lejos llegaron. */

import { aliveTeams, STAGE_ES, winnerOf, type KoMatch, type Stage } from "../lib/ko";
import { nameEs } from "../data/teams";
import { Flag } from "./Flag";

const STAGE_SHORT: Record<Stage, string> = {
  R32: "32avos",
  R16: "8vos",
  QF: "4tos",
  SF: "Semi",
  TP: "3.º",
  F: "Final",
};
const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "TP", "F"];

interface TeamPath {
  team: string;
  alive: boolean;
  played: KoMatch[];
  next: KoMatch | null;
  lastStage: Stage;
}

function teamPaths(matches: KoMatch[]): TeamPath[] {
  const alive = aliveTeams(matches);
  const teams = new Set<string>();
  for (const m of matches) {
    if (m.home) teams.add(m.home);
    if (m.away) teams.add(m.away);
  }
  return [...teams].map((team) => {
    const mine = matches.filter((m) => m.home === team || m.away === team);
    const played = mine.filter((m) => m.finished);
    const next = mine.find((m) => !m.finished) ?? null;
    const last = mine[mine.length - 1];
    return {
      team,
      alive: alive.has(team),
      played,
      next,
      lastStage: last?.stage ?? "R32",
    };
  });
}

function ownScore(m: KoMatch, team: string): string {
  const mine = m.home === team;
  const a = mine ? m.homeScore : m.awayScore;
  const b = mine ? m.awayScore : m.homeScore;
  const pens =
    m.homePens != null && m.awayPens != null
      ? ` (${mine ? m.homePens : m.awayPens}-${mine ? m.awayPens : m.homePens}p)`
      : "";
  return `${a}:${b}${pens}`;
}

function rivalOf(m: KoMatch, team: string): string | null {
  return m.home === team ? m.away : m.home;
}

export function SeleccionesPanel({ matches }: { matches: KoMatch[] | null }) {
  if (!matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <span className="font-mono text-xs text-muted">Cargando selecciones…</span>
      </div>
    );
  }

  const paths = teamPaths(matches);
  const vivos = paths
    .filter((p) => p.alive)
    .sort((a, b) => nameEs(a.team).localeCompare(nameEs(b.team), "es"));
  const idos = paths
    .filter((p) => !p.alive)
    .sort(
      (a, b) =>
        STAGE_ORDER.indexOf(b.lastStage) - STAGE_ORDER.indexOf(a.lastStage) ||
        nameEs(a.team).localeCompare(nameEs(b.team), "es"),
    );

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
        Selecciones
      </p>
      <h1
        className="mt-1 text-[34px] leading-[1.02] text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        SIGUEN
        <br />
        CON <span className="text-gold">VIDA</span>
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {vivos.map((p) => (
          <div
            key={p.team}
            className="flex flex-col gap-2 rounded-2xl border border-gold/35 p-3.5"
            style={{
              background:
                "radial-gradient(120% 90% at 50% -20%, rgba(231,184,75,0.1), transparent 60%), rgba(18,26,46,0.75)",
            }}
          >
            <Flag team={p.team} size={34} />
            <span
              className="text-[15px] uppercase leading-tight tracking-wide text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {nameEs(p.team)}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gold">
              {p.next ? `En ${STAGE_ES[p.next.stage].toLowerCase()}` : "En carrera"}
            </span>
            <span className="font-mono text-[9.5px] leading-relaxed text-muted">
              {p.played
                .map((m) => `${STAGE_SHORT[m.stage]} ${ownScore(m, p.team)}`)
                .join(" · ") || "Debuta en esta ronda"}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-2.5 mt-7 flex items-baseline justify-between px-0.5">
        <h2
          className="text-base uppercase tracking-wide text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Se despidieron
        </h2>
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
          {idos.length} EQUIPOS
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-panel/40 px-3.5 py-1">
        {idos.map((p) => {
          const last = p.played[p.played.length - 1];
          const rival = last ? rivalOf(last, p.team) : null;
          const winner = last ? winnerOf(last) : null;
          return (
            <div
              key={p.team}
              className="flex items-center gap-2.5 border-b border-line/60 py-2.5 text-[12.5px] font-medium text-muted last:border-b-0"
            >
              <Flag team={p.team} size={20} dim />
              <span className="min-w-0 flex-1 truncate">{nameEs(p.team)}</span>
              {rival && winner !== p.team && (
                <span className="hidden truncate font-mono text-[9.5px] text-muted/80 min-[400px]:inline">
                  ante {nameEs(rival)}
                </span>
              )}
              <span className="flex-none font-mono text-[9.5px] uppercase tracking-[0.1em]">
                {STAGE_SHORT[p.lastStage]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
