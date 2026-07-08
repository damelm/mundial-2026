/* Prerender del estado inicial: descarga el calendario KO, renderiza la app
 * con react-dom/server e inyecta el HTML + los datos (window.__KO__) en
 * dist/index.html. React toma el control al cargar sin flash ni "Cargando".
 *
 * Uso: node scripts/ssg.mjs [dist] [dist-ssr]  (tras `vite build` y
 *      `vite build --ssr src/entry-server.tsx --outDir dist-ssr`)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dist = process.argv[2] || "dist";
const distSsr = process.argv[3] || "dist-ssr";

const { render, fetchKoSchedule } = await import(
  pathToFileURL(resolve(join(distSsr, "entry-server.js"))).href
);

const matches = await fetchKoSchedule();
if (!matches) {
  console.warn("SSG: sin datos de ESPN — se deja el shell estático como está.");
  process.exit(0);
}

const html = render(matches);
const htmlPath = join(dist, "index.html");
let doc = readFileSync(htmlPath, "utf8");

const rootRe = /<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/;
if (!rootRe.test(doc)) {
  console.error("SSG: no se encontró <div id=\"root\"> en index.html");
  process.exit(1);
}
const payload = JSON.stringify(matches).replace(/</g, "\\u003c");
doc = doc.replace(
  rootRe,
  `<div id="root">${html}</div><script>window.__KO__=${payload}</script>`,
);
writeFileSync(htmlPath, doc);
console.log(`SSG OK → ${htmlPath} (${matches.length} partidos prerenderizados)`);
