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

async function getJSON(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "mundial-2026-fixture" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 2) {
        console.error(`  ! fallo ${url}: ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1500));
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
  for (let i = -3; i <= 1; i++) {
    const dt = new Date(today.getTime() + i * 86400000);
    const ds = dt.toISOString().slice(0, 10);
    if (baseDates.has(ds)) windowDates.push(ds);
  }
  for (const ds of windowDates) {
    const d = await getJSON(`${BASE}/eventsday.php?d=${ds}&l=${LEAGUE}`);
    const evs = (d && d.events) || [];
    console.log(`eventsday ${ds}: ${evs.length} partidos`);
    for (const ev of evs) consume(ev);
  }

  console.log(`Marcadores superpuestos sobre la base: ${overlaid}`);

  const matches = [...baseMatches, ...koById.values()].sort((a, b) => {
    const ta = a.timestamp || "";
    const tb = b.timestamp || "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

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
