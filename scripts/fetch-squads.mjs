/* fetch-squads.mjs — Baja el plantel (26) de cada selección desde API-Football
 * usando la key del secret API_FOOTBALL_KEY. Escribe data/squads.json.
 * Resumable: solo refresca lo que falta o tiene > 5 días. Respeta el rate-limit.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDS = resolve(__dirname, "..", "data", "af-team-ids.json");
const OUT = resolve(__dirname, "..", "data", "squads.json");
const KEY = process.env.API_FOOTBALL_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, retry = 0) {
  const res = await fetch("https://v3.football.api-sports.io" + path, { headers: { "x-apisports-key": KEY } });
  if (res.status === 429 && retry < 3) { await sleep(20000); return api(path, retry + 1); }
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function main() {
  if (!KEY) { console.error("Falta API_FOOTBALL_KEY"); process.exit(1); }
  const ids = JSON.parse(await readFile(IDS, "utf8"));
  let squads = {};
  try { squads = JSON.parse(await readFile(OUT, "utf8")); } catch {}

  let fetched = 0, used = 0;
  const MAX_PER_RUN = 90; // margen bajo el límite diario de 100
  for (const [name, info] of Object.entries(ids)) {
    if (used >= MAX_PER_RUN) { console.log("Tope de requests por corrida alcanzado."); break; }
    const cur = squads[name];
    const stale = !cur || !cur.updated || Date.now() - new Date(cur.updated).getTime() > 5 * 86400000;
    if (!stale) continue;
    try {
      const d = await api("/players/squads?team=" + info.id);
      used++;
      const players = ((d.response || [])[0] || {}).players || [];
      if (players.length) {
        squads[name] = { updated: new Date().toISOString(), source: "API-Football", players: players.map((p) => ({ name: p.name, number: p.number, pos: p.position, photo: p.photo })) };
        fetched++;
        console.log(`${name}: ${players.length} jugadores`);
      } else {
        console.warn(`${name}: respuesta vacía`);
      }
    } catch (e) {
      console.error(`${name}: ${e.message}`);
    }
    await sleep(7000); // ~8 req/min, bajo el rate-limit del free
  }

  await writeFile(OUT, JSON.stringify(squads, null, 1) + "\n", "utf8");
  console.log(`\nOK -> squads.json (${Object.keys(squads).length}/48 equipos · ${fetched} actualizados esta corrida)`);
}

main().catch((e) => { console.error("Error fatal:", e); process.exit(1); });
