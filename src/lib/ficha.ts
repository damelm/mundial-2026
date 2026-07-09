/* Ficha del cruce: titulares reales que mencionan a los equipos del partido
 * y, como respaldo, un dato curioso de la ficha escrita a mano (lore).
 * Determinístico y sin IA. */

import { TEAMS } from "../data/teams";
import { LORE } from "../data/lore";
import type { KoMatch } from "./ko";
import type { Headline } from "./useNews";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Nombres con los que un equipo puede aparecer en titulares (es + en). */
function aliases(team: string): string[] {
  const t = TEAMS[team];
  if (!t) return [norm(team)];
  return [...new Set([norm(t.es), norm(t.en), norm(team)])];
}

/** Titulares que mencionan a alguno de los dos equipos del partido. */
export function headlinesFor(
  m: KoMatch,
  items: Headline[],
  max = 2,
): Headline[] {
  const names = [
    ...(m.home ? aliases(m.home) : []),
    ...(m.away ? aliases(m.away) : []),
  ];
  if (!names.length) return [];
  return items
    .filter((h) => {
      const t = norm(h.t);
      return names.some((n) => t.includes(n));
    })
    .slice(0, max);
}

/** Titulares que mencionan a UNA selección. */
export function headlinesForTeam(
  team: string,
  items: Headline[],
  max = 3,
): Headline[] {
  const names = aliases(team);
  return items.filter((h) => {
    const t = norm(h.t);
    return names.some((n) => t.includes(n));
  }).slice(0, max);
}

/** Dato curioso estable para el partido (respaldo sin titulares): alterna
 * equipo y dato según el id del partido, así no cambia entre visitas. */
export function factFor(m: KoMatch): string | null {
  const teams = [m.home, m.away].filter((t): t is string => !!t && !!LORE[t]);
  if (!teams.length) return null;
  let hash = 0;
  for (const c of m.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const team = teams[hash % teams.length];
  const lore = LORE[team];
  if (!lore.facts.length) return null;
  const fact = lore.facts[hash % lore.facts.length];
  return `${lore.nick}: ${fact}`;
}
