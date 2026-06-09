/* data/stadiums.js — Las 16 sedes del Mundial 2026 (capacidad, coords, partidos). */
const STADIUMS = [
  { name: "Estadio Azteca", city: "Ciudad de México", country: "México", capacity: 83000, lat: 19.302833, lon: -99.150528, matches: 5, note: "Partido inaugural" },
  { name: "Estadio Akron", city: "Guadalajara", country: "México", capacity: 48000, lat: 20.681944, lon: -103.462778, matches: 4, note: "Fase de grupos" },
  { name: "Estadio BBVA", city: "Monterrey", country: "México", capacity: 53500, lat: 25.669167, lon: -100.244722, matches: 4, note: "Hasta dieciseisavos" },
  { name: "BMO Field", city: "Toronto", country: "Canadá", capacity: 45000, lat: 43.633056, lon: -79.418611, matches: 6, note: "Hasta dieciseisavos" },
  { name: "BC Place", city: "Vancouver", country: "Canadá", capacity: 54000, lat: 49.276667, lon: -123.111944, matches: 7, note: "Hasta octavos" },
  { name: "SoFi Stadium", city: "Los Ángeles", country: "Estados Unidos", capacity: 70000, lat: 33.953333, lon: -118.339167, matches: 8, note: "Cuartos de final" },
  { name: "Levi's Stadium", city: "San Francisco", country: "Estados Unidos", capacity: 71000, lat: 37.403, lon: -121.97, matches: 6, note: "Hasta dieciseisavos" },
  { name: "Lumen Field", city: "Seattle", country: "Estados Unidos", capacity: 69000, lat: 47.595278, lon: -122.331667, matches: 6, note: "Hasta octavos" },
  { name: "MetLife Stadium", city: "Nueva York / Nueva Jersey", country: "Estados Unidos", capacity: 82500, lat: 40.813611, lon: -74.074444, matches: 8, note: "Final y semifinal" },
  { name: "Gillette Stadium", city: "Boston", country: "Estados Unidos", capacity: 65000, lat: 42.090944, lon: -71.264344, matches: 7, note: "Cuartos de final" },
  { name: "Lincoln Financial Field", city: "Filadelfia", country: "Estados Unidos", capacity: 69000, lat: 39.900833, lon: -75.1675, matches: 6, note: "Hasta octavos" },
  { name: "Hard Rock Stadium", city: "Miami", country: "Estados Unidos", capacity: 65000, lat: 25.957917, lon: -80.238889, matches: 7, note: "Tercer puesto" },
  { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "Estados Unidos", capacity: 75000, lat: 33.755556, lon: -84.400833, matches: 8, note: "Semifinal" },
  { name: "AT&T Stadium", city: "Dallas", country: "Estados Unidos", capacity: 94000, lat: 32.747778, lon: -97.092778, matches: 9, note: "Semifinal · más partidos del torneo" },
  { name: "NRG Stadium", city: "Houston", country: "Estados Unidos", capacity: 72000, lat: 29.684722, lon: -95.410833, matches: 7, note: "Hasta octavos" },
  { name: "Arrowhead Stadium", city: "Kansas City", country: "Estados Unidos", capacity: 73000, lat: 39.048889, lon: -94.483889, matches: 6, note: "Cuartos de final" },
];
