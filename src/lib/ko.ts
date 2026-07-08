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

// Base sobreescribible en build (VITE_ESPN_BASE) para auditorías locales.
const ESPN_BASE =
  import.meta.env.VITE_ESPN_BASE ??
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const ESPN_SB = `${ESPN_BASE}/scoreboard`;
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

/* ===== Goleadores (summary por partido, bajo demanda) ===== */

const ESPN_SUM = `${ESPN_BASE}/summary?event=`;

export interface GoalEvent {
  name: string;
  minute: string;
  side: "home" | "away";
}

interface EspnKeyEvent {
  scoringPlay?: boolean;
  shortText?: string;
  clock?: { displayValue?: string };
  team?: { id?: number | string };
  participants?: { athlete?: { displayName?: string }; displayName?: string }[];
}

const _goalsCache = new Map<string, GoalEvent[]>();

export async function fetchGoals(matchId: string): Promise<GoalEvent[] | null> {
  const hit = _goalsCache.get(matchId);
  if (hit) return hit;
  const evId = matchId.replace(/^ko-/, "");
  try {
    const sum = await fetch(ESPN_SUM + evId, { cache: "no-store" }).then((r) =>
      r.json(),
    );
    const comps = sum?.header?.competitions?.[0]?.competitors as
      | { homeAway?: string; team?: { id?: number | string } }[]
      | undefined;
    const homeId = String(
      comps?.find((c) => c.homeAway === "home")?.team?.id ?? "",
    );
    const out: GoalEvent[] = [];
    for (const g of (sum?.keyEvents ?? []) as EspnKeyEvent[]) {
      if (!g?.scoringPlay) continue;
      let name = "";
      const a = g.participants?.[0];
      if (a) name = a.athlete?.displayName || a.displayName || "";
      if (!name)
        name = (g.shortText || "").replace(/\s+(Goal|Penalty).*$/i, "").trim();
      const minute = String(g.clock?.displayValue || "").replace(/'/g, "");
      const side: "home" | "away" =
        g.team && String(g.team.id) === homeId ? "home" : "away";
      if (name) out.push({ name, minute, side });
    }
    _goalsCache.set(matchId, out);
    return out;
  } catch {
    return null;
  }
}

/* ===== Árbol del cuadro ===== */

export function winnerOf(m: KoMatch): string | null {
  if (!m.finished || !m.won) return null;
  return m.won === "home" ? m.home : m.away;
}

export function loserOf(m: KoMatch): string | null {
  if (!m.finished || !m.won) return null;
  return m.won === "home" ? m.away : m.home;
}

export interface BracketNode {
  match: KoMatch;
  /** Partidos de la ronda anterior que alimentan cada lado [home, away]. */
  feeders: (KoMatch | null)[];
}

export interface Bracket {
  r32: KoMatch[];
  r16: BracketNode[];
  qf: BracketNode[];
  sf: BracketNode[];
  tp: BracketNode | null;
  f: BracketNode | null;
}

/** Encuentra el partido de `prev` que alimenta un lado: por equipo si ya se
 * resolvió, o parseando el placeholder de ESPN ("Quarterfinal 3 Winner"). */
function feederFor(
  team: string | null,
  raw: string,
  prev: KoMatch[],
  kind: "winner" | "loser",
): KoMatch | null {
  if (team) {
    const pick = kind === "winner" ? winnerOf : loserOf;
    return prev.find((p) => pick(p) === team) ?? null;
  }
  const m = /(\d+)\s+(winner|loser)/i.exec(raw);
  if (!m) return null;
  const idx = Number(m[1]) - 1;
  return prev[idx] ?? null;
}

export function buildBracket(matches: KoMatch[]): Bracket {
  const of = (s: Stage) => matches.filter((m) => m.stage === s);
  const r32 = of("R32");
  const link = (m: KoMatch, prev: KoMatch[], kind: "winner" | "loser" = "winner"): BracketNode => ({
    match: m,
    feeders: [
      feederFor(m.home, m.homeRaw, prev, kind),
      feederFor(m.away, m.awayRaw, prev, kind),
    ],
  });
  const r16m = of("R16");
  const qfm = of("QF");
  const sfm = of("SF");
  const tpm = of("TP")[0] ?? null;
  const fm = of("F")[0] ?? null;
  return {
    r32,
    r16: r16m.map((m) => link(m, r32)),
    qf: qfm.map((m) => link(m, r16m)),
    sf: sfm.map((m) => link(m, qfm)),
    tp: tpm ? link(tpm, sfm, "loser") : null,
    f: fm ? link(fm, sfm) : null,
  };
}

/** "Qué se juega": el rival (o partido de origen del rival) en la próxima
 * ronda para el ganador de `m`. */
export function nextStepText(m: KoMatch, matches: KoMatch[]): string | null {
  if (m.stage === "F" || m.stage === "TP") return null;
  const order: Stage[] = ["R32", "R16", "QF", "SF", "F"];
  const next = order[order.indexOf(m.stage) + 1];
  const b = buildBracket(matches);
  const pool: BracketNode[] =
    next === "R16" ? b.r16 : next === "QF" ? b.qf : next === "SF" ? b.sf : b.f ? [b.f] : [];
  const parent = pool.find((n) =>
    n.feeders.some((f) => f?.id === m.id),
  );
  if (!parent) return null;
  const side = parent.feeders[0]?.id === m.id ? 1 : 0;
  const rivalTeam = side === 1 ? parent.match.home : parent.match.away;
  const rivalFeeder = parent.feeders[side];
  const where = STAGE_ES[parent.match.stage].toLowerCase();
  if (rivalTeam) return `El ganador enfrenta a ${nameEsLocal(rivalTeam)} en ${where}`;
  if (rivalFeeder && rivalFeeder.home && rivalFeeder.away)
    return `El ganador cruza con ${nameEsLocal(rivalFeeder.home)}–${nameEsLocal(rivalFeeder.away)} en ${where}`;
  return `El ganador avanza a ${where}`;
}

function nameEsLocal(key: string): string {
  return TEAMS[key]?.es ?? key;
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

/** Traduce placeholders de ESPN ("Quarterfinal 1 Winner" → "Ganador cuartos 1"). */
export function rawEs(raw: string): string {
  const m = /(quarterfinal|semifinal|round of (\d+))\s*(\d+)\s+(winner|loser)/i.exec(raw);
  if (!m) return raw;
  const ronda = /quarterfinal/i.test(m[1])
    ? "cuartos"
    : /semifinal/i.test(m[1])
      ? "semi"
      : m[2] === "32"
        ? "32avos"
        : "octavos";
  return `${/loser/i.test(m[4]) ? "Perdedor" : "Ganador"} ${ronda} ${m[3]}`;
}

export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
