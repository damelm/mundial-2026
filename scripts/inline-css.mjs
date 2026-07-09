/* Inlinea el CSS del build dentro de index.html (elimina la petición
 * render-blocking; el archivo pesa ~6 KB gzip). Uso: node scripts/inline-css.mjs [dist] */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] || "dist";
const htmlPath = join(dist, "index.html");
let html = readFileSync(htmlPath, "utf8");
const cssFile = readdirSync(join(dist, "assets")).find((f) => f.endsWith(".css"));
if (!cssFile) {
  console.log("Sin CSS que inlinear.");
  process.exit(0);
}
const css = readFileSync(join(dist, "assets", cssFile), "utf8");
const linkRe = new RegExp(`<link[^>]*href="[^"]*${cssFile}"[^>]*>`);
if (!linkRe.test(html)) {
  console.error("No se encontró el <link> del CSS en index.html");
  process.exit(1);
}
html = html.replace(linkRe, `<style>${css}</style>`);
writeFileSync(htmlPath, html);
console.log(`CSS inlineado (${(css.length / 1024).toFixed(1)} KB) → ${htmlPath}`);
