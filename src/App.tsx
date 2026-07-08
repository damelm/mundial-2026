import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useKo } from "./lib/useKo";
import { STAGE_ES, aliveTeams, currentStage, type KoMatch } from "./lib/ko";
import { Cuadro, CuadroExtras } from "./components/Cuadro";
import { AhoraPanel } from "./components/Ahora";
import { SeleccionesPanel } from "./components/Selecciones";
import { MatchRow, SectionTitle } from "./components/rows";
import { BracketIcon, RadioIcon, ShieldIcon, TrophyIcon } from "./components/icons";

type TabId = "ahora" | "cuadro" | "selecciones";

const TABS: { id: TabId; label: string; Icon: typeof RadioIcon }[] = [
  { id: "ahora", label: "Ahora", Icon: RadioIcon },
  { id: "cuadro", label: "Cuadro", Icon: BracketIcon },
  { id: "selecciones", label: "Selecciones", Icon: ShieldIcon },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const [tab, setTab] = useState<TabId>("ahora");
  const ko = useKo();

  return (
    <MotionConfig reducedMotion="user">
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
                <AhoraPanel
                  matches={ko.matches}
                  loading={ko.loading}
                  error={ko.error}
                />
              ) : tab === "cuadro" ? (
                <CuadroPanel matches={ko.matches} />
              ) : (
                <SeleccionesPanel matches={ko.matches} />
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        <TabBar tab={tab} onChange={setTab} />
      </div>
    </MotionConfig>
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
        <TrophyIcon size={13} />
        {stage}
      </span>
    </header>
  );
}

function CuadroPanel({ matches }: { matches: KoMatch[] | null }) {
  if (!matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <span className="font-mono text-xs text-muted">Armando el cuadro…</span>
      </div>
    );
  }
  const alive = aliveTeams(matches).size;
  const next = matches.find((m) => !m.finished && !m.live);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
        La Firma · Cuadro
      </p>
      <h1
        className="mt-1 text-[34px] leading-[1.02] text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        EL CAMINO
        <br />A <span className="text-gold">LA FINAL</span>
      </h1>
      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-normal text-muted">
        La senda dorada se enciende con cada equipo que avanza.{" "}
        {alive > 0 && `${alive} selecciones siguen con vida.`}
      </p>

      <Cuadro matches={matches} />
      <CuadroExtras matches={matches} />

      {next && (
        <>
          <SectionTitle title="Próximo paso" tag={STAGE_ES[next.stage]} />
          <MatchRow m={next} matches={matches} />
        </>
      )}
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
              <t.Icon size={20} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
