// Descarga el fixture del Mundial 2026 desde TheSportsDB (key gratuita pública)
// y genera data/fixture.json. Sin API keys privadas, sin secrets.
//
// Estrategia:
//  - Fase de grupos: rounds 1,2,3 (eventsround) -> 72 partidos con grupo A-L.
//  - Eliminatorias: se prueban codigos de ronda conocidos de TheSportsDB.
//  - En vivo / recientes: eventsnextleague + eventspastleague (marcadores live).
//  - Se mezcla todo por idEvent (lo mas fresco gana).

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = "3"; // key publica gratuita de TheSportsDB
const LEAGUE = "4429"; // FIFA World Cup
const SEASON = "2026";
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "data", "fixture.json");

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

function normalize(ev, stageInfo) {
  if (!ev) return null;
  const hs = ev.intHomeScore;
  const as = ev.intAwayScore;
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
    homeScore: hs === null || hs === undefined || hs === "" ? null : Number(hs),
    awayScore: as === null || as === undefined || as === "" ? null : Number(as),
    status: ev.strStatus || "NS",
    venue: ev.strVenue || null,
    city: ev.strCity || null,
  };
}

async function main() {
  const byId = new Map();
  const add = (ev, stageInfo) => {
    const m = normalize(ev, stageInfo);
    if (!m || !m.id) return;
    // Descarta partidos fuera de la ventana del torneo (ej: final 2022 que
    // devuelve eventspastleague cuando aun no hubo partidos de 2026).
    if (m.date && m.date < "2026-06-01") return;
    byId.set(m.id, m);
  };

  // 1) Fase de grupos
  for (const r of [1, 2, 3]) {
    const d = await getJSON(`${BASE}/eventsround.php?id=${LEAGUE}&r=${r}&s=${SEASON}`);
    const evs = (d && d.events) || [];
    console.log(`Ronda grupo ${r}: ${evs.length} partidos`);
    for (const ev of evs) add(ev);
  }

  // 2) Eliminatorias (cuando existan)
  for (const ko of KNOCKOUT_ROUNDS) {
    const d = await getJSON(`${BASE}/eventsround.php?id=${LEAGUE}&r=${ko.code}&s=${SEASON}`);
    const evs = (d && d.events) || [];
    if (evs.length) console.log(`${ko.name}: ${evs.length} partidos`);
    for (const ev of evs) add(ev, ko);
  }

  // 3) Proximos y recientes (datos en vivo / marcadores frescos) -> pisan lo anterior
  for (const endpoint of ["eventsnextleague", "eventspastleague"]) {
    const d = await getJSON(`${BASE}/${endpoint}.php?id=${LEAGUE}`);
    const evs = (d && d.events) || [];
    console.log(`${endpoint}: ${evs.length} partidos`);
    for (const ev of evs) add(ev);
  }

  const matches = [...byId.values()].sort((a, b) => {
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
