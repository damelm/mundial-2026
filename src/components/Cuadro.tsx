/* El Camino a la Final — la Firma de Fix26.
 * Pirámide de 5 niveles (32avos → final): la senda dorada se dibuja de abajo
 * hacia arriba siguiendo a los ganadores; el partido en juego marcha en cyan
 * hacia el trofeo. Posiciones en px calculadas del ancho real del contenedor;
 * las líneas viven en un SVG absoluto detrás de los nodos HTML.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildBracket,
  fmtDay,
  fmtTime,
  STAGE_ES,
  type BracketNode,
  type KoMatch,
} from "../lib/ko";
import { nameEs, TEAMS } from "../data/teams";
import { Flag } from "./Flag";
import { TrophyIcon } from "./icons";

const H = 640;
const ROW_Y = { f: 84, sf: 224, qf: 356, r16: 476, r32: 580 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

type EdgeState = "gold" | "live" | "dim";

interface Edge {
  d: string;
  state: EdgeState;
  delay: number;
}

interface NodePos {
  x: number;
  y: number;
}

function xAt(i: number, n: number, w: number): number {
  const pad = 8;
  return pad + (w - pad * 2) * ((i + 0.5) / n);
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function edgeState(feeder: KoMatch | null): EdgeState {
  if (!feeder) return "dim";
  if (feeder.live) return "live";
  if (feeder.finished) return "gold";
  return "dim";
}

/** Ordena los nodos de cada ronda para que los alimentadores queden debajo de
 * su padre (la cronología de ESPN cruza las líneas si no). */
function orderBracket(b: ReturnType<typeof buildBracket>) {
  const byFeeders = <C extends { id: string } | BracketNode>(
    parents: BracketNode[],
    children: C[],
    idOf: (c: C) => string,
  ): C[] => {
    const out: C[] = [];
    const used = new Set<string>();
    for (const p of parents) {
      for (const f of p.feeders) {
        if (!f) continue;
        const c = children.find((x) => idOf(x) === f.id);
        if (c && !used.has(f.id)) {
          out.push(c);
          used.add(f.id);
        }
      }
    }
    for (const c of children) if (!used.has(idOf(c))) out.push(c);
    return out;
  };
  // Semis quedan en orden cronológico; de ahí para abajo, por alimentador.
  const qfOrdered = byFeeders(b.sf, b.qf, (n) => n.match.id);
  const r16Ordered = byFeeders(qfOrdered, b.r16, (n) => n.match.id);
  const r32Ordered = byFeeders(r16Ordered, b.r32, (m) => m.id);
  return { ...b, qf: qfOrdered, r16: r16Ordered, r32: r32Ordered };
}

/** Etiqueta corta para un lado sin resolver ("Quarterfinal 1 Winner" → "GANA C1"). */
function pendingLabel(raw: string): string {
  const m = /(quarterfinal|semifinal|round of (\d+))\s*(\d+)\s+(winner|loser)/i.exec(raw);
  if (!m) return "—";
  const n = m[3];
  const kind = /quarterfinal/i.test(m[1]) ? `C${n}` : /semifinal/i.test(m[1]) ? `S${n}` : `P${n}`;
  return /loser/i.test(m[4]) ? `PIERDE ${kind}` : `GANA ${kind}`;
}

function code3(team: string | null, raw: string): string {
  if (!team) return pendingLabel(raw);
  const t = TEAMS[team];
  const base = (t?.en ?? team).replace(/[^A-Za-z]/g, "").toUpperCase();
  const SPECIAL: Record<string, string> = {
    Argentina: "ARG", Spain: "ESP", Germany: "GER", Netherlands: "NED",
    Switzerland: "SUI", Croatia: "CRO", Uruguay: "URU", Japan: "JPN",
    Morocco: "MAR", Norway: "NOR", England: "ENG", Belgium: "BEL",
    Portugal: "POR", France: "FRA", Brazil: "BRA", Mexico: "MEX",
    USA: "USA", Colombia: "COL", Egypt: "EGY", Sweden: "SWE",
    "Ivory Coast": "CIV", "South Africa": "RSA", "DR Congo": "COD",
    Canada: "CAN", Paraguay: "PAR", "Cape Verde": "CPV", Ecuador: "ECU",
    Australia: "AUS", "Bosnia-Herzegovina": "BIH", Austria: "AUT",
    Senegal: "SEN", Algeria: "ALG", Ghana: "GHA", Tunisia: "TUN",
    "South Korea": "KOR", Iran: "IRN", "Saudi Arabia": "KSA", Qatar: "QAT",
    Uzbekistan: "UZB", Jordan: "JOR", Iraq: "IRQ", "Czech Republic": "CZE",
    Scotland: "SCO", Turkey: "TUR", "New Zealand": "NZL", Haiti: "HAI",
    Panama: "PAN", "Curaçao": "CUW",
  };
  return SPECIAL[team] ?? base.slice(0, 3);
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${new Intl.DateTimeFormat("es", { month: "short" }).format(d).replace(".", "")} · ${fmtTime(iso)}`;
}

function scoreText(m: KoMatch): string {
  if (m.homeScore == null || m.awayScore == null) return "";
  const pens =
    m.homePens != null && m.awayPens != null
      ? ` (${m.homePens}-${m.awayPens})`
      : "";
  return `${m.homeScore}:${m.awayScore}${pens}`;
}

export function Cuadro({ matches }: { matches: KoMatch[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const b = orderBracket(buildBracket(matches));
  const ready = w > 0 && b.r32.length === 16;

  // Posiciones por ronda.
  const pos = {
    r32: b.r32.map((_, i) => ({ x: xAt(i, 16, w), y: ROW_Y.r32 })) as NodePos[],
    r16: b.r16.map((_, i) => ({ x: xAt(i, 8, w), y: ROW_Y.r16 })) as NodePos[],
    qf: b.qf.map((_, i) => ({ x: xAt(i, 4, w), y: ROW_Y.qf })) as NodePos[],
    sf: b.sf.map((_, i) => ({ x: xAt(i, 2, w), y: ROW_Y.sf })) as NodePos[],
    f: { x: w / 2, y: ROW_Y.f } as NodePos,
  };

  // Aristas: de cada partido alimentador a su partido padre.
  const edges: Edge[] = [];
  if (ready) {
    const links = [
      { parents: b.r16, ppos: pos.r16, pBottom: 16, clist: b.r32, cpos: pos.r32, cTop: 22, delay: 0.2 },
      { parents: b.qf, ppos: pos.qf, pBottom: 24, clist: b.r16.map((n) => n.match), cpos: pos.r16, cTop: 18, delay: 0.9 },
      { parents: b.sf, ppos: pos.sf, pBottom: 30, clist: b.qf.map((n) => n.match), cpos: pos.qf, cTop: 28, delay: 1.5 },
    ];
    for (const L of links) {
      L.parents.forEach((n: BracketNode, pi: number) => {
        n.feeders.forEach((f) => {
          if (!f) return;
          const ci = L.clist.findIndex((m) => m.id === f.id);
          if (ci < 0) return;
          edges.push({
            d: edgePath(L.cpos[ci].x, L.cpos[ci].y - L.cTop, L.ppos[pi].x, L.ppos[pi].y + L.pBottom),
            state: edgeState(f),
            delay: L.delay + ci * 0.05,
          });
        });
      });
    }
    // Semis → la final
    b.sf.forEach((n, i) => {
      edges.push({
        d: edgePath(pos.sf[i].x, pos.sf[i].y - 34, pos.f.x, pos.f.y + 56),
        state: edgeState(n.match.finished || n.match.live ? n.match : null),
        delay: 2.0,
      });
    });
  }

  if (!ready) {
    return (
      <div
        ref={wrap}
        className="relative mt-5 grid place-items-center overflow-hidden rounded-3xl border border-line bg-panel/40"
        style={{ height: H }}
      >
        <span className="font-mono text-xs text-muted">Armando el cuadro…</span>
      </div>
    );
  }

  const anim = !reduced;

  return (
    <div
      ref={wrap}
      className="relative mt-5 overflow-hidden rounded-3xl border border-line"
      style={{
        height: H,
        background:
          "radial-gradient(90% 55% at 50% 0%, rgba(231,184,75,0.07), transparent 65%), linear-gradient(180deg, rgba(18,26,46,0.55), rgba(15,23,41,0.35))",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${w} ${H}`}
        aria-hidden="true"
      >
        {edges.map((e, i) =>
          e.state === "gold" ? (
            <motion.path
              key={i}
              d={e.d}
              className="edge-gold"
              stroke="var(--color-gold)"
              strokeWidth={1.8}
              fill="none"
              initial={anim ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ delay: e.delay, duration: 0.9, ease: EASE }}
            />
          ) : e.state === "live" ? (
            <path
              key={i}
              d={e.d}
              className="edge-live"
              stroke="var(--color-cyan)"
              strokeWidth={1.8}
              strokeDasharray="6 7"
              fill="none"
            />
          ) : (
            <path
              key={i}
              d={e.d}
              stroke="var(--color-line)"
              strokeWidth={1.4}
              fill="none"
            />
          ),
        )}
      </svg>

      {/* 32avos: pares de mini-banderas + marcador */}
      {b.r32.map((m, i) => (
        <Node key={m.id} x={pos.r32[i].x} y={pos.r32[i].y} delay={0.1 + i * 0.03} anim={anim}>
          <div className="flex flex-col items-center gap-[3px]">
            <Flag team={m.home} size={15} dim={m.finished && m.won !== "home"} />
            <Flag team={m.away} size={15} dim={m.finished && m.won !== "away"} />
            <span className="whitespace-nowrap font-mono text-[8px] leading-none text-muted">
              {m.homeScore != null
                ? `${m.homeScore}:${m.awayScore}${m.homePens != null ? "*" : ""}`
                : ""}
            </span>
          </div>
        </Node>
      ))}

      {/* Octavos */}
      {b.r16.map((n, i) => (
        <Node key={n.match.id} x={pos.r16[i].x} y={pos.r16[i].y} delay={0.8 + i * 0.05} anim={anim}>
          <div className="flex flex-col items-center gap-[3px]">
            <div className="flex items-center gap-1">
              <Flag team={n.match.home} size={16} dim={n.match.finished && n.match.won !== "home"} />
              <Flag team={n.match.away} size={16} dim={n.match.finished && n.match.won !== "away"} />
            </div>
            <span className="whitespace-nowrap font-mono text-[9px] leading-none text-muted">
              {n.match.homeScore != null
                ? `${n.match.homeScore}:${n.match.awayScore}${n.match.homePens != null ? "*" : ""}`
                : ""}
            </span>
          </div>
        </Node>
      ))}

      {/* Cuartos */}
      {b.qf.map((n, i) => {
        const m = n.match;
        return (
          <Node key={m.id} x={pos.qf[i].x} y={pos.qf[i].y} delay={1.4 + i * 0.07} anim={anim}>
            <div
              className={`flex w-[82px] flex-col gap-1 rounded-xl border px-2 py-1.5 ${
                m.live ? "border-cyan/60" : "border-line"
              } bg-panel/95`}
            >
              <QfRow team={m.home} raw={m.homeRaw} score={m.homeScore} win={m.won === "home"} lose={m.finished && m.won !== "home"} />
              <QfRow team={m.away} raw={m.awayRaw} score={m.awayScore} win={m.won === "away"} lose={m.finished && m.won !== "away"} />
              <span className="text-center font-mono text-[8px] uppercase tracking-[0.1em] text-muted">
                {m.live ? (
                  <span className="font-bold text-live">{m.clock || "VIVO"}</span>
                ) : m.finished ? (
                  scoreText(m)
                ) : (
                  shortWhen(m.timestamp)
                )}
              </span>
            </div>
          </Node>
        );
      })}

      {/* Semis */}
      {b.sf.map((n, i) => {
        const m = n.match;
        return (
          <Node key={m.id} x={pos.sf[i].x} y={pos.sf[i].y} delay={1.9 + i * 0.1} anim={anim}>
            <div
              className={`flex w-[132px] flex-col gap-1.5 rounded-2xl border px-2.5 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.45)] ${
                m.live ? "border-cyan/60" : "border-line"
              } bg-panel/95`}
            >
              <SfRow team={m.home} raw={m.homeRaw} score={m.homeScore} />
              <SfRow team={m.away} raw={m.awayRaw} score={m.awayScore} />
              <span className="border-t border-line pt-1 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {m.live ? (
                  <span className="font-bold text-live">{m.clock || "EN VIVO"}</span>
                ) : m.finished ? (
                  "FINAL"
                ) : (
                  shortWhen(m.timestamp)
                )}
              </span>
            </div>
          </Node>
        );
      })}

      {/* La final */}
      <Node x={pos.f.x} y={pos.f.y} delay={2.3} anim={anim}>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="cup-halo grid size-14 place-items-center rounded-full border border-gold/50 text-gold"
            style={{ background: "radial-gradient(circle at 50% 32%, rgba(231,184,75,0.22), rgba(18,26,46,0.9) 70%)" }}
          >
            <TrophyIcon size={26} />
          </span>
          <span
            className="text-[15px] tracking-[0.14em] text-gold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LA FINAL
          </span>
          <span className="font-mono text-[9px] tracking-[0.16em] text-muted">
            {b.f
              ? `${fmtDay(b.f.match.timestamp).toUpperCase()} · ${b.f.match.venue?.split(" ")[0] === "MetLife" ? "NUEVA YORK" : fmtTime(b.f.match.timestamp)}`
              : "19 JUL · NUEVA YORK"}
          </span>
          {b.f && b.f.match.home && b.f.match.away && (
            <span className="flex items-center gap-1.5">
              <Flag team={b.f.match.home} size={18} />
              <span className="font-mono text-[10px] text-ink">
                {code3(b.f.match.home, "")} – {code3(b.f.match.away, "")}
              </span>
              <Flag team={b.f.match.away} size={18} />
            </span>
          )}
        </div>
      </Node>
    </div>
  );
}

function Node({
  x,
  y,
  delay,
  anim,
  children,
}: {
  x: number;
  y: number;
  delay: number;
  anim: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
      initial={anim ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function QfRow({
  team,
  raw,
  score,
  win,
  lose,
}: {
  team: string | null;
  raw: string;
  score: number | null;
  win: boolean;
  lose: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px]">
      <Flag team={team} size={14} dim={lose} />
      <span className={win ? "font-bold text-gold" : "text-muted"}>
        {code3(team, raw)}
      </span>
      <span className={`ml-auto ${win ? "font-bold text-gold" : "text-muted"}`}>
        {score ?? ""}
      </span>
    </span>
  );
}

function SfRow({
  team,
  raw,
  score,
}: {
  team: string | null;
  raw: string;
  score: number | null;
}) {
  return (
    <span className="flex items-center gap-2 font-mono text-[11px]">
      <Flag team={team} size={16} />
      <span className={team ? "text-ink" : "text-muted"}>{code3(team, raw)}</span>
      <span className="ml-auto font-bold text-gold">{score ?? ""}</span>
    </span>
  );
}

/** Sección de contexto bajo el cuadro: leyenda + 3.er puesto. */
export function CuadroExtras({ matches }: { matches: KoMatch[] }) {
  const tp = matches.find((m) => m.stage === "TP");
  return (
    <>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[2px] w-4 rounded bg-gold shadow-[0_0_6px_rgba(231,184,75,0.6)]" />
          camino recorrido
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[2px] w-4 rounded bg-cyan shadow-[0_0_6px_rgba(79,209,224,0.6)]" />
          en juego
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[2px] w-4 rounded bg-line" />
          por definirse
        </span>
      </div>
      {tp && (
        <p className="mt-4 text-center font-mono text-[10px] tracking-[0.08em] text-muted">
          {STAGE_ES.TP}: {tp.home ? nameEs(tp.home) : "por definir"} –{" "}
          {tp.away ? nameEs(tp.away) : "por definir"} · {fmtDay(tp.timestamp)}
        </p>
      )}
    </>
  );
}
