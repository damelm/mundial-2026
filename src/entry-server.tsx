/* Entry SSR para el prerender de build (scripts/ssg.mjs): genera el HTML del
 * estado inicial con datos reales para que el primer paint sea contenido
 * completo, sin esperar al bundle. */

import { renderToString } from "react-dom/server";
import App from "./App";
import { fetchKoSchedule, type KoMatch } from "./lib/ko";

export { fetchKoSchedule };

export function render(matches: KoMatch[] | null): string {
  return renderToString(<App initialData={matches} />);
}
