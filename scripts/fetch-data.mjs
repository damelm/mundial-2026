// Genera data/fixture.json del Mundial 2026.
//
// Estrategia robusta (a prueba de degradaciones de la API gratuita):
//  - BASE ESTATICA: data/fixture-base.json trae los 72 partidos de la fase de
//    grupos (calendario, grupos A-L, sedes). Esto garantiza que el fixture
//    SIEMPRE tenga los 72 partidos aunque TheSportsDB devuelva menos.
//  - OVERLAY EN VIVO: se piden los partidos a TheSportsDB y se superponen
//    marcadores/estado/horario sobre la base, emparejando por equipos.
//  - ELIMINATORIAS: cuando aparecen, se agregan al final (no estan en la base).
//  - Solo reescribe si los partidos cambiaron (evita commits/rebuilds vacios).

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = "3"; // key publica gratuita de TheSportsDB
const LEAGUE = "4429"; // FIFA World Cup
const SEASON = "2026";
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

// openfootball: dataset comunitario de dominio publico (CC0), sin API key,
// con los resultados curados de los 104 partidos (y goleadores). Es nuestra
// fuente PRIMARIA de resultados finales: confiable y no se degrada como la
// free de TheSportsDB. TheSportsDB queda solo para el marcador EN VIVO.
const OPENFOOTBALL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// martj42/international_results: 49k+ partidos internacionales (incluye 2026).
// Base para el motor Elo (pronostico) y el historial head-to-head.
const MARTJ42 = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";
// Ranking FIFA aproximado, keyed por nombre en ingles (comunidad, CC0).
const RANKINGS_URL = "https://raw.githubusercontent.com/salah23222/worldcup2026/main/data/rankings.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "data", "fixture.json");
const BASE_FILE = resolve(__dirname, "..", "data", "fixture-base.json");

// Codigos de ronda de TheSportsDB para eliminatorias (no todos existiran aun).
const KNOCKOUT_ROUNDS = [
  { code: 200, stage: "R32", name: "Dieciseisavos" },
  { code: 180, stage: "R16", name: "Octavos de final" },
  { code: 160, stage: "QF", name: "Cuartos de final" },
  { code: 150, stage: "SF", name: "Semifinales" },
  { code: 170, stage: "TP", name: "Tercer puesto" },
  { code: 125, stage: "F", name: "Final" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Throttle global: la key gratuita de TheSportsDB devuelve 429 si se la
// satura. Espaciamos las llamadas y reintentamos con backoff ante 429.
async function getJSON(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "mundial-2026-fixture" } });
      if (res.status === 429) throw new Error("HTTP 429");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      await sleep(500); // espaciado cortes entre requests OK
      return json;
    } catch (err) {
      if (attempt === 3) {
        console.error(`  ! fallo ${url}: ${err.message}`);
        return null;
      }
      // backoff mas largo ante 429
      await sleep(err.message.includes("429") ? 4000 : 1500);
    }
  }
}

// Normaliza un nombre de equipo para emparejar base <-> API sin importar
// mayusculas, acentos o espacios sobrantes.
function teamKey(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
const pairKey = (h, a) => `${teamKey(h)}|${teamKey(a)}`;

// Alias para unificar nombres entre fuentes (TheSportsDB / openfootball / martj42).
const ALIAS = {
  unitedstates: "usa", us: "usa",
  bosniaandherzegovina: "bosniaherzegovina",
  czechia: "czechrepublic",
  turkiye: "turkey",
  caboverde: "capeverde",
  korearepublic: "southkorea", republicofkorea: "southkorea",
  cotedivoire: "ivorycoast",
  iranislamicrepublicof: "iran", iriran: "iran",
  capeverdeislands: "capeverde",
};
const canon = (name) => { const k = teamKey(name); return ALIAS[k] || k; };

// Reparte el redondeo de varias probabilidades para que sumen exactamente 100.
function round100(...ps) {
  const raw = ps.map((p) => p * 100);
  const fl = raw.map(Math.floor);
  let rem = 100 - fl.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < rem; i++) fl[order[i % order.length][1]]++;
  return fl;
}

// Parser CSV simple con soporte de comillas (martj42 puede citar ciudad/pais).
function parseCsvLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function num(v) {
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function normalize(ev, stageInfo) {
  if (!ev) return null;
  const round = parseInt(ev.intRound, 10) || 0;
  let stage, stageName, group;
  if (round >= 1 && round <= 3) {
    stage = "GROUP";
    stageName = `Fase de grupos · Fecha ${round}`;
    group = ev.strGroup ? ev.strGroup.replace(/group\s*/i, "").trim() : null;
  } else if (stageInfo) {
    stage = stageInfo.stage;
    stageName = stageInfo.name;
    group = null;
  } else {
    stage = "KO";
    stageName = ev.strGroup || "Eliminatorias";
    group = null;
  }
  return {
    id: ev.idEvent,
    round,
    stage,
    stageName,
    group,
    date: ev.dateEvent || null,
    time: ev.strTime || null,
    timestamp: ev.strTimestamp || (ev.dateEvent ? `${ev.dateEvent}T${ev.strTime || "00:00:00"}` : null),
    home: ev.strHomeTeam || "Por definir",
    away: ev.strAwayTeam || "Por definir",
    homeBadge: ev.strHomeTeamBadge || null,
    awayBadge: ev.strAwayTeamBadge || null,
    homeScore: num(ev.intHomeScore),
    awayScore: num(ev.intAwayScore),
    status: ev.strStatus || "NS",
    venue: ev.strVenue || null,
    city: ev.strCity || null,
  };
}

// Superpone los datos frescos (m) sobre el partido base (b) sin perder el
// calendario/grupo/sede de la base. Solo pisa lo que la API trae con valor.
function overlay(b, m) {
  if (m.homeScore !== null) b.homeScore = m.homeScore;
  if (m.awayScore !== null) b.awayScore = m.awayScore;
  if (m.status && m.status !== "NS") b.status = m.status;
  if (m.timestamp) b.timestamp = m.timestamp;
  if (m.date) b.date = m.date;
  if (m.time) b.time = m.time;
  if (m.homeBadge) b.homeBadge = m.homeBadge;
  if (m.awayBadge) b.awayBadge = m.awayBadge;
  if (m.id) b.id = m.id;
  if (m.venue) b.venue = m.venue;
  if (m.city) b.city = m.city;
}

// Superpone los resultados curados de openfootball sobre la base, emparejando
// por equipos. Solo toca partidos con resultado final (score.ft presente), asi
// no pisa los que estan en vivo (que vienen de TheSportsDB). Devuelve cuantos.
async function overlayOpenFootball(baseByPair) {
  const d = await getJSON(OPENFOOTBALL);
  const ms = (d && d.matches) || [];
  if (!ms.length) {
    console.log("openfootball: sin datos (se sigue con TheSportsDB)");
    return 0;
  }
  let n = 0;
  for (const m of ms) {
    const t1 = typeof m.team1 === "string" ? m.team1 : m.team1 && m.team1.name;
    const t2 = typeof m.team2 === "string" ? m.team2 : m.team2 && m.team2.name;
    if (!t1 || !t2) continue;
    const ft = m.score && m.score.ft;
    if (!Array.isArray(ft) || ft.length < 2) continue; // sin resultado aun
    const b = baseByPair.get(pairKey(t1, t2));
    if (b) {
      b.homeScore = Number(ft[0]);
      b.awayScore = Number(ft[1]);
      b.status = "FT";
      // Goleadores (nombre + minuto), si openfootball los trae.
      const mapGoals = (arr) => Array.isArray(arr)
        ? arr.filter((g) => g && g.name).map((g) => ({ name: g.name, minute: String(g.minute ?? g.offset ?? "").trim() }))
        : [];
      const gh = mapGoals(m.goals1), ga = mapGoals(m.goals2);
      if (gh.length || ga.length) b.goals = { home: gh, away: ga };
      n++;
    }
  }
  console.log(`openfootball: ${n} resultados finales superpuestos`);
  return n;
}

// Trae el ranking FIFA y lo devuelve keyed por los NOMBRES de nuestra base
// (mapeando por canon), asi el cliente busca directo por m.home.
async function fetchRanks(baseMatches) {
  const d = await getJSON(RANKINGS_URL);
  if (!d || typeof d !== "object") { console.log("ranking FIFA: sin datos"); return {}; }
  const byCanon = {};
  for (const [k, v] of Object.entries(d)) { if (!k.startsWith("_") && typeof v === "number") byCanon[canon(k)] = v; }
  const names = new Set();
  for (const m of baseMatches) { names.add(m.home); names.add(m.away); }
  const ranks = {};
  for (const name of names) { const r = byCanon[canon(name)]; if (r) ranks[name] = r; }
  console.log(`ranking FIFA: ${Object.keys(ranks).length}/${names.size} equipos`);
  return ranks;
}

// Motor Elo + head-to-head desde martj42. Adjunta m.pred a los partidos por
// jugar: { pH, pD, pA, h2h:{ played, last:[...] } }. Si la fuente no responde,
// conserva las predicciones del fixture anterior (no las borra).
async function attachPredictions(matches) {
  let csv = null;
  try {
    const r = await fetch(MARTJ42, { headers: { "User-Agent": "mundial-2026-fixture" } });
    if (r.ok) csv = await r.text();
  } catch { /* sin red */ }
  if (!csv) {
    console.error("predicciones: martj42 no disponible, se conservan las previas");
    try {
      const prev = JSON.parse(await readFile(OUT, "utf8"));
      const pm = new Map((prev.matches || []).filter((x) => x.pred).map((x) => [`${x.home}|${x.away}`, x.pred]));
      for (const m of matches) { const p = pm.get(`${m.home}|${m.away}`); if (p) m.pred = p; }
    } catch { /* primera vez */ }
    return;
  }
  const lines = csv.split(/\r?\n/);
  const rating = new Map();
  const R = (k) => (rating.has(k) ? rating.get(k) : 1500);
  // pares (en ambos ordenes) que se enfrentan en ESTE mundial, para guardar h2h.
  const wcPairs = new Set();
  for (const m of matches) { wcPairs.add(`${canon(m.home)}|${canon(m.away)}`); wcPairs.add(`${canon(m.away)}|${canon(m.home)}`); }
  const hist = [];
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i]; if (!ln) continue;
    const c = parseCsvLine(ln);
    const date = c[0], home = c[1], away = c[2], hs = c[3], as = c[4], neutral = c[8];
    if (!home || !away || hs === "" || hs === "NA" || as === "" || as === "NA") continue;
    const hsN = Number(hs), asN = Number(as);
    if (!Number.isFinite(hsN) || !Number.isFinite(asN)) continue;
    const H = canon(home), A = canon(away);
    const ha = neutral === "TRUE" ? 0 : 65;
    const Ra = R(H), Rb = R(A);
    const We = 1 / (1 + Math.pow(10, (Rb - Ra - ha) / 400));
    const sa = hsN > asN ? 1 : hsN < asN ? 0 : 0.5;
    const K = 30;
    rating.set(H, Ra + K * (sa - We));
    rating.set(A, Rb + K * ((1 - sa) - (1 - We)));
    if (wcPairs.has(`${H}|${A}`)) hist.push({ date, h: home, a: away, hs: hsN, as: asN, H, A });
  }
  let n = 0;
  for (const m of matches) {
    if (m.homeScore !== null && m.homeScore !== undefined) continue; // ya jugado
    const H = canon(m.home), A = canon(m.away);
    if (m.home === "Por definir" || m.away === "Por definir") continue;
    const dr = R(H) - R(A); // sede neutral en el Mundial
    const We = 1 / (1 + Math.pow(10, -dr / 400));
    let pD = 0.27 * Math.exp(-Math.pow(dr / 280, 2));
    let pH = Math.max(0, We - pD / 2), pA = Math.max(0, 1 - We - pD / 2);
    const s = pH + pD + pA; pH /= s; pD /= s; pA /= s;
    const [iH, iD, iA] = round100(pH, pD, pA);
    const meets = hist.filter((x) => (x.H === H && x.A === A) || (x.H === A && x.A === H));
    meets.sort((x, y) => (x.date < y.date ? 1 : -1));
    const last = meets.slice(0, 3).map((x) => ({ date: x.date, h: x.h, a: x.a, hs: x.hs, as: x.as }));
    m.pred = { pH: iH, pD: iD, pA: iA, h2h: { played: meets.length, last } };
    n++;
  }
  console.log(`predicciones Elo: ${n} partidos por jugar`);
}

async function main() {
  // 0) Cargar la base de 72 partidos (fase de grupos). Es la fuente de verdad
  //    del calendario; si falta, abortamos para no publicar un fixture roto.
  let baseMatches;
  try {
    const baseDoc = JSON.parse(await readFile(BASE_FILE, "utf8"));
    baseMatches = (baseDoc.matches || []).map((m) => ({ ...m }));
  } catch (err) {
    console.error(`No se pudo leer la base ${BASE_FILE}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Base estatica: ${baseMatches.length} partidos de grupos`);

  // Indice de la base por par de equipos (en ambos ordenes por las dudas).
  const baseByPair = new Map();
  for (const b of baseMatches) {
    baseByPair.set(pairKey(b.home, b.away), b);
  }

  // 0.b) Carry-forward: cargar el fixture anterior para que los marcadores ya
  //      capturados NO se pierdan si la API deja de devolver ese partido.
  const prevByPair = new Map();
  try {
    const prevDoc = JSON.parse(await readFile(OUT, "utf8"));
    for (const p of prevDoc.matches || []) {
      if (p.homeScore !== null && p.homeScore !== undefined) {
        prevByPair.set(pairKey(p.home, p.away), p);
      }
    }
  } catch {
    /* primera vez */
  }
  let carried = 0;
  for (const b of baseMatches) {
    if (b.homeScore === null || b.homeScore === undefined) {
      const p = prevByPair.get(pairKey(b.home, b.away));
      if (p) {
        b.homeScore = p.homeScore;
        b.awayScore = p.awayScore;
        if (p.status) b.status = p.status;
        if (p.id) b.id = p.id;
        if (p.timestamp) b.timestamp = p.timestamp;
        carried++;
      }
    }
  }
  if (carried) console.log(`Marcadores conservados del fixture anterior: ${carried}`);

  const koById = new Map(); // eliminatorias que aparezcan
  let overlaid = 0;

  const consume = (ev, stageInfo) => {
    const m = normalize(ev, stageInfo);
    if (!m || !m.id) return;
    if (m.date && m.date < "2026-06-01") return; // descarta partidos viejos
    if (m.stage === "GROUP" || (!stageInfo && m.round >= 1 && m.round <= 3)) {
      // Superponer sobre la base por equipos.
      const b = baseByPair.get(pairKey(m.home, m.away));
      if (b) {
        overlay(b, m);
        overlaid++;
      }
      // Si no matchea (nombre raro), lo ignoramos: la base ya cubre los 72.
    } else {
      // Eliminatoria: se agrega al final.
      koById.set(m.id, m);
    }
  };

  // 1) Fase de grupos en vivo -> overlay sobre la base
  for (const r of [1, 2, 3]) {
    const d = await getJSON(`${BASE}/eventsround.php?id=${LEAGUE}&r=${r}&s=${SEASON}`);
    const evs = (d && d.events) || [];
    console.log(`Ronda grupo ${r}: ${evs.length} partidos (API)`);
    for (const ev of evs) consume(ev);
  }

  // 2) Eliminatorias (cuando existan)
  for (const ko of KNOCKOUT_ROUNDS) {
    const d = await getJSON(`${BASE}/eventsround.php?id=${LEAGUE}&r=${ko.code}&s=${SEASON}`);
    const evs = (d && d.events) || [];
    if (evs.length) console.log(`${ko.name}: ${evs.length} partidos`);
    for (const ev of evs) consume(ev, ko);
  }

  // 3) Proximos y recientes (marcadores frescos) -> overlay/KO
  for (const endpoint of ["eventsnextleague", "eventspastleague"]) {
    const d = await getJSON(`${BASE}/${endpoint}.php?id=${LEAGUE}`);
    const evs = (d && d.events) || [];
    console.log(`${endpoint}: ${evs.length} partidos`);
    for (const ev of evs) consume(ev);
  }

  // 4) eventsday por fecha en una ventana reciente (hoy -3 .. hoy +1). Este
  //    endpoint devuelve resultados que los de arriba a veces no traen. Solo
  //    pedimos fechas que existen en el calendario para no gastar requests.
  const baseDates = new Set(baseMatches.map((m) => m.date).filter(Boolean));
  const today = new Date();
  const windowDates = [];
  for (let i = -1; i <= 1; i++) {
    const dt = new Date(today.getTime() + i * 86400000);
    const ds = dt.toISOString().slice(0, 10);
    if (baseDates.has(ds)) windowDates.push(ds);
  }
  // openfootball ya cubre los resultados finales, asi que eventsday solo aporta
  // frescura EN VIVO de la fecha en curso. Con 2 intentos alcanza y no satura.
  const EVENTSDAY_TRIES = 2;
  for (const ds of windowDates) {
    const seenIds = new Set();
    let withScore = 0;
    for (let t = 0; t < EVENTSDAY_TRIES; t++) {
      const d = await getJSON(`${BASE}/eventsday.php?d=${ds}&l=${LEAGUE}`);
      const evs = (d && d.events) || [];
      for (const ev of evs) {
        if (ev.idEvent && seenIds.has(ev.idEvent)) continue;
        if (ev.idEvent) seenIds.add(ev.idEvent);
        if (ev.intHomeScore !== null && ev.intHomeScore !== "") withScore++;
        consume(ev);
      }
    }
    console.log(`eventsday ${ds}: ${seenIds.size} partidos unicos (${withScore} con marcador) tras ${EVENTSDAY_TRIES} intentos`);
  }

  console.log(`Marcadores superpuestos sobre la base: ${overlaid}`);

  // 5) openfootball ULTIMO: pisa con el resultado final curado (los partidos
  //    en vivo no tienen score.ft, asi que conservan el marcador de TheSportsDB).
  await overlayOpenFootball(baseByPair);

  const matches = [...baseMatches, ...koById.values()].sort((a, b) => {
    const ta = a.timestamp || "";
    const tb = b.timestamp || "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  // 6) Ranking FIFA (chips) -> m.homeRank / m.awayRank
  const ranks = await fetchRanks(baseMatches);
  for (const m of matches) {
    if (ranks[m.home] != null) m.homeRank = ranks[m.home];
    if (ranks[m.away] != null) m.awayRank = ranks[m.away];
  }

  // 7) Pronostico Elo + head-to-head -> m.pred (en partidos por jugar)
  await attachPredictions(matches);

  // Solo reescribe (y por ende commitea) si los PARTIDOS cambiaron, para
  // no generar commits ni rebuilds de Pages innecesarios cada 15 minutos.
  const matchesJSON = JSON.stringify(matches);
  let prevUpdatedAt = null;
  try {
    const prev = JSON.parse(await readFile(OUT, "utf8"));
    if (JSON.stringify(prev.matches) === matchesJSON) {
      console.log(`\nSin cambios en los partidos (${matches.length}). No se reescribe.`);
      return;
    }
    prevUpdatedAt = prev.updatedAt;
  } catch {
    /* primera vez o archivo inexistente */
  }

  const out = {
    updatedAt: new Date().toISOString(),
    source: "TheSportsDB",
    league: "FIFA World Cup 2026",
    leagueId: LEAGUE,
    season: SEASON,
    count: matches.length,
    matches,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nOK -> ${OUT} (${matches.length} partidos)${prevUpdatedAt ? " · datos actualizados" : ""}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
