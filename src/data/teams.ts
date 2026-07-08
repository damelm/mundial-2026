/* Las 48 selecciones del Mundial 2026 (versión slim para la app React).
 * La clave coincide EXACTO con el displayName de TheSportsDB/legacy;
 * ESPN se mapea vía canonName + alias en lib/ko.ts.
 * code = ISO alpha-2 · fc = override para flagcdn · c1/c2/c3 = colores del equipo.
 */

export type Confed = "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";

export interface Team {
  es: string;
  en: string;
  code: string;
  fc?: string;
  confed: Confed;
  c1: string;
  c2: string;
  c3: string;
}

export const TEAMS: Record<string, Team> = {
  Argentina: { es: "Argentina", en: "Argentina", code: "AR", confed: "CONMEBOL", c1: "#6CB4E4", c2: "#FFFFFF", c3: "#F6B40E" },
  Brazil: { es: "Brasil", en: "Brazil", code: "BR", confed: "CONMEBOL", c1: "#FFDF00", c2: "#009739", c3: "#002776" },
  France: { es: "Francia", en: "France", code: "FR", confed: "UEFA", c1: "#0055A4", c2: "#FFFFFF", c3: "#EF4135" },
  Spain: { es: "España", en: "Spain", code: "ES", confed: "UEFA", c1: "#C60B1E", c2: "#FFC400", c3: "#AD1519" },
  Germany: { es: "Alemania", en: "Germany", code: "DE", confed: "UEFA", c1: "#1A1A1A", c2: "#DD0000", c3: "#FFCE00" },
  England: { es: "Inglaterra", en: "England", code: "GB", fc: "gb-eng", confed: "UEFA", c1: "#FFFFFF", c2: "#CF081F", c3: "#1D3D8F" },
  Portugal: { es: "Portugal", en: "Portugal", code: "PT", confed: "UEFA", c1: "#006600", c2: "#FF0000", c3: "#FFD700" },
  Netherlands: { es: "Países Bajos", en: "Netherlands", code: "NL", confed: "UEFA", c1: "#FF6200", c2: "#21468B", c3: "#AE1C28" },
  Croatia: { es: "Croacia", en: "Croatia", code: "HR", confed: "UEFA", c1: "#FF0000", c2: "#FFFFFF", c3: "#171796" },
  Belgium: { es: "Bélgica", en: "Belgium", code: "BE", confed: "UEFA", c1: "#E30613", c2: "#1A1A1A", c3: "#FDDA24" },
  Uruguay: { es: "Uruguay", en: "Uruguay", code: "UY", confed: "CONMEBOL", c1: "#5CBFEB", c2: "#FFFFFF", c3: "#FCD116" },
  Colombia: { es: "Colombia", en: "Colombia", code: "CO", confed: "CONMEBOL", c1: "#FCD116", c2: "#003893", c3: "#CE1126" },
  Ecuador: { es: "Ecuador", en: "Ecuador", code: "EC", confed: "CONMEBOL", c1: "#FFD100", c2: "#0072CE", c3: "#EF3340" },
  Paraguay: { es: "Paraguay", en: "Paraguay", code: "PY", confed: "CONMEBOL", c1: "#D52B1E", c2: "#FFFFFF", c3: "#0038A8" },
  USA: { es: "Estados Unidos", en: "United States", code: "US", confed: "CONCACAF", c1: "#0A3161", c2: "#B31942", c3: "#FFFFFF" },
  Mexico: { es: "México", en: "Mexico", code: "MX", confed: "CONCACAF", c1: "#006847", c2: "#CE1126", c3: "#FFFFFF" },
  Canada: { es: "Canadá", en: "Canada", code: "CA", confed: "CONCACAF", c1: "#FF0000", c2: "#FFFFFF", c3: "#A6192E" },
  Morocco: { es: "Marruecos", en: "Morocco", code: "MA", confed: "CAF", c1: "#C1272D", c2: "#006233", c3: "#FFFFFF" },
  Senegal: { es: "Senegal", en: "Senegal", code: "SN", confed: "CAF", c1: "#00853F", c2: "#FDEF42", c3: "#E31B23" },
  Tunisia: { es: "Túnez", en: "Tunisia", code: "TN", confed: "CAF", c1: "#E70013", c2: "#FFFFFF", c3: "#C8102E" },
  Egypt: { es: "Egipto", en: "Egypt", code: "EG", confed: "CAF", c1: "#CE1126", c2: "#FFFFFF", c3: "#1A1A1A" },
  Algeria: { es: "Argelia", en: "Algeria", code: "DZ", confed: "CAF", c1: "#007229", c2: "#FFFFFF", c3: "#D21034" },
  Ghana: { es: "Ghana", en: "Ghana", code: "GH", confed: "CAF", c1: "#006B3F", c2: "#FCD116", c3: "#CE1126" },
  "Ivory Coast": { es: "Costa de Marfil", en: "Ivory Coast", code: "CI", confed: "CAF", c1: "#F77F00", c2: "#FFFFFF", c3: "#009E60" },
  "Cape Verde": { es: "Cabo Verde", en: "Cape Verde", code: "CV", confed: "CAF", c1: "#003893", c2: "#FFFFFF", c3: "#CF2027" },
  "South Africa": { es: "Sudáfrica", en: "South Africa", code: "ZA", confed: "CAF", c1: "#007749", c2: "#FFB81C", c3: "#DE3831" },
  "DR Congo": { es: "RD del Congo", en: "DR Congo", code: "CD", confed: "CAF", c1: "#007FFF", c2: "#F7D618", c3: "#CE1021" },
  Japan: { es: "Japón", en: "Japan", code: "JP", confed: "AFC", c1: "#0B1F8F", c2: "#FFFFFF", c3: "#BC002D" },
  "South Korea": { es: "Corea del Sur", en: "South Korea", code: "KR", confed: "AFC", c1: "#CD2E3A", c2: "#0047A0", c3: "#1A1A1A" },
  Iran: { es: "Irán", en: "Iran", code: "IR", confed: "AFC", c1: "#239F40", c2: "#FFFFFF", c3: "#DA0000" },
  "Saudi Arabia": { es: "Arabia Saudita", en: "Saudi Arabia", code: "SA", confed: "AFC", c1: "#006C35", c2: "#FFFFFF", c3: "#1A8A4A" },
  Australia: { es: "Australia", en: "Australia", code: "AU", confed: "AFC", c1: "#00843D", c2: "#FFCD00", c3: "#00247D" },
  Qatar: { es: "Catar", en: "Qatar", code: "QA", confed: "AFC", c1: "#8A1538", c2: "#FFFFFF", c3: "#7A1230" },
  Uzbekistan: { es: "Uzbekistán", en: "Uzbekistan", code: "UZ", confed: "AFC", c1: "#1EB53A", c2: "#FFFFFF", c3: "#0099B5" },
  Jordan: { es: "Jordania", en: "Jordan", code: "JO", confed: "AFC", c1: "#007A3D", c2: "#FFFFFF", c3: "#CE1126" },
  Iraq: { es: "Irak", en: "Iraq", code: "IQ", confed: "AFC", c1: "#007A3D", c2: "#FFFFFF", c3: "#CE1126" },
  Switzerland: { es: "Suiza", en: "Switzerland", code: "CH", confed: "UEFA", c1: "#D52B1E", c2: "#FFFFFF", c3: "#FF0000" },
  Austria: { es: "Austria", en: "Austria", code: "AT", confed: "UEFA", c1: "#ED2939", c2: "#FFFFFF", c3: "#C8102E" },
  "Czech Republic": { es: "Rep. Checa", en: "Czechia", code: "CZ", confed: "UEFA", c1: "#D7141A", c2: "#FFFFFF", c3: "#11457E" },
  "Bosnia-Herzegovina": { es: "Bosnia y Herz.", en: "Bosnia & Herz.", code: "BA", confed: "UEFA", c1: "#002F6C", c2: "#FECB00", c3: "#FFFFFF" },
  Scotland: { es: "Escocia", en: "Scotland", code: "GB-SCT", fc: "gb-sct", confed: "UEFA", c1: "#0065BF", c2: "#FFFFFF", c3: "#003B7F" },
  Norway: { es: "Noruega", en: "Norway", code: "NO", confed: "UEFA", c1: "#BA0C2F", c2: "#FFFFFF", c3: "#00205B" },
  Sweden: { es: "Suecia", en: "Sweden", code: "SE", confed: "UEFA", c1: "#006AA7", c2: "#FECC00", c3: "#004B87" },
  Turkey: { es: "Turquía", en: "Türkiye", code: "TR", confed: "UEFA", c1: "#E30A17", c2: "#FFFFFF", c3: "#C8102E" },
  "New Zealand": { es: "Nueva Zelanda", en: "New Zealand", code: "NZ", confed: "OFC", c1: "#FFFFFF", c2: "#1A1A1A", c3: "#C8102E" },
  Haiti: { es: "Haití", en: "Haiti", code: "HT", confed: "CONCACAF", c1: "#00209F", c2: "#D21034", c3: "#FFFFFF" },
  Panama: { es: "Panamá", en: "Panama", code: "PA", confed: "CONCACAF", c1: "#DA121A", c2: "#FFFFFF", c3: "#005293" },
  "Curaçao": { es: "Curazao", en: "Curaçao", code: "CW", confed: "CONCACAF", c1: "#002B7F", c2: "#FFFFFF", c3: "#F9E814" },
};

export function nameEs(key: string | null): string {
  if (!key) return "Por definir";
  return TEAMS[key]?.es ?? key;
}

export function flagUrl(key: string): string | null {
  const t = TEAMS[key];
  if (!t) return null;
  const fc = t.fc || t.code.toLowerCase();
  // Banderas locales (w160 de flagcdn vendorizadas): sirven offline y sin CDN.
  return `${import.meta.env.BASE_URL}flags/${fc}.png`;
}
