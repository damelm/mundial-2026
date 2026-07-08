import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useKo } from "./lib/useKo";
import {
  STAGE_ES,
  aliveTeams,
  currentStage,
  fmtDay,
  fmtTime,
  isToday,
  type KoMatch,
} from "./lib/ko";
import { flagUrl, nameEs } from "./data/teams";

type TabId = "ahora" | "cuadro" | "selecciones";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "ahora", label: "Ahora", icon: "lucide:radio" },
  { id: "cuadro", label: "Cuadro", icon: "lucide:git-fork" },
  { id: "selecciones", label: "Selecciones", icon: "lucide:shield-half" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const [tab, setTab] = useState<TabId>("ahora");
  const ko = useKo();

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col">
      <Header matches={ko.matches} />

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-1">
        <AnimatePresence mode="wait">
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {tab === "ahora" ? (
              <AhoraPanel matches={ko.matches} loading={ko.loading} error={ko.error} />
            ) : (
              <Placeholder tab={tab} matches={ko.matches} />
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

function Header({ matches }: { matches: KoMatch[] | null }) {
  const stage = matches ? STAGE_ES[currentStage(matches)] : "Mundial 2026";
  return (
    <header className="flex items-center justify-between px-4 pb-1 pt-[calc(env(safe-area-inset-top)+14px)]">
      <div className="flex items-baseline gap-2">
        <span
          className="text-[26px] leading-none tracking-tight text-gold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          FIX26
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Eliminatorias
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-2.5 py-1 font-mono text-[11px] font-medium text-cyan">
        <Icon icon="lucide:trophy" width={13} />
        {stage}
      </span>
    </header>
  );
}

function Flag({ team, size = 22 }: { team: string | null; size?: number }) {
  const url = team ? flagUrl(team) : null;
  const h = Math.round(size * 0.68);
  if (!url) {
    return (
      <span
        className="inline-block flex-none rounded-[3px] border border-line bg-panel"
        style={{ width: size, height: h }}
      />
    );
  }
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={h}
      loading="lazy"
      className="flex-none rounded-[3px] object-cover shadow-[inset_0_0_0_1px_rgba(234,240,255,0.14)]"
      style={{ width: size, height: h }}
    />
  );
}

function TeamLine({
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
        {team ? nameEs(team) : raw}
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

function MatchRow({ m }: { m: KoMatch }) {
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
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-panel/50 px-3.5 py-3 ${
        m.live ? "border-cyan/50" : "border-line"
      }`}
    >
      <span className="w-12 flex-none">{when}</span>
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
      <span className="flex-none rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
        {STAGE_ES[m.stage].split(" ")[0]}
      </span>
    </div>
  );
}

function SectionTitle({ title, tag }: { title: string; tag?: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-baseline justify-between px-0.5">
      <h2
        className="text-base uppercase tracking-wide text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {tag && (
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted">{tag}</span>
      )}
    </div>
  );
}

function AhoraPanel({
  matches,
  loading,
  error,
}: {
  matches: KoMatch[] | null;
  loading: boolean;
  error: boolean;
}) {
  if (loading && !matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <span className="font-mono text-xs text-muted">Cargando eliminatorias…</span>
      </div>
    );
  }
  if (!matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center px-6 text-center">
        <p className="text-sm text-muted">
          No pudimos traer los datos. Revisá la conexión y volvé a intentar.
        </p>
      </div>
    );
  }

  const live = matches.filter((m) => m.live);
  const today = matches.filter((m) => !m.live && !m.finished && isToday(m));
  const upcoming = matches
    .filter((m) => !m.live && !m.finished && !isToday(m))
    .slice(0, 4);
  const recent = matches.filter((m) => m.finished).slice(-4).reverse();

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
        En vivo
      </p>
      <h1
        className="mt-1 text-[34px] leading-none text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        AHORA
      </h1>

      {error && (
        <p className="mt-3 rounded-xl border border-line bg-panel/50 px-3 py-2 text-xs text-muted">
          Sin conexión con el marcador — mostrando los últimos datos.
        </p>
      )}

      {live.length > 0 && (
        <>
          <SectionTitle title="En juego" tag={STAGE_ES[live[0].stage]} />
          <div className="flex flex-col gap-2">
            {live.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {today.length > 0 && (
        <>
          <SectionTitle title="Hoy" tag={STAGE_ES[today[0].stage]} />
          <div className="flex flex-col gap-2">
            {today.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {live.length === 0 && today.length === 0 && upcoming.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Hoy no hay partidos. El camino sigue el {fmtDay(upcoming[0].timestamp)}.
        </p>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle title="Próximos" tag={STAGE_ES[upcoming[0].stage]} />
          <div className="flex flex-col gap-2">
            {upcoming.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionTitle title="Últimos resultados" />
          <div className="flex flex-col gap-2">
            {recent.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Placeholder({ tab, matches }: { tab: TabId; matches: KoMatch[] | null }) {
  const alive = matches ? aliveTeams(matches).size : null;
  const copy: Record<string, { title: string; sub: string; icon: string; fase: string }> = {
    cuadro: {
      title: "El Camino a la Final",
      sub: alive
        ? `${alive} selecciones siguen con vida. La senda dorada llega en la Fase 2.`
        : "El cuadro completo de eliminatorias, en vivo.",
      icon: "lucide:git-fork",
      fase: "Fase 2",
    },
    selecciones: {
      title: "Selecciones",
      sub: alive
        ? `${alive} equipos siguen en carrera hacia el 19 de julio.`
        : "Los equipos que siguen con vida y su camino.",
      icon: "lucide:shield-half",
      fase: "Fase 5",
    },
  };
  const c = copy[tab];
  return (
    <div className="grid min-h-[60dvh] place-items-center rounded-3xl border border-line bg-panel/40 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl border border-line bg-panel text-gold">
          <Icon icon={c.icon} width={26} />
        </span>
        <h1
          className="text-balance text-2xl leading-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {c.title.toUpperCase()}
        </h1>
        <p className="max-w-[34ch] text-sm text-muted">{c.sub}</p>
        <span className="mt-1 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-cyan">
          {c.fase} · en construcción
        </span>
      </div>
    </div>
  );
}

function TabBar({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
      <div className="flex items-stretch gap-1 rounded-2xl border border-line bg-panel/80 p-1.5 backdrop-blur-xl">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors"
              style={{ color: active ? "var(--color-gold)" : "var(--color-muted)" }}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 -z-10 rounded-xl"
                  style={{ background: "rgba(231,184,75,0.12)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon icon={t.icon} width={20} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
