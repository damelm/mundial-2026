/* content.js — Contenido temático del Mundial 2026: mascotas e historia. */
const MASCOTS = [
  { name: "Maple", animal: "Alce", country: "Canadá", flag: "ca", color: "#E4002B", pos: "Arquero", desc: "Un alce inspirado en la hoja de arce que representa la creatividad y la resiliencia." },
  { name: "Zayu", animal: "Jaguar", country: "México", flag: "mx", color: "#006847", pos: "Delantero", desc: "Un jaguar que encarna la fuerza, la agilidad y el orgullo cultural mexicano." },
  { name: "Clutch", animal: "Águila calva", country: "Estados Unidos", flag: "us", color: "#0A3161", pos: "Mediocampista", desc: "Un águila calva que simboliza el coraje, el liderazgo y la unidad." },
];

// Dato histórico mundialista por selección (clave = nombre en TEAMS).
const TEAM_HISTORY = {
  Argentina: "Campeona de tres Copas del Mundo (1978, 1986 y 2022), conquistó la última en Qatar venciendo a Francia por penales con Messi como figura.",
  Brazil: "Máxima ganadora con cinco títulos (1958, 1962, 1970, 1994 y 2002), es la única selección que disputó todas las ediciones del Mundial.",
  France: "Bicampeona del mundo (1998 y 2018), llegó además a la final de 2022, donde cayó ante Argentina por penales.",
  Germany: "Tetracampeona mundial (1954, 1974, 1990 y 2014), conquistó su último título en Brasil tras golear 7-1 al local en semifinales.",
  Spain: "Campeona por primera y única vez en 2010 en Sudáfrica, con un gol de Iniesta en la prórroga de la final ante Países Bajos.",
  England: "Campeona del mundo en una sola ocasión, en 1966, cuando fue anfitriona y venció a Alemania Occidental en la final de Wembley.",
  Netherlands: "Tres veces subcampeona del mundo (1974, 1978 y 2010), es considerada la mejor selección que nunca levantó la Copa.",
  Uruguay: "Bicampeona mundial (1930 y 1950), ganó la primera Copa de la historia como anfitriona y protagonizó el histórico 'Maracanazo' ante Brasil.",
  Portugal: "Su mejor actuación fue el tercer puesto en 1966 con Eusébio como goleador del torneo; nunca ha sido campeona mundial.",
  Mexico: "Anfitriona en 1970 y 1986, su mejor resultado fueron los cuartos de final, y en 2026 será el primer país en organizar tres Copas del Mundo.",
};
