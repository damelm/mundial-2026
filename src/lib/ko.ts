/* Capa de datos de las eliminatorias: calendario KO completo desde la API
 * pública de ESPN (gratis, sin key, CORS abierto). Trae los 32 partidos de
 * 32avos → final con fechas fijas, marcadores, penales, ganador y estado en
 * vivo. Portado del legacy (app.js) a TypeScript.
 */

import { TEAMS } from "../data/teams";

export type Stage = "R32" | "R16" | "QF" | "SF" | "TP" | "F";

export const STAGE_ES: Record<Stage, string> = {
  R32: "32avos de final",
  R16: "Octavos de final",
  QF: "Cuartos de final",
  SF: "Semifinales",
  TP: "Tercer puesto",
  F: "La Final",
};

export interface KoMatch {
  id: string;
  stage: Stage;
  /** Clave en TEAMS; null = el rival aún no se define. */
  home: string | null;
  away: string | null;
  /** Texto crudo de ESPN (útil para placeholders "Quarterfinal 1 Winner"). */
  homeRaw: string;
  awayRaw: string;
  /** ISO 8601 con zona (hora oficial del partido). */
  timestamp: string;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
  won: "home" | "away" | null;
  live: boolean;
  /** Reloj de juego cuando live (p. ej. "76'"). */
  clock: string | null;
  finished: boolean;
  venue: string | null;
}

const ESPN_SB =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
// 32avos (28 jun) → final (19 jul)
const ESPN_KO_RANGE = "?dates=20260628-20260721";

// Alias nombre-ESPN → clave canónica nuestra.
const ALIAS: Record<string, string> = {
  unitedstates: "usa",
  us: "usa",
  bosniaandherzegovina: "bosniaherzegovina",
  czechia: "czechrepublic",
  turkiye: "turkey",
  caboverde: "capeverde",
  korearepublic: "southkorea",
  cotedivoire: "ivorycoast",
  congodr: "drcongo",
};

function canonName(n: string): string {
  const k = (n || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return ALIAS[k] || k;
}

let _teamMap: Record<string, string> | null = null;
function espnToTeam(name: string): string | null {
  if (!_teamMap) {
    _teamMap = {};
    for (const key of Object.keys(TEAMS)) _teamMap[canonName(key)] = key;
  }
  if (/winner|loser|round of|quarterfinal|semifinal|to be determined|\btbd\b/i.test(name))
    return null;
  return _teamMap[canonName(name)] ?? null;
}

/* Tipos mínimos del payload de ESPN (solo lo que usamos). */
interface EspnCompetitor {
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string;
  shootoutScore?: number | string | null;
  team: { displayName: string };
}
interface EspnEvent {
  id: string;
  date?: string;
  status?: { type?: { state?: string }; displayClock?: string };
  competitions?: {
    competitors: EspnCompetitor[];
    venue?: { fullName?: string };
  }[];
}

const num = (v: unknown): number | null =>
  v != null && v !== "" ? Number(v) : null;

/** Descarga el calendario KO completo. Devuelve null si ESPN no responde. */
export async function fetchKoSchedule(): Promise<KoMatch[] | null> {
  let sb: { events?: EspnEvent[] };
  try {
    const res = await fetch(ESPN_SB + ESPN_KO_RANGE, { cache: "no-store" });
    sb = await res.json();
  } catch {
    return null;
  }
  if (!sb?.events?.length) return null;

  const out: KoMatch[] = [];
  for (const ev of sb.events) {
    const c = ev.competitions?.[0];
    if (!c) continue;
    const H = c.competitors.find((x) => x.homeAway === "home");
    const A = c.competitors.find((x) => x.homeAway === "away");
    if (!H || !A) continue;
    const hn = H.team.displayName;
    const an = A.team.displayName;
    const state = ev.status?.type?.state; // pre | in | post
    out.push({
      id: "ko-" + ev.id,
      stage: "R32", // se reasigna por cronología abajo
      home: espnToTeam(hn),
      away: espnToTeam(an),
      homeRaw: hn,
      awayRaw: an,
      timestamp: ev.date || "",
      homeScore: state === "pre" ? null : num(H.score),
      awayScore: state === "pre" ? null : num(A.score),
      homePens: num(H.shootoutScore),
      awayPens: num(A.shootoutScore),
      won: H.winner === true ? "home" : A.winner === true ? "away" : null,
      live: state === "in",
      clock: state === "in" ? String(ev.status?.displayClock || "") || null : null,
      finished: state === "post",
      venue: c.venue?.fullName ?? null,
    });
  }

  // Ronda por POSICIÓN cronológica (robusto): cuando ambos equipos de un
  // partido se resuelven, el nombre ya no dice la ronda. Los 32 partidos KO
  // van 16 + 8 + 4 + 2 + 2 en orden de fecha.
  out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (out.length === 32) {
    const stageAt = (i: number): Stage =>
      i < 16 ? "R32" : i < 24 ? "R16" : i < 28 ? "QF" : i < 30 ? "SF" : "F";
    out.forEach((m, i) => (m.stage = stageAt(i)));
    // Final vs 3.er puesto (los dos últimos): el más temprano es el 3.º.
    out[30].stage = "TP";
    out[31].stage = "F";
  }
  return out.length ? out : null;
}

/* ===== Derivados ===== */

/** Selecciones que siguen con vida: aparecen en un partido sin terminar, o
 * ganaron el último que jugaron. */
export function aliveTeams(matches: KoMatch[]): Set<string> {
  const alive = new Set<string>();
  const lastOf = new Map<string, KoMatch>();
  for (const m of matches) {
    if (m.home) lastOf.set(m.home, m);
    if (m.away) lastOf.set(m.away, m);
  }
  for (const [team, m] of lastOf) {
    if (!m.finished) alive.add(team);
    else if (m.won === "home" && m.home === team) alive.add(team);
    else if (m.won === "away" && m.away === team) alive.add(team);
  }
  return alive;
}

/** Ronda "actual": la primera con partidos sin terminar. */
export function currentStage(matches: KoMatch[]): Stage {
  for (const m of matches) if (!m.finished) return m.stage;
  return "F";
}

export function isToday(m: KoMatch, now = new Date()): boolean {
  const d = new Date(m.timestamp);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
