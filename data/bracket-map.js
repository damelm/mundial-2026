/* data/bracket-map.js — Estructura OFICIAL del cuadro de eliminatorias WC2026.
 * Permite autocompletar el bracket por proyección desde las tablas de grupos.
 * Slots: {t:'W'|'R'|'T', g:'X'} → W=1.º de grupo, R=2.º, T=mejor tercero.
 * Para T, `from` lista los grupos cuyo tercero puede caer en ese partido.
 */
const R32_MATCHES = [
  { m: 73, home: { t: "R", g: "A" }, away: { t: "R", g: "B" } },
  { m: 74, home: { t: "W", g: "E" }, away: { t: "T", from: ["A", "B", "C", "D", "F"] } },
  { m: 75, home: { t: "W", g: "F" }, away: { t: "R", g: "C" } },
  { m: 76, home: { t: "W", g: "C" }, away: { t: "R", g: "F" } },
  { m: 77, home: { t: "W", g: "I" }, away: { t: "T", from: ["C", "D", "F", "G", "H"] } },
  { m: 78, home: { t: "R", g: "E" }, away: { t: "R", g: "I" } },
  { m: 79, home: { t: "W", g: "A" }, away: { t: "T", from: ["C", "E", "F", "H", "I"] } },
  { m: 80, home: { t: "W", g: "L" }, away: { t: "T", from: ["E", "H", "I", "J", "K"] } },
  { m: 81, home: { t: "W", g: "D" }, away: { t: "T", from: ["B", "E", "F", "I", "J"] } },
  { m: 82, home: { t: "W", g: "G" }, away: { t: "T", from: ["A", "E", "H", "I", "J"] } },
  { m: 83, home: { t: "R", g: "K" }, away: { t: "R", g: "L" } },
  { m: 84, home: { t: "W", g: "H" }, away: { t: "R", g: "J" } },
  { m: 85, home: { t: "W", g: "B" }, away: { t: "T", from: ["E", "F", "G", "I", "J"] } },
  { m: 86, home: { t: "W", g: "J" }, away: { t: "R", g: "H" } },
  { m: 87, home: { t: "W", g: "K" }, away: { t: "T", from: ["D", "E", "I", "J", "L"] } },
  { m: 88, home: { t: "R", g: "D" }, away: { t: "R", g: "G" } },
];
// Columna (ganador que recibe tercero) -> número de partido R32
const THIRD_COLUMN_TO_MATCH = { A: 79, B: 85, D: 81, E: 74, G: 82, I: 77, K: 87, L: 80 };
// Árbol R16 → Final (match: partidos que lo alimentan)
const BRACKET_TREE = {
  R16: [
    { m: 89, f: [74, 77] }, { m: 90, f: [73, 75] }, { m: 91, f: [76, 78] }, { m: 92, f: [79, 80] },
    { m: 93, f: [83, 84] }, { m: 94, f: [81, 82] }, { m: 95, f: [86, 88] }, { m: 96, f: [85, 87] },
  ],
  QF: [ { m: 97, f: [89, 90] }, { m: 98, f: [93, 94] }, { m: 99, f: [91, 92] }, { m: 100, f: [95, 96] } ],
  SF: [ { m: 101, f: [97, 98] }, { m: 102, f: [99, 100] } ],
  TP: { m: 103, f: [101, 102] },
  F: { m: 104, f: [101, 102] },
};
