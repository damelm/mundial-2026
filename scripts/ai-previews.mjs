/* Genera previas y resúmenes con IA para las eliminatorias → data/ai.json.
 *
 * Corre en GitHub Actions con el secret ANTHROPIC_API_KEY. Usa Haiku (el
 * modelo económico): ~10 partidos por corrida ≈ centavos. Si no hay key,
 * sale sin error para no romper el workflow.
 *
 * Salida: { generated, texts: { [matchId]: { kind: "previa"|"resumen", es } } }
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.log("Sin ANTHROPIC_API_KEY — se omite la generación de IA.");
  process.exit(0);
}

const MODEL = "claude-haiku-4-5-20251001";
const ESPN_SB =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260721";
const OUT = "data/ai.json";

const sb = await fetch(ESPN_SB).then((r) => r.json());
const events = (sb.events ?? []).sort((a, b) =>
  (a.date || "").localeCompare(b.date || ""),
);

const now = Date.now();
const DAY = 86400e3;

function pick(ev) {
  const c = ev.competitions?.[0];
  if (!c) return null;
  const H = c.competitors.find((x) => x.homeAway === "home");
  const A = c.competitors.find((x) => x.homeAway === "away");
  if (!H || !A) return null;
  const placeholder = /winner|loser|tbd/i.test(
    H.team.displayName + A.team.displayName,
  );
  const state = ev.status?.type?.state;
  const t = new Date(ev.date).getTime();
  return {
    id: "ko-" + ev.id,
    home: H.team.displayName,
    away: A.team.displayName,
    hs: H.score,
    as: A.score,
    hp: H.shootoutScore,
    ap: A.shootoutScore,
    state,
    placeholder,
    venue: c.venue?.fullName ?? "",
    date: ev.date,
    upcoming: state === "pre" && !placeholder && t - now < 5 * DAY,
    recent: state === "post" && now - t < 3 * DAY,
  };
}

const all = events.map(pick).filter(Boolean);
const targets = all.filter((m) => m.upcoming || m.recent);
if (!targets.length) {
  console.log("Nada para generar (sin partidos próximos ni recientes).");
  process.exit(0);
}

// Conservar textos previos aún válidos (no regenerar lo mismo).
const prev = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8")).texts ?? {}
  : {};

async function ask(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.content?.[0]?.text?.trim() ?? "";
}

const texts = {};
for (const m of targets) {
  const kind = m.recent ? "resumen" : "previa";
  const cacheKey = `${kind}:${m.hs ?? ""}-${m.as ?? ""}`;
  if (prev[m.id]?.kind === kind && prev[m.id]?.v === cacheKey) {
    texts[m.id] = prev[m.id];
    continue;
  }
  const prompt = m.recent
    ? `Escribe un resumen de 2 frases en español rioplatense neutro (sin "vos") del partido de eliminatorias del Mundial 2026: ${m.home} ${m.hs}-${m.as} ${m.away}${m.hp != null ? ` (penales ${m.hp}-${m.ap})` : ""}. Tono de transmisión deportiva, sobrio, sin emojis ni hashtags. Solo el texto.`
    : `Escribe una previa de 2 frases en español neutro del cruce de eliminatorias del Mundial 2026 entre ${m.home} y ${m.away} (${m.venue}). Qué estilos chocan y qué se juega. Sobrio, sin emojis, sin inventar lesionados ni datos específicos de plantilla. Solo el texto.`;
  try {
    const es = await ask(prompt);
    if (es) texts[m.id] = { kind, es, v: cacheKey };
    console.log(`${kind} ${m.home}–${m.away}: ok`);
  } catch (e) {
    console.error(`${kind} ${m.home}–${m.away}: ${e.message}`);
  }
}

if (!Object.keys(texts).length) {
  console.log("No se generó ningún texto.");
  process.exit(0);
}

writeFileSync(
  OUT,
  JSON.stringify({ generated: new Date().toISOString(), texts }, null, 1),
);
console.log(`OK → ${OUT} (${Object.keys(texts).length} textos)`);
