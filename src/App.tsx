import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";

type TabId = "ahora" | "cuadro" | "selecciones";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "ahora", label: "Ahora", icon: "lucide:radio" },
  { id: "cuadro", label: "Cuadro", icon: "lucide:git-fork" },
  { id: "selecciones", label: "Selecciones", icon: "lucide:shield-half" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const [tab, setTab] = useState<TabId>("cuadro");

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-1">
        <AnimatePresence mode="wait">
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <Panel tab={tab} />
          </motion.section>
        </AnimatePresence>
      </main>

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

function Header() {
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-2.5 py-1 text-[11px] font-semibold text-cyan">
        <Icon icon="lucide:trophy" width={13} />
        Mundial 2026
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

function Panel({ tab }: { tab: TabId }) {
  const copy: Record<TabId, { title: string; sub: string; icon: string }> = {
    ahora: {
      title: "Ahora",
      sub: "Partidos en vivo, de hoy y próximos con horarios.",
      icon: "lucide:radio",
    },
    cuadro: {
      title: "El Camino a la Final",
      sub: "El cuadro completo de eliminatorias, en vivo.",
      icon: "lucide:git-fork",
    },
    selecciones: {
      title: "Selecciones",
      sub: "Los equipos que siguen con vida y su camino.",
      icon: "lucide:shield-half",
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
          Fase 0 · shell listo
        </span>
      </div>
    </div>
  );
}
