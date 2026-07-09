import { lazy, Suspense, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useKo } from "./lib/useKo";
import { STAGE_ES, currentStage, type KoMatch } from "./lib/ko";
import { AhoraPanel } from "./components/Ahora";
import { BracketIcon, RadioIcon, ShieldIcon, TrophyIcon } from "./components/icons";

import { CuadroPanel } from "./components/CuadroPanel";

const SeleccionesPanel = lazy(() =>
  import("./components/Selecciones").then((m) => ({
    default: m.SeleccionesPanel,
  })),
);

function PanelFallback() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <span className="font-mono text-xs text-muted">Cargando…</span>
    </div>
  );
}

type TabId = "ahora" | "cuadro" | "selecciones";

const TABS: { id: TabId; label: string; Icon: typeof RadioIcon }[] = [
  { id: "ahora", label: "Ahora", Icon: RadioIcon },
  { id: "cuadro", label: "Cuadro", Icon: BracketIcon },
  { id: "selecciones", label: "Selecciones", Icon: ShieldIcon },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const ORDER: TabId[] = ["ahora", "cuadro", "selecciones"];

export default function App({ initialData = null }: { initialData?: KoMatch[] | null }) {
  const [tab, setTab] = useState<TabId>("cuadro");
  // Dirección del cambio (1 = hacia la derecha, -1 = izquierda) para que la
  // transición acompañe el sentido del swipe / del tap.
  const [dir, setDir] = useState(0);
  const ko = useKo(initialData);

  const goTo = (next: TabId) => {
    setDir(ORDER.indexOf(next) > ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  };
  const step = (delta: number) => {
    const i = ORDER.indexOf(tab) + delta;
    if (i >= 0 && i < ORDER.length) goTo(ORDER[i]);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col">
        <Header matches={ko.matches} />

        {/* El gesto vive en <main>, que SIEMPRE ocupa toda la pantalla, así el
            swipe se reconoce en cualquier parte (aunque el contenido sea corto).
            drag="x" hace que Framer ponga touch-action:pan-y: el navegador enruta
            vertical → scroll nativo y horizontal → cambio de pestaña, sin pelearse.
            La animación de deslizado queda en la sección interior. */}
        <motion.main
          className="flex-1 overflow-y-auto px-4 pb-28 pt-1"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            // dragDirectionLock ya garantiza que esto solo corre en gestos
            // horizontales, así que los umbrales pueden ser generosos: basta un
            // deslizamiento corto (40px) o un flick suave (velocidad 250).
            const { offset, velocity } = info;
            if (offset.x < -40 || velocity.x < -250) step(1);
            else if (offset.x > 40 || velocity.x > 250) step(-1);
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.section
              key={tab}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 48 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -48 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: EASE }}
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
                <Suspense fallback={<PanelFallback />}>
                  <SeleccionesPanel matches={ko.matches} />
                </Suspense>
              )}
            </motion.section>
          </AnimatePresence>
          <Footer />
        </motion.main>

        <TabBar tab={tab} onChange={goTo} />
      </div>
    </MotionConfig>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-1 pb-2 text-center">
      <a
        href="https://zeeben.pages.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] tracking-[0.14em] text-muted transition-colors hover:text-cyan"
      >
        Hecho por <span className="font-semibold text-ink/80">Zeeben Labs</span>
      </a>
      <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
        Automatización e IA · zeeben.pages.dev
      </span>
    </footer>
  );
}

function Header({ matches }: { matches: KoMatch[] | null }) {
  const stage = matches ? STAGE_ES[currentStage(matches)] : "Mundial 2026";
  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between rounded-b-2xl px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
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

function TabBar({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
      <div className="glass relative flex items-stretch gap-1 rounded-2xl p-1.5">
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
