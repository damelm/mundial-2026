/* fetch-news.mjs — Baja titulares del Mundial 2026 desde Google News RSS
 * (5 idiomas) y escribe data/news.json. Solo títulos + fuente, sin links
 * (la app los muestra como texto, no clicables). Si una consulta falla o
 * trae pocos resultados, conserva los titulares anteriores de ese idioma. */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "data", "news.json");

const FEEDS = {
  es: { q: '"mundial 2026"', hl: "es-419", gl: "MX", ceid: "MX:es-419" },
  en: { q: '"world cup 2026"', hl: "en-US", gl: "US", ceid: "US:en" },
  pt: { q: '"copa do mundo 2026"', hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  fr: { q: '"coupe du monde 2026"', hl: "fr", gl: "FR", ceid: "FR:fr" },
  ar: { q: '"كأس العالم 2026"', hl: "ar", gl: "EG", ceid: "EG:ar" },
};
const MAX = 12;

const decode = (s) => s
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .trim();

async function fetchLang(lang, cfg) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cfg.q)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${encodeURIComponent(cfg.ceid)}`;
  const res = await fetch(url, { headers: { "User-Agent": "mundial-2026-app/1.0 (+https://damelm.github.io/mundial-2026)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>.*?<title>(.*?)<\/title>.*?<link>(.*?)<\/link>.*?<\/item>/gs)]
    .map((m) => ({ raw: decode(m[1]), u: decode(m[2]) }));
  const seen = new Set();
  const out = [];
  for (const { raw, u } of items) {
    // Google News pone la fuente al final: "Titular - Fuente"
    const m = raw.match(/^(.*\S)\s+-\s+([^-]{2,40})$/s);
    const title = (m ? m[1] : raw).trim();
    const src = m ? m[2].trim() : "";
    const key = title.toLowerCase().slice(0, 70);
    if (!title || title.length < 20 || seen.has(key)) continue;
    seen.add(key);
    out.push({ t: title, src, u: /^https:\/\//.test(u) ? u : "" });
    if (out.length >= MAX) break;
  }
  return out;
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch {}
  const news = { updatedAt: new Date().toISOString() };
  for (const [lang, cfg] of Object.entries(FEEDS)) {
    try {
      const items = await fetchLang(lang, cfg);
      news[lang] = items.length >= 3 ? items : (prev[lang] || items);
      console.log(`${lang}: ${items.length} titulares${items.length < 3 ? " (conserva anteriores)" : ""}`);
    } catch (e) {
      news[lang] = prev[lang] || [];
      console.warn(`${lang}: ${e.message} (conserva anteriores)`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  await writeFile(OUT, JSON.stringify(news, null, 1) + "\n", "utf8");
  console.log("OK -> news.json");
}

main().catch((e) => { console.error("Error fatal:", e); process.exit(1); });
