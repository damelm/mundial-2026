/* app.js — Mundial 2026. Vanilla JS. Usa i18n.js + themes.js. */
"use strict";

const DATA_URL = "data/fixture.json";
const STORE_TEAM = "wc26-choice";
const STORE_LANG = "wc26-lang";
const REFRESH_MS = 60_000;
const FLAG = (code) => `https://flagcdn.com/${code}.svg`;

// Esqueleto de eliminatorias para completar los 104 partidos.
const KO_ROUNDS = [
  { stage: "R32", n: 16, date: "2026-06-28" },
  { stage: "R16", n: 8, date: "2026-07-04" },
  { stage: "QF", n: 4, date: "2026-07-09" },
  { stage: "SF", n: 2, date: "2026-07-14" },
  { stage: "TP", n: 1, date: "2026-07-18" },
  { stage: "F", n: 1, date: "2026-07-19" },
];

const ACC_TXT = {
  es: ["Expandir todo", "Colapsar todo"], en: ["Expand all", "Collapse all"],
  pt: ["Expandir tudo", "Recolher tudo"], fr: ["Tout déplier", "Tout replier"], ar: ["توسيع الكل", "طي الكل"],
};
const TX = {
  venues: { es: "Sedes", en: "Venues", pt: "Sedes", fr: "Sites", ar: "الملاعب" },
  squad: { es: "Plantel", en: "Squad", pt: "Elenco", fr: "Effectif", ar: "التشكيلة" },
  capacity: { es: "Capacidad", en: "Capacity", pt: "Capacidade", fr: "Capacité", ar: "السعة" },
  map: { es: "Ver en mapa", en: "View on map", pt: "Ver no mapa", fr: "Voir sur la carte", ar: "عرض على الخريطة" },
  squadNote: { es: "Lista parcial (datos abiertos)", en: "Partial list (open data)", pt: "Lista parcial (dados abertos)", fr: "Liste partielle (données ouvertes)", ar: "قائمة جزئية (بيانات مفتوحة)" },
  squadEmpty: { es: "Plantel no disponible por ahora.", en: "Squad not available yet.", pt: "Elenco indisponível por enquanto.", fr: "Effectif indisponible pour l'instant.", ar: "التشكيلة غير متاحة بعد." },
  fAll: { es: "Todos", en: "All", pt: "Todos", fr: "Tous", ar: "الكل" },
  fToday: { es: "Hoy", en: "Today", pt: "Hoje", fr: "Aujourd'hui", ar: "اليوم" },
  fLive: { es: "En vivo", en: "Live", pt: "Ao vivo", fr: "En direct", ar: "مباشر" },
  noToday: { es: "No hay partidos hoy.", en: "No matches today.", pt: "Nenhum jogo hoje.", fr: "Aucun match aujourd'hui.", ar: "لا مباريات اليوم." },
  noLive: { es: "No hay partidos en vivo ahora.", en: "No live matches right now.", pt: "Nenhum jogo ao vivo agora.", fr: "Aucun match en direct.", ar: "لا مباريات مباشرة الآن." },
  addCal: { es: "Agendar", en: "Add to calendar", pt: "Agendar", fr: "Ajouter au calendrier", ar: "أضف إلى التقويم" },
  mascots: { es: "Mascotas oficiales", en: "Official mascots", pt: "Mascotes oficiais", fr: "Mascottes officielles", ar: "التمائم الرسمية" },
  retry: { es: "Reintentar", en: "Retry", pt: "Tentar de novo", fr: "Réessayer", ar: "إعادة المحاولة" },
};
const tw = (m) => m[state.lang] || m.es;

// Posiciones de jugador (vienen en inglés de API-Football / TheSportsDB)
const POS_I18N = {
  gk: { es: "Arquero", en: "Goalkeeper", pt: "Goleiro", fr: "Gardien", ar: "حارس مرمى" },
  df: { es: "Defensor", en: "Defender", pt: "Defensor", fr: "Défenseur", ar: "مدافع" },
  mf: { es: "Mediocampista", en: "Midfielder", pt: "Meio-campista", fr: "Milieu", ar: "لاعب وسط" },
  fw: { es: "Delantero", en: "Forward", pt: "Atacante", fr: "Attaquant", ar: "مهاجم" },
};
function translatePos(pos) {
  if (!pos) return "";
  const p = String(pos).toLowerCase();
  if (p.includes("keeper") || p === "gk") return tw(POS_I18N.gk);
  if (p.includes("defen") || p.includes("back")) return tw(POS_I18N.df);
  if (p.includes("midfield")) return tw(POS_I18N.mf);
  if (p.includes("attack") || p.includes("forward") || p.includes("striker") || p.includes("wing")) return tw(POS_I18N.fw);
  return pos;
}

const state = {
  data: null, team: null, filter: "all", tab: "fixture",
  lang: "es", tz: null, tzCity: "", tzOff: "", dark: false,
  factTimer: null, factIdx: 0, countdownTimer: null, allExpanded: false,
};

/* --------------------------- helpers --------------------------------- */
// Iconos SVG inline (coherentes con el estilo editorial; sin emojis en títulos)
const IC = {
  clock: '<svg class="ic" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.1.8-1.3-4.5-2.7V7z"/></svg>',
  trophy: '<svg class="ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 2.6 1.9 4.7 4.4 5 .6 1.5 1.9 2.6 3.6 2.9V19H8v2h8v-2h-3v-2.1c1.7-.3 3-1.4 3.6-2.9 2.5-.3 4.4-2.4 4.4-5V7a2 2 0 0 0-2-2zM5 9V7h2v4.8C5.8 11.4 5 10.3 5 9zm14 0c0 1.3-.8 2.4-2 2.8V7h2v2z"/></svg>',
  stadium: '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 5c-5 0-9 1.6-9 3.5v7C3 17.4 7 19 12 19s9-1.6 9-3.5v-7C21 6.6 17 5 12 5zm7 10.4c-.5 1-3.3 2.1-7 2.1s-6.5-1.1-7-2.1v-4.6C6.6 11.9 9.2 12.5 12 12.5s5.4-.6 7-1.7v4.6zM12 11C7.9 11 5 9.8 5 9s2.9-2 7-2 7 1.2 7 2-2.9 2-7 2z"/></svg>',
  star: '<svg class="ic" viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="currentColor" d="M12 17.3l6.2 3.7-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.4 14l-1.6 7z"/></svg>',
};
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const L = () => I18N[state.lang] || I18N.es;
function t(path, vars) {
  const val = path.split(".").reduce((o, k) => (o ? o[k] : null), L());
  return vars ? tmpl(val || "", vars) : (val || "");
}
const pick = (o) => (o ? (o[state.lang] ?? o.en ?? o.es) : "");
const theme = () => (state.team ? TEAMS[state.team] : NEUTRAL);
// Contenido localizado de selección (nick/titles/facts): prioriza i18n-content.js (pt/fr/ar), cae a themes.js (es/en)
function localTeam(name, field) {
  const key = name || "NEUTRAL";
  const tr = (typeof TEAM_I18N !== "undefined") && TEAM_I18N[state.lang] && TEAM_I18N[state.lang][key];
  if (tr && tr[field] != null) return tr[field];
  const src = name ? TEAMS[name] : NEUTRAL;
  const o = src[field];
  return o == null ? "" : (typeof o === "object" && !Array.isArray(o) ? (o[state.lang] ?? o.en ?? o.es) : (o.es || o.en || o));
}
function dispName(name) {
  if (!name) return pick({ es: NEUTRAL.es, en: NEUTRAL.en });
  const tm = TEAMS[name];
  return tm ? pick({ es: tm.es, en: tm.en }) : name;
}
function flagImg(name, cls) {
  const code = flagCodeOf(name);
  if (code) return `<img class="${cls}" src="${FLAG(code)}" alt="${dispName(name)}" loading="lazy" onerror="this.style.visibility='hidden'">`;
  return `<span class="${cls} emoji">⚽</span>`;
}

/* ---- color: marca legible del país (texto blanco siempre contrasta) -- */
function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgbToHex(r, g, b) { return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join(""); }
function lum(hex) { const a = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function mixHex(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }
function adjustToLum(hex, target) { let c = hex, i = 0; while (lum(c) > target + 0.03 && i++ < 12) c = mixHex(c, "#000000", 0.1); i = 0; while (lum(c) < target - 0.03 && i++ < 12) c = mixHex(c, "#ffffff", 0.09); return c; }
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h * 360, s, l]; }
function hslToHex(h, s, l) { h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; let r, g, b; if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]; return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255); }
function brandColors(tm) {
  const cands = [tm.c1, tm.c2, tm.c3];
  const ideal = 0.26; // elige el color más "vibrante medio" (evita blancos/amarillos y negros)
  const usable = cands.filter((c) => lum(c) >= 0.05);
  const pool = usable.length ? usable : cands;
  const hue = pool.reduce((best, c) => (Math.abs(lum(c) - ideal) < Math.abs(lum(best) - ideal) ? c : best));
  const brand = adjustToLum(hue, 0.2); // relleno con texto blanco (legible en claro)
  const [h, s0] = rgbToHsl(hexToRgb(hue));
  const s = Math.max(s0, 0.62); // mantener saturación → acento vibrante (no pastel)
  const accent = state.dark ? hslToHex(h, s, 0.66) : hslToHex(h, s, 0.40); // texto/acento legible sobre la superficie del modo
  const vivid = state.dark ? hslToHex(h, s, 0.60) : hslToHex(h, s, 0.50); // barra/indicador vibrante (sin texto encima)
  const soft = state.dark ? mixHex(accent, "#202127", 0.84) : mixHex(brand, "#ffffff", 0.9);
  const onAccent = state.dark ? "#14130f" : "#ffffff"; // texto sobre un relleno de --brand-accent
  return { brand, accent, vivid, onAccent, brand2: mixHex(brand, "#ffffff", 0.18), soft };
}

function parseUTC(ts) {
  if (!ts) return null;
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + "Z";
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const tzOpt = () => (state.tz ? { timeZone: state.tz } : {});
const fmtTime = (d) => d.toLocaleTimeString(state.lang, { hour: "2-digit", minute: "2-digit", ...tzOpt() });
const fmtDayLong = (d) => d.toLocaleDateString(state.lang, { weekday: "long", day: "numeric", month: "long", ...tzOpt() });
const fmtDayShort = (d) => d.toLocaleDateString(state.lang, { day: "2-digit", month: "short", ...tzOpt() });
const dayKey = (d) => d.toLocaleDateString("en-CA", tzOpt());

function classifyStatus(m) {
  const s = (m.status || "").toUpperCase();
  const fin = ["FT", "AET", "PEN", "MATCH FINISHED", "FINISHED", "AP"];
  const live = ["1H", "2H", "HT", "ET", "LIVE", "IN PLAY", "PLAYING", "BT"];
  if (fin.some((x) => s.includes(x))) return "ft";
  if (live.some((x) => s.includes(x))) return "live";
  if (m.homeScore != null && m.awayScore != null && s !== "NS" && s !== "") return "ft";
  return "ns";
}

/* --------------------------- carga ----------------------------------- */
async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j && Array.isArray(j.matches) && j.matches.length) return j;
    throw new Error("fixture.json vacío");
  } catch (e) {
    return loadFromBackup(); // respaldo: TheSportsDB directo
  }
}
// Fuente de respaldo: si data/fixture.json no está disponible, baja la fase de grupos en vivo.
async function loadFromBackup() {
  const B = "https://www.thesportsdb.com/api/v1/json/3";
  const byId = new Map();
  for (const r of [1, 2, 3]) {
    const d = await fetch(`${B}/eventsround.php?id=4429&r=${r}&s=2026`).then((x) => x.json()).catch(() => null);
    ((d && d.events) || []).forEach((ev) => { if (!ev.dateEvent || ev.dateEvent >= "2026-06-01") byId.set(ev.idEvent, normalizeBackup(ev)); });
  }
  const matches = [...byId.values()].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  if (!matches.length) throw new Error("respaldo vacío");
  return { updatedAt: new Date().toISOString(), source: "TheSportsDB (respaldo)", count: matches.length, matches, backup: true };
}
function setFooterUpdated(d) {
  const upd = parseUTC(d.updatedAt);
  const tag = d.backup ? " · ⚠ respaldo" : "";
  $("#footer-updated").textContent = d && d.updatedAt ? `${t("updated")}: ${upd ? upd.toLocaleString(state.lang, tzOpt()) : d.updatedAt} · ${d.count} ${t("matches")}${tag}` : "";
}
function showLoadError() {
  $("#status").innerHTML = `<div class="error">${t("loadError")}</div><button class="btn-primary" id="retry-btn" type="button">${tw(TX.retry)}</button>`;
}
async function retryLoad() {
  $("#status").innerHTML = `<div class="spinner"></div>${t("loading")}`;
  renderSkeletons();
  try {
    const data = await loadData();
    state.data = data; state.sig = JSON.stringify(data.matches);
    $("#status").innerHTML = "";
    setFooterUpdated(data); render();
  } catch { showLoadError(); }
}
function normalizeBackup(ev) {
  const num = (v) => (v == null || v === "" ? null : Number(v));
  return {
    id: ev.idEvent, round: parseInt(ev.intRound, 10) || 0, stage: "GROUP", stageName: "",
    group: ev.strGroup ? ev.strGroup.replace(/group\s*/i, "").trim() : null,
    date: ev.dateEvent || null, time: ev.strTime || null,
    timestamp: ev.strTimestamp || (ev.dateEvent ? `${ev.dateEvent}T${ev.strTime || "00:00:00"}` : null),
    home: ev.strHomeTeam || "Por definir", away: ev.strAwayTeam || "Por definir",
    homeBadge: ev.strHomeTeamBadge || null, awayBadge: ev.strAwayTeamBadge || null,
    homeScore: num(ev.intHomeScore), awayScore: num(ev.intAwayScore),
    status: ev.strStatus || "NS", venue: ev.strVenue || null, city: ev.strCity || null,
  };
}
async function detectGeo() {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const j = await res.json();
    return { code: j.country_code || null, tz: j.timezone || null, off: j.utc_offset || null };
  } catch { return null; }
}

/* --------------------------- zona horaria ---------------------------- */
function setTimezone(tz, off) {
  if (tz) {
    state.tz = tz;
    state.tzCity = tz.split("/").pop().replace(/_/g, " ");
    if (off && /^[+-]\d{4}$/.test(off)) state.tzOff = `UTC${off.slice(0, 3)}:${off.slice(3)}`;
    else state.tzOff = offsetLabelFor(tz);
  } else {
    state.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    state.tzCity = state.tz ? state.tz.split("/").pop().replace(/_/g, " ") : "";
    const m = -new Date().getTimezoneOffset();
    const sg = m >= 0 ? "+" : "-";
    state.tzOff = `UTC${sg}${String(Math.floor(Math.abs(m) / 60)).padStart(2, "0")}:${String(Math.abs(m) % 60).padStart(2, "0")}`;
  }
}
function offsetLabelFor(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
    const o = parts.find((p) => p.type === "timeZoneName");
    return o ? o.value.replace("GMT", "UTC") : "";
  } catch { return ""; }
}

/* --------------------------- i18n estático --------------------------- */
function applyI18n() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = L().dir || "ltr";
  $("#lang-current").textContent = state.lang.toUpperCase();
  $("#fact-label").textContent = t("didYouKnow");
  $("#tab-fixture").textContent = t("tabs.fixture");
  $("#tab-grupos").textContent = t("tabs.groups");
  $("#tab-bracket").textContent = t("tabs.bracket");
  $("#tab-seleccion").textContent = t("tabs.team");
  $("#tab-sedes").textContent = tw(TX.venues);
  $("#fchip-all").textContent = tw(TX.fAll);
  $("#fchip-today").textContent = tw(TX.fToday);
  $("#fchip-live").textContent = tw(TX.fLive);
  updateToggleAllLabel();
  $("#selector-title").textContent = t("chooseTeam");
  $("#country-search").placeholder = t("searchCountry");
  $("#neutral-name").textContent = t("neutralMode");
  $("#footer-made").innerHTML = `${t("madeWith")} · <a href="https://www.thesportsdb.com" target="_blank" rel="noopener">TheSportsDB</a>`;
  setTzHint();
  buildLangChips();
  if (state.updTabsFade) state.updTabsFade(); // las etiquetas cambian de ancho según idioma
}
function setTzHint() {
  $("#tz-hint").innerHTML = `${IC.clock} ${t("tzHint", { zone: state.tzCity || "—", off: state.tzOff || "" })}`;
}

/* --------------------------- temática -------------------------------- */
function applyTheme(name) {
  state.team = name;
  const tm = theme();
  const root = document.documentElement;
  root.style.setProperty("--c1", tm.c1);
  root.style.setProperty("--c2", tm.c2);
  root.style.setProperty("--c3", tm.c3);
  const b = brandColors(tm);
  root.style.setProperty("--brand", b.brand);
  root.style.setProperty("--brand-accent", b.accent);
  root.style.setProperty("--brand-vivid", b.vivid);
  root.style.setProperty("--on-accent", b.onAccent);
  root.style.setProperty("--brand-2", b.brand2);
  root.style.setProperty("--brand-soft", b.soft);
  root.style.setProperty("--on-brand", "#ffffff");
  $("#meta-theme").setAttribute("content", b.brand);

  const code = name ? flagCodeOf(name) : null;
  $("#hero-confed").textContent = tm.confed;
  $("#hero-title").textContent = name ? dispName(name) : t("appTitle");
  $("#hero-nick").textContent = localTeam(state.team, "nick");
  $("#hero-titles").textContent = localTeam(state.team, "titles");

  const cbf = $("#country-btn-flag");
  if (code) { cbf.src = FLAG(code); cbf.style.display = ""; } else { cbf.style.display = "none"; }
  $("#country-btn-text").textContent = name ? dispName(name) : t("chooseCountry");

  syncFilterChips();

  startFacts(localTeam(state.team, "facts"));
  markActiveCountry();
  render();
}
function startFacts(facts) {
  clearInterval(state.factTimer);
  const el = $("#fact-text");
  el.textContent = facts[0];
  state.factIdx = 1;
  if (facts.length > 1) {
    state.factTimer = setInterval(() => {
      el.classList.add("fading");
      setTimeout(() => { el.textContent = facts[state.factIdx % facts.length]; state.factIdx++; el.classList.remove("fading"); }, 300);
    }, 5500);
  }
}

/* --------------------------- render ---------------------------------- */
function render() {
  if (!state.data) return;
  renderActivePanel();   // solo la pestaña visible (evita cargar todas las imágenes juntas)
  renderCountdown();
}
function renderActivePanel() {
  if (!state.data) return;
  if (state.tab === "fixture") renderFixture();
  else if (state.tab === "grupos") renderGroups();
  else if (state.tab === "bracket") renderBracket();
  else if (state.tab === "seleccion") renderSeleccion();
  else if (state.tab === "sedes") renderStadiums();
}

function teamCell(name, badge) {
  // Prefiere el escudo de TheSportsDB; si falla, bandera.
  const code = flagCodeOf(name);
  const fb = code ? FLAG(code) : "";
  if (badge) return `<img class="team-badge" src="${badge}" alt="${dispName(name)}" loading="lazy" onerror="this.onerror=null;this.className='team-flag';this.src='${fb}'">`;
  if (code) return `<img class="team-flag" src="${fb}" alt="${dispName(name)}" loading="lazy">`;
  return `<span class="team-flag emoji">⚽</span>`;
}
// Partido EN VIVO → tarjeta "modo transmisión": grafito plano, marcador grande.
// Siempre oscura (independiente del tema) para que lo importante grite solo.
function liveCard(m, isMine) {
  const grp = m.group ? t("group", { g: m.group }) : stageLabel(m);
  const venue = m.venue ? ` · ${m.venue}` : "";
  const raw = (m.status || "").toUpperCase();
  const phase = /^[A-Z0-9+']{1,3}$/.test(raw) ? `<span class="ltv-phase">${raw}</span>` : "";
  return `<article class="match-live reveal ${isMine ? "mine" : ""}">
    <div class="ltv-top"><span class="ltv-badge"><span class="ltv-dot"></span>${t("status.live")}</span>${phase}<span class="ltv-meta">${grp}${venue}</span></div>
    <div class="ltv-row">
      <div class="ltv-team">${teamCell(m.home, m.homeBadge)}<span class="ltv-name">${dispName(m.home)}</span></div>
      <div class="ltv-score">${m.homeScore ?? 0}<span class="ltv-sep">–</span>${m.awayScore ?? 0}</div>
      <div class="ltv-team">${teamCell(m.away, m.awayBadge)}<span class="ltv-name">${dispName(m.away)}</span></div>
    </div></article>`;
}
function matchCard(m) {
  const d = parseUTC(m.timestamp);
  const st = classifyStatus(m);
  const isMine = state.team && (m.home === state.team || m.away === state.team);
  if (st === "live") return liveCard(m, isMine);
  let center;
  if (st === "ns") {
    center = `<div class="match-time">${d ? fmtTime(d) : "--:--"}</div><div class="match-date-sm">${d ? fmtDayShort(d) : ""}</div><span class="match-status st-ns">${t("status.ns")}</span>`;
  } else {
    const score = `${m.homeScore ?? "-"}<span class="sep">:</span>${m.awayScore ?? "-"}`;
    const label = st === "live" ? `<span class="match-status st-live">● ${t("status.live")}</span>` : `<span class="match-status st-ft">${t("status.ft")}</span>`;
    center = `<div class="match-score">${score}</div>${label}`;
  }
  const grp = m.group ? `<span class="match-grouptag">${t("group", { g: m.group })}</span>` : stageLabel(m);
  const venue = m.venue ? ` · ${m.venue}${m.city ? ", " + m.city.split(",")[0] : ""}` : "";
  const cal = st === "ns" ? `<button class="cal-btn" data-mid="${m.id}" aria-label="${tw(TX.addCal)}" title="${tw(TX.addCal)}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V9h14v10zM7 11h5v5H7z"/></svg></button>` : "";
  return `<article class="match reveal ${isMine ? "mine" : ""} ${st === "live" ? "live" : ""}">
    <div class="match-meta">${grp}${venue}${cal}</div>
    <div class="team-side home">${teamCell(m.home, m.homeBadge)}<span class="team-name">${dispName(m.home)}</span></div>
    <div class="match-center">${center}</div>
    <div class="team-side away">${teamCell(m.away, m.awayBadge)}<span class="team-name">${dispName(m.away)}</span></div></article>`;
}
function stageLabel(m) {
  if (m.stage === "GROUP") return t("stages.GROUP", { r: m.round });
  return t(`stages.${m.stage}`) || m.stageName || t("knockouts");
}

/* --------------------------- acordeón -------------------------------- */
function accordionEl(key, headHtml, innerHtml, open, highlight, cls = "") {
  return `<section class="acc ${cls} ${open ? "open" : ""} ${highlight ? "acc-hl" : ""}" data-key="${key}">
    <button class="acc-head" type="button" aria-expanded="${open ? "true" : "false"}">
      ${headHtml}
      <svg class="acc-chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
    </button>
    <div class="acc-body"><div class="acc-inner">${innerHtml}</div></div>
  </section>`;
}
function miniFlags(matches, max = 7) {
  const seen = [];
  for (const m of matches) for (const tn of [m.home, m.away]) if (!seen.includes(tn)) seen.push(tn);
  const shown = seen.slice(0, max).map((n) => { const c = flagCodeOf(n); return c ? `<img src="${FLAG(c)}" alt="">` : ""; }).join("");
  const extra = seen.length > max ? `<span class="mini-more">+${seen.length - max}</span>` : "";
  return `<span class="mini-flags">${shown}${extra}</span>`;
}
function nextOpenDayKey(keys, byDay) {
  const now = Date.now();
  for (const k of keys) if (byDay[k].some((m) => { const d = parseUTC(m.timestamp); return d && d.getTime() >= now; })) return k;
  return keys[keys.length - 1] || null;
}

function renderFixture() {
  const cont = $("#fixture-list");
  const todayKey = dayKey(new Date());
  let matches = [...state.data.matches];
  if (state.filter === "today") matches = matches.filter((m) => { const d = parseUTC(m.timestamp); return d && dayKey(d) === todayKey; });
  else if (state.filter === "live") matches = matches.filter((m) => classifyStatus(m) === "live");
  if (!matches.length) {
    const msg = state.filter === "today" ? tw(TX.noToday) : state.filter === "live" ? tw(TX.noLive) : t("noMatches");
    cont.innerHTML = `<div class="status">${msg}</div>`; return;
  }
  const byDay = {};
  for (const m of matches) { const d = parseUTC(m.timestamp); (byDay[d ? dayKey(d) : "zzz"] ||= []).push(m); }
  const keys = Object.keys(byDay).sort();
  const openKey = nextOpenDayKey(keys, byDay);
  const expandAll = state.allExpanded || state.filter !== "all"; // los filtros (hoy/vivo/mi) abren todo
  let html = "";
  for (const k of keys) {
    const day = byDay[k].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    const s = parseUTC(day[0].timestamp);
    const myDay = !!(state.team && day.some((m) => m.home === state.team || m.away === state.team));
    const isOpen = expandAll || k === openKey;
    const head = `<div class="acc-titles"><div class="acc-title">${s ? fmtDayLong(s) : "—"}</div>
      <div class="acc-sub">${day.length} ${t("matchesLabel")}${myDay ? ' <span class="acc-star">★</span>' : ""} ${miniFlags(day)}</div></div>`;
    html += accordionEl(k, head, day.map(matchCard).join(""), isOpen, myDay, "acc-day");
  }
  cont.innerHTML = html;
  scrollReveal(cont);
}

/* --------------------------- grupos ---------------------------------- */
function computeStandings() {
  const groups = {};
  for (const m of state.data.matches) {
    if (m.stage !== "GROUP" || !m.group) continue;
    const g = (groups[m.group] ||= {});
    for (const tn of [m.home, m.away]) g[tn] ||= { team: tn, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, badge: null };
    if (m.homeBadge) g[m.home].badge = m.homeBadge;
    if (m.awayBadge) g[m.away].badge = m.awayBadge;
    if (classifyStatus(m) === "ns" || m.homeScore == null || m.awayScore == null) continue;
    const H = g[m.home], A = g[m.away];
    H.pj++; A.pj++; H.gf += m.homeScore; H.gc += m.awayScore; A.gf += m.awayScore; A.gc += m.homeScore;
    if (m.homeScore > m.awayScore) { H.g++; A.p++; H.pts += 3; }
    else if (m.homeScore < m.awayScore) { A.g++; H.p++; A.pts += 3; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
  }
  return groups;
}
function renderGroups() {
  const cont = $("#grupos-list");
  const groups = computeStandings();
  const keys = Object.keys(groups).sort();
  if (!keys.length) { cont.innerHTML = `<div class="status">${t("noMatches")}</div>`; return; }
  const TH = L().th;
  const teamWord = state.lang === "es" ? "Equipo" : state.lang === "pt" ? "Seleção" : state.lang === "fr" ? "Équipe" : state.lang === "ar" ? "المنتخب" : "Team";
  const matchesByGroup = {};
  state.data.matches.forEach((m) => { if (m.stage === "GROUP" && m.group) (matchesByGroup[m.group] ||= []).push(m); });
  let html = "";
  for (const g of keys) {
    const rows = Object.values(groups[g]).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || dispName(a.team).localeCompare(dispName(b.team), state.lang));
    const myGroup = !!(state.team && rows.some((r) => r.team === state.team));
    const flags = rows.map((r) => { const c = flagCodeOf(r.team); return c ? `<img src="${FLAG(c)}" alt="${dispName(r.team)}" loading="lazy">` : `<span class="gf-x">⚽</span>`; }).join("");
    const head = `<div class="grp-head-main"><span class="grp-letter">${g}</span>
      <div class="grp-headinfo"><div class="grp-label">${t("group", { g })}</div><div class="grp-flags">${flags}</div></div></div>`;
    let inner = `<table class="table"><thead><tr><th class="pos"></th><th class="team-cell">${teamWord}</th>
      <th>${TH.pj}</th><th>${TH.g}</th><th>${TH.e}</th><th>${TH.p}</th><th>${TH.dif}</th><th>${TH.pts}</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const dif = r.gf - r.gc;
      const code = flagCodeOf(r.team);
      const img = r.badge ? `<img src="${r.badge}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${code ? FLAG(code) : ""}'">`
        : (code ? `<img src="${FLAG(code)}" alt="" loading="lazy">` : `<span>⚽</span>`);
      const me = r.team === state.team ? " is-me" : "";
      inner += `<tr class="${i < 2 ? "qualify" : ""}${me}"><td class="pos">${i + 1}</td>
        <td class="team-cell"><div class="team-cell-inner">${img}<span>${dispName(r.team)}</span></div></td>
        <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td><td>${dif > 0 ? "+" + dif : dif}</td><td class="pts">${r.pts}</td></tr>`;
    });
    inner += `</tbody></table><div class="group-legend">${t("groupLegend")}</div>`;
    const gms = (matchesByGroup[g] || []).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")).map(matchCard).join("");
    if (gms) inner += `<div class="grp-matches">${gms}</div>`;
    html += accordionEl(g, head, inner, state.allExpanded || myGroup, myGroup, "acc-grp");
  }
  cont.innerHTML = html;
  scrollReveal(cont);
}

/* --------------------------- bracket (104) --------------------------- */
const WINNER_W = { es: "Ganador", en: "Winner", pt: "Vencedor", fr: "Vainqueur", ar: "الفائز" };
const LOSER_W = { es: "Perdedor", en: "Loser", pt: "Perdedor", fr: "Perdant", ar: "الخاسر" };
let _combos = null;
function loadCombosOnce() {
  if (_combos !== null) return;
  _combos = [];
  fetch("data/combos495.json").then((r) => r.json()).then((j) => { _combos = j; if (state.tab === "bracket") renderBracket(); }).catch(() => { _combos = []; });
}
function bracketProjection() {
  const st = computeStandings();
  const cmp = (a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || dispName(a.team).localeCompare(dispName(b.team), state.lang);
  const rowsByG = {}, done = {};
  let complete = 0;
  for (const g of Object.keys(st)) {
    const rows = Object.values(st[g]).sort(cmp);
    rowsByG[g] = rows;
    done[g] = rows.length >= 4 && rows.every((r) => r.pj >= 3);
    if (done[g]) complete++;
  }
  const winner = (g) => (done[g] && rowsByG[g][0] ? rowsByG[g][0].team : null);
  const runner = (g) => (done[g] && rowsByG[g][1] ? rowsByG[g][1].team : null);
  const thirds = Object.keys(rowsByG).map((g) => (rowsByG[g][2] ? { grp: g, ...rowsByG[g][2] } : null)).filter(Boolean);
  thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || a.grp.localeCompare(b.grp));
  const best8 = thirds.slice(0, 8).map((x) => x.grp).sort();
  const thirdAssign = {};
  if (complete === 12 && Array.isArray(_combos) && _combos.length) {
    const row = _combos.find((c) => c.qualified_third_groups === best8.join(""));
    if (row) for (const [k, v] of Object.entries(row.assign)) thirdAssign[parseInt(k.match(/M(\d+)/)[1], 10)] = v.replace("3", "");
  }
  return { winner, runner, thirdAssign, rowsByG, complete };
}
function resolveSlot(slot, matchNo, proj) {
  if (slot.t === "W") { const tm = proj.winner(slot.g); return tm ? { team: tm } : { label: `1.º ${slot.g}` }; }
  if (slot.t === "R") { const tm = proj.runner(slot.g); return tm ? { team: tm } : { label: `2.º ${slot.g}` }; }
  const tg = proj.thirdAssign[matchNo];
  if (tg && proj.rowsByG[tg] && proj.rowsByG[tg][2]) return { team: proj.rowsByG[tg][2].team };
  return { label: `3.º (${slot.from.join("/")})` };
}
function bkRow(res, score, win) {
  const flag = res.team ? teamCellFlag(res.team) : '<span class="bk-flag-ph"></span>';
  const nm = res.team ? `<span class="bk-nm">${dispName(res.team)}</span>` : `<span class="bk-nm bk-tbd">${res.label}</span>`;
  return `<div class="bk-row ${win ? "bk-win" : ""}">${flag}${nm}<span class="bk-sc">${score ?? ""}</span></div>`;
}
function bkMatch(home, away, m, cls = "") {
  const hs = m && m.homeScore != null ? m.homeScore : null;
  const as = m && m.awayScore != null ? m.awayScore : null;
  const st = m ? classifyStatus(m) : "ns";
  return `<div class="bk-match ${st === "live" ? "bk-live" : ""} ${cls}">${bkRow(home, hs, st === "ft" && hs > as)}${bkRow(away, as, st === "ft" && as > hs)}</div>`;
}
// Bracket visual: columnas conectadas con scroll horizontal (16avos → final).
function renderBracket() {
  const cont = $("#bracket-content");
  loadCombosOnce();
  const proj = bracketProjection();
  const koByStage = {};
  state.data.matches.filter((m) => m.stage !== "GROUP").forEach((m) => (koByStage[m.stage] ||= []).push(m));
  for (const k in koByStage) koByStage[k].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  // Orden visual de cada columna derivado del árbol (los pares alimentan al de la derecha)
  const byM = {};
  [...BRACKET_TREE.R16, ...BRACKET_TREE.QF, ...BRACKET_TREE.SF].forEach((n) => (byM[n.m] = n));
  const sfO = BRACKET_TREE.F.f.slice();
  const qfO = sfO.flatMap((m) => byM[m].f);
  const r16O = qfO.flatMap((m) => byM[m].f);
  const r32O = r16O.flatMap((m) => byM[m].f);
  const r32ByM = {}; R32_MATCHES.forEach((x) => (r32ByM[x.m] = x));
  const word = (st) => (st === "TP" ? (LOSER_W[state.lang] || LOSER_W.es) : (WINNER_W[state.lang] || WINNER_W.es));
  const dateOf = (st) => { const r = KO_ROUNDS.find((x) => x.stage === st); const d = r && parseUTC(r.date + "T18:00:00"); return d ? fmtDayShort(d) : ""; };

  const cellsFor = (st) => {
    const real = koByStage[st] || [];
    if (real.length) return real.map((m) => bkMatch({ team: m.home }, { team: m.away }, m));
    if (st === "R32") return r32O.map((n) => { const rm = r32ByM[n]; return bkMatch(resolveSlot(rm.home, rm.m, proj), resolveSlot(rm.away, rm.m, proj), null); });
    const order = { R16: r16O, QF: qfO, SF: sfO }[st];
    return order.map((n) => bkMatch({ label: `${word(st)} P${byM[n].f[0]}` }, { label: `${word(st)} P${byM[n].f[1]}` }, null));
  };
  const colHtml = (st, cells, paired) => {
    let body = "";
    if (paired) for (let i = 0; i < cells.length; i += 2) body += `<div class="bk-pair">${cells[i]}${cells[i + 1] || ""}</div>`;
    else body = cells.join("");
    return `<div class="bk-col"><h3>${t(`stages.${st}`)}</h3><span class="ko-date">${dateOf(st)}</span><div class="bk-col-body">${body}</div></div>`;
  };

  let html = `<div class="bracket-head"><div class="big">${IC.trophy} ${t("knockouts")}</div><p>${t("bracketSub")}</p></div><div class="bracket-scroll"><div class="bracket-grid">`;
  for (const st of ["R32", "R16", "QF", "SF"]) html += colHtml(st, cellsFor(st), true);
  const fReal = (koByStage.F || [])[0], tpReal = (koByStage.TP || [])[0];
  const fCell = fReal ? bkMatch({ team: fReal.home }, { team: fReal.away }, fReal, "beam bk-final")
    : bkMatch({ label: `${word("F")} P${BRACKET_TREE.F.f[0]}` }, { label: `${word("F")} P${BRACKET_TREE.F.f[1]}` }, null, "beam bk-final");
  const tpCell = tpReal ? bkMatch({ team: tpReal.home }, { team: tpReal.away }, tpReal)
    : bkMatch({ label: `${word("TP")} P${BRACKET_TREE.TP.f[0]}` }, { label: `${word("TP")} P${BRACKET_TREE.TP.f[1]}` }, null);
  html += `<div class="bk-col"><h3>${t("stages.F")}</h3><span class="ko-date">${dateOf("F")}</span>
    <div class="bk-col-body bk-col-final"><div>${fCell}</div>
    <div class="bk-tp"><h4>${t("stages.TP")}</h4><span class="ko-date">${dateOf("TP")}</span>${tpCell}</div></div></div>`;
  html += `</div></div>`;
  cont.innerHTML = html;
}
function teamCellFlag(name) {
  const code = flagCodeOf(name);
  return code ? `<img src="${FLAG(code)}" alt="${dispName(name)}" loading="lazy">` : `<span class="tbd-badge">⚽</span>`;
}

/* --------------------------- mi selección ---------------------------- */
function renderSeleccion() {
  const cont = $("#seleccion-content");
  if (!state.team) {
    cont.innerHTML = `<div class="sel-empty"><div class="big">${IC.star}</div><p>${t("pickToSee")}</p>
      <p style="margin-top:14px"><button class="country-btn" onclick="document.getElementById('open-selector').click()">${t("chooseCountry")}</button></p></div>`;
    return;
  }
  const tm = TEAMS[state.team];
  const code = flagCodeOf(state.team);
  const mine = state.data.matches.filter((m) => m.home === state.team || m.away === state.team).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  cont.innerHTML = `
    <div class="sel-hero">
      ${code ? `<img class="sel-flag" src="${FLAG(code)}" alt="${dispName(state.team)}">` : ""}
      <div class="sel-name">${dispName(state.team)}</div>
      <div class="sel-nick">${localTeam(state.team, "nick")}</div>
      <div class="sel-chips"><span class="sel-chip">${tm.confed}</span><span class="sel-chip">${localTeam(state.team, "titles")}</span></div>
    </div>
    <div class="sel-section-title">${t("trivia")}</div>
    <div class="sel-facts">${localTeam(state.team, "facts").map((f) => `<div class="sel-fact reveal">${f}</div>`).join("")}</div>
    <div class="sel-section-title">${t("matchesOf", { team: dispName(state.team) })}</div>
    <div class="fixture-list">${mine.length ? mine.map(matchCard).join("") : `<div class="status">${t("noMatches")}</div>`}</div>
    <div class="sel-section-title">${tw(TX.squad)}</div>
    <div id="squad"><div class="status"><div class="spinner"></div></div></div>`;
  scrollReveal(cont);
  loadSquad(state.team);
}

/* --------------------------- plantel + sedes ------------------------- */
const _squadCache = {};
let _squadsFile = null;
async function loadSquadsFile() {
  if (_squadsFile) return _squadsFile;
  try { _squadsFile = await fetch("data/squads.json?t=" + Math.floor(Date.now() / 3600000)).then((r) => (r.ok ? r.json() : {})); }
  catch { _squadsFile = {}; }
  return _squadsFile;
}
async function loadSquad(name) {
  const cont = $("#squad"); if (!cont) return;
  // 1) Plantel completo (26) desde squads.json (API-Football vía Action)
  const file = await loadSquadsFile();
  if (file[name] && file[name].players && file[name].players.length) {
    if ($("#squad")) renderSquad($("#squad"), file[name].players, true);
    return;
  }
  // 2) Respaldo: TheSportsDB (~10) mientras squads.json se completa
  const id = TEAM_IDS[name];
  if (!id) { cont.innerHTML = `<div class="status">${tw(TX.squadEmpty)}</div>`; return; }
  if (_squadCache[id]) return renderSquad(cont, _squadCache[id], false);
  try {
    const j = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${id}`).then((r) => r.json());
    _squadCache[id] = ((j && j.player) || []).map((p) => ({ name: p.strPlayer, number: p.strNumber, pos: p.strPosition, photo: p.strCutout || p.strThumb }));
    if ($("#squad")) renderSquad($("#squad"), _squadCache[id], false);
  } catch { if ($("#squad")) $("#squad").innerHTML = `<div class="status">${tw(TX.squadEmpty)}</div>`; }
}
function renderSquad(cont, players, full) {
  if (!players.length) { cont.innerHTML = `<div class="status">${tw(TX.squadEmpty)}</div>`; return; }
  const note = full ? "" : `<p class="squad-note">${tw(TX.squadNote)}</p>`;
  cont.innerHTML = `<div class="squad-grid">${players.map((p) => {
    const img = p.photo || "";
    return `<div class="player reveal"><div class="player-photo">${img ? `<img src="${img}" alt="${p.name}" loading="lazy" onerror="this.remove()">` : "⚽"}${p.number ? `<span class="player-num">${p.number}</span>` : ""}</div><div class="player-name">${p.name}</div><div class="player-pos">${translatePos(p.pos)}</div></div>`;
  }).join("")}</div>${note}`;
  scrollReveal(cont);
}

function renderStadiums() {
  const cont = $("#sedes-content");
  const cflag = { "México": "mx", "Estados Unidos": "us", "Canadá": "ca" };
  let html = "";
  // Mascotas oficiales (Maple/Zayu/Clutch)
  if (typeof MASCOTS !== "undefined" && MASCOTS.length) {
    html += `<div class="sel-section-title" style="margin-top:14px">${tw(TX.mascots)}</div><div class="mascots">`;
    MASCOTS.forEach((m) => {
      html += `<div class="mascot reveal" style="--mc:${m.color}">
        <div class="mascot-top">${m.flag ? `<img class="mascot-flag" src="${FLAG(m.flag)}" alt="${m.country}" loading="lazy">` : ""}<div class="mascot-name">${m.name}</div></div>
        <div class="mascot-meta">${m.animal} · ${m.country}${m.pos ? " · " + m.pos : ""}</div>
        ${state.lang === "es" ? `<p class="mascot-desc">${m.desc}</p>` : ""}</div>`;
    });
    html += `</div>`;
  }
  html += `<div class="sel-section-title">${IC.stadium} ${tw(TX.venues)}</div><div class="venues-list">`;
  STADIUMS.forEach((s) => {
    const fc = cflag[s.country] || "";
    const maps = `https://www.google.com/maps?q=${s.lat},${s.lon}`;
    html += `<div class="venue reveal">
      ${s.photo ? `<img class="venue-photo" src="${s.photo}" alt="${s.name}" loading="lazy" onerror="this.remove()">` : ""}
      <div class="venue-body">${fc ? `<img class="venue-flag" src="${FLAG(fc)}" alt="${s.country}">` : ""}
      <div class="venue-main"><div class="venue-name">${s.name}</div>
        <div class="venue-city">${s.city} · ${s.country}</div>
        <div class="venue-meta"><span class="venue-cap">${tw(TX.capacity)}: ${s.capacity.toLocaleString(state.lang)}</span>${s.note ? `<span class="venue-note">${s.note}</span>` : ""}</div></div>
      <a class="venue-map" href="${maps}" target="_blank" rel="noopener" title="${tw(TX.map)}"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg></a></div></div>`;
  });
  cont.innerHTML = html + `</div><p class="venue-credit">Fotos: <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a></p>`;
  scrollReveal(cont);
}

/* --------------------------- countdown ------------------------------- */
function renderCountdown() {
  clearInterval(state.countdownTimer);
  const box = $("#countdown");
  const now = Date.now();
  let pool = state.data.matches.filter((m) => { const d = parseUTC(m.timestamp); return d && d.getTime() > now && classifyStatus(m) === "ns"; });
  if (state.team) { const mn = pool.filter((m) => m.home === state.team || m.away === state.team); if (mn.length) pool = mn; }
  pool.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  const next = pool[0];
  if (!next) { box.hidden = true; return; }
  const d = parseUTC(next.timestamp);
  box.hidden = false;
  $("#countdown-label").textContent = (state.team && (next.home === state.team || next.away === state.team)) ? t("nextMatchOf", { team: dispName(state.team) }) : t("nextMatchWC");
  $("#countdown-teams").innerHTML = `${flagImg(next.home, "fl")}<span>${dispName(next.home)}</span> ${t("vs")} <span>${dispName(next.away)}</span>${flagImg(next.away, "fl")}`.replace(/class="fl"/g, 'style="width:22px;height:16px;border-radius:3px;object-fit:cover"');
  let mode = null;
  const setNum = (k, v) => {
    const el = $(`#cd-clock .cd-num[data-k="${k}"]`); if (!el) return;
    const s = String(v).padStart(2, "0");
    if (el.textContent !== s) { el.textContent = s; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  };
  const tick = () => {
    const diff = d.getTime() - Date.now();
    if (diff <= 0) { $("#cd-clock").innerHTML = `<span class="cd-seg" style="min-width:auto;padding:6px 18px">${t("inPlay")}</span>`; clearInterval(state.countdownTimer); return; }
    const days = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    const newMode = days > 0 ? "dhm" : "hms";
    if (newMode !== mode) {
      mode = newMode;
      const labels = newMode === "dhm" ? [["a", "D"], ["b", "H"], ["c", "M"]] : [["a", "H"], ["b", "M"], ["c", "S"]];
      $("#cd-clock").innerHTML = labels.map(([k, lbl]) => `<span class="cd-seg"><span class="cd-num" data-k="${k}">00</span><small>${lbl}</small></span>`).join("");
    }
    const v = newMode === "dhm" ? [days, h, m] : [h, m, s];
    setNum("a", v[0]); setNum("b", v[1]); setNum("c", v[2]);
  };
  tick();
  state.countdownTimer = setInterval(tick, 1000);
}

/* --------------------------- reveal on scroll ------------------------ */
let _revealIO = null;
function scrollReveal(container) {
  const items = $$(".reveal:not(.in)", container);
  if (!("IntersectionObserver" in window)) { items.forEach((e) => e.classList.add("in")); return; }
  if (!_revealIO) {
    _revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); _revealIO.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  }
  items.forEach((e, i) => {
    if (e.closest(".acc:not(.open)")) return;                 // en acordeón cerrado: se revela al abrir
    if (e.closest(".acc")) { e.classList.add("in"); return; } // en acordeón abierto: visible ya (la entrada es el despliegue)
    e.style.transitionDelay = ((i % 6) * 0.04).toFixed(3) + "s"; _revealIO.observe(e); // resto: reveal on scroll
  });
}

/* --------------------------- selector + idioma ----------------------- */
function sortedNames() { return Object.keys(TEAMS).sort((a, b) => dispName(a).localeCompare(dispName(b), state.lang)); }
function buildCountryGrid() {
  $("#country-grid").innerHTML = sortedNames().map((name) => {
    const code = flagCodeOf(name);
    const fl = code ? `<img class="ci-flag" src="${FLAG(code)}" alt="" loading="lazy">` : `<span class="ci-flag emoji">⚽</span>`;
    return `<button class="country-item" data-team="${name}">${fl}<span class="ci-name">${dispName(name)}</span></button>`;
  }).join("");
  markActiveCountry();
}
function markActiveCountry() { $$(".country-item").forEach((b) => b.classList.toggle("is-active", (b.dataset.team || "") === (state.team || ""))); }
function buildLangChips() {
  $("#lang-row").innerHTML = ["es", "en", "pt", "fr", "ar"].map((lg) => `<button class="lang-chip ${lg === state.lang ? "is-active" : ""}" data-lang="${lg}">${lg.toUpperCase()}</button>`).join("");
}
function openSelector() { $("#selector").hidden = false; $("#country-search").value = ""; filterCountries(""); markActiveCountry(); buildLangChips(); }
function closeSelector() { $("#selector").hidden = true; }
function filterCountries(q) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const nq = norm(q);
  $$(".country-item", $("#country-grid")).forEach((b) => { b.style.display = norm(b.textContent).includes(nq) ? "" : "none"; });
}
function setLang(lang) {
  if (!I18N[lang]) return;
  state.lang = lang;
  try { localStorage.setItem(STORE_LANG, lang); } catch {}
  applyI18n();
  buildCountryGrid();
  applyTheme(state.team); // re-render con idioma nuevo
}

/* --------------------------- compartir ------------------------------- */
function shareApp() {
  const url = "https://damelm.github.io/mundial-2026/";
  const data = { title: "Mundial 2026 · Fixture en vivo", text: localTeam(state.team, "nick") ? `${dispName(state.team)} en el Mundial 2026` : t("appTitle"), url };
  if (navigator.share) { navigator.share(data).catch(() => {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => flashToast(url)).catch(() => {}); }
  else { prompt("Copiá el link:", url); }
}
function flashToast(msg) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

/* --------------------------- skeletons ------------------------------- */
function renderSkeletons(n = 6) {
  const c = $("#fixture-list"); if (!c) return;
  c.innerHTML = Array.from({ length: n }).map(() =>
    `<div class="sk-card"><div class="sk sk-head"></div><div class="sk-row"><div class="sk sk-av"></div><div class="sk sk-time"></div><div class="sk sk-av"></div></div></div>`).join("");
}

/* --------------------------- acordeón: toggles ----------------------- */
function toggleAccordion(sec) {
  if (!sec) return;
  const open = sec.classList.toggle("open");
  const head = sec.querySelector(".acc-head");
  if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) scrollReveal(sec);
}
function toggleAllAccordions() {
  state.allExpanded = !state.allExpanded;
  $$(".panel.is-active .acc").forEach((sec) => {
    sec.classList.toggle("open", state.allExpanded);
    const head = sec.querySelector(".acc-head");
    if (head) head.setAttribute("aria-expanded", state.allExpanded ? "true" : "false");
    if (state.allExpanded) scrollReveal(sec);
  });
  updateToggleAllLabel();
}
function updateToggleAllLabel() {
  const el = $("#toggle-all-text");
  if (el) el.textContent = (ACC_TXT[state.lang] || ACC_TXT.es)[state.allExpanded ? 1 : 0];
}

/* --------------------------- tabs + eventos -------------------------- */
function switchTab(tab) {
  state.tab = tab;
  $$(".tab").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
  $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab));
  const act = $(".tab.is-active");
  if (act && act.scrollIntoView) act.scrollIntoView({ inline: "nearest", block: "nearest" });
  renderActivePanel();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
// Indicio visual de que la barra de tabs se puede deslizar (Sedes no entra en 375px)
function setupTabsScroll() {
  const el = $("#tabs"), wrap = $("#tabs-wrap");
  if (!el || !wrap) return;
  const upd = () => {
    const over = el.scrollWidth - el.clientWidth > 4;
    const x = Math.abs(el.scrollLeft);
    wrap.classList.toggle("fade-end", over && x + el.clientWidth < el.scrollWidth - 4);
    wrap.classList.toggle("fade-start", over && x > 4);
  };
  el.addEventListener("scroll", upd, { passive: true });
  window.addEventListener("resize", upd);
  state.updTabsFade = upd;
  upd();
}
function setupA11y() {
  const tabs = $("#tabs"); if (tabs) tabs.setAttribute("role", "tablist");
  $$(".tab").forEach((b) => { b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "panel-" + b.dataset.tab); b.setAttribute("aria-selected", b.classList.contains("is-active") ? "true" : "false"); });
  $$(".panel").forEach((p) => { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "tab-" + p.dataset.panel); p.setAttribute("tabindex", "0"); });
  const ff = $("#fixture-filters"); if (ff) { ff.setAttribute("role", "group"); ff.setAttribute("aria-label", "Filtro de partidos"); }
  const st = $("#status"); if (st) { st.setAttribute("role", "status"); st.setAttribute("aria-live", "polite"); }
}

/* --------------------------- filtros fixture ------------------------- */
function syncFilterChips() {
  $$("#fixture-filters .seg-btn").forEach((b) => { const on = b.dataset.filter === state.filter; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
}

/* --------------------------- calendario (.ics) ----------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const icsDate = (d) => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + "00Z";
function addToCalendar(mid) {
  const m = state.data.matches.find((x) => String(x.id) === String(mid));
  if (!m) return;
  const d = parseUTC(m.timestamp); if (!d) return;
  const end = new Date(d.getTime() + 2 * 3600000);
  const title = `${dispName(m.home)} vs ${dispName(m.away)} · Mundial 2026`;
  const loc = [m.venue, m.city ? m.city.split(",")[0] : ""].filter(Boolean).join(", ");
  const stage = m.group ? t("group", { g: m.group }) : stageLabel(m);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mundial2026//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:wc26-${m.id}@damelm.github.io`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(d)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${title}`, `LOCATION:${loc}`, `DESCRIPTION:${stage} — Mundial 2026`, "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${title}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = `mundial-${m.home}-${m.away}.ics`.replace(/[^\w.-]+/g, "_");
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  flashToast(dispName(m.home) + " vs " + dispName(m.away) + " ✓");
}

/* --------------------------- modo oscuro ----------------------------- */
function applyDark(dark) {
  state.dark = dark;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try { localStorage.setItem("wc26-dark", dark ? "1" : "0"); } catch {}
  applyTheme(state.team); // recalcula --brand-accent/--brand-soft según el modo
}

function wireEvents() {
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) switchTab(b.dataset.tab); });
  $("#main").addEventListener("click", (e) => {
    if (e.target.closest("#retry-btn")) { retryLoad(); return; }
    const cb = e.target.closest(".cal-btn"); if (cb) { e.stopPropagation(); addToCalendar(cb.dataset.mid); return; }
    const h = e.target.closest(".acc-head"); if (h) toggleAccordion(h.parentElement);
  });
  $("#toggle-all").addEventListener("click", toggleAllAccordions);
  $("#fixture-filters").addEventListener("click", (e) => { const b = e.target.closest(".seg-btn"); if (!b) return; state.filter = b.dataset.filter; syncFilterChips(); renderFixture(); });
  $("#dark-btn").addEventListener("click", () => applyDark(!state.dark));
  $("#open-selector").addEventListener("click", openSelector);
  $("#share-btn").addEventListener("click", shareApp);
  $("#open-lang").addEventListener("click", () => { const order = ["es", "en", "pt", "fr", "ar"]; setLang(order[(order.indexOf(state.lang) + 1) % order.length]); });
  $("#selector").addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeSelector(); });
  $("#country-grid").addEventListener("click", (e) => { const b = e.target.closest(".country-item"); if (!b) return; chooseTeam(b.dataset.team || null); closeSelector(); });
  $("#lang-row").addEventListener("click", (e) => { const b = e.target.closest(".lang-chip"); if (b) setLang(b.dataset.lang); });
  $(".neutral-item").addEventListener("click", () => { chooseTeam(null); closeSelector(); });
  $("#country-search").addEventListener("input", (e) => filterCountries(e.target.value));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSelector(); });
}
function chooseTeam(name) { try { localStorage.setItem(STORE_TEAM, name || "__NEUTRAL__"); } catch {} applyTheme(name); }

/* --------------------------- init ------------------------------------ */
async function init() {
  // idioma guardado (provisorio hasta geo)
  let storedLang = null; try { storedLang = localStorage.getItem(STORE_LANG); } catch {}
  if (storedLang && I18N[storedLang]) state.lang = storedLang;
  // modo oscuro: preferencia guardada o del sistema
  let storedDark = null; try { storedDark = localStorage.getItem("wc26-dark"); } catch {}
  state.dark = storedDark != null ? storedDark === "1" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = state.dark ? "dark" : "light";
  setTimezone(null); // browser por defecto hasta geo
  buildLangChips(); wireEvents(); setupA11y(); setupTabsScroll(); applyI18n();

  $("#status").innerHTML = `<div class="spinner"></div>${t("loading")}`;
  renderSkeletons();
  const [data, geo] = await Promise.all([loadData().catch(() => null), detectGeo()]);

  if (data) {
    state.data = data;
    state.sig = JSON.stringify(data.matches);
    $("#status").innerHTML = "";
    setFooterUpdated(data);
  } else {
    showLoadError();
  }

  // zona horaria por geolocalización (no por reloj del PC)
  if (geo && geo.tz) setTimezone(geo.tz, geo.off);

  // idioma: guardado > geolocalización > navegador
  if (!storedLang) { state.lang = langForCountry(geo && geo.code); }
  applyI18n(); buildCountryGrid();

  // temática: elección guardada > país detectado > neutral
  let storedTeam = null; try { storedTeam = localStorage.getItem(STORE_TEAM); } catch {}
  if (storedTeam === "__NEUTRAL__") applyTheme(null);
  else if (storedTeam && TEAMS[storedTeam]) applyTheme(storedTeam);
  else { const team = geo && geo.code && CODE_TO_TEAM[geo.code]; applyTheme(team || null); }

  scheduleRefresh();
}

function scheduleRefresh() {
  clearTimeout(state.refreshTimer);
  const live = state.data && state.data.matches.some((m) => classifyStatus(m) === "live");
  state.refreshTimer = setTimeout(async () => {
    try {
      const fresh = await loadData();
      const sig = JSON.stringify(fresh.matches);
      state.data = fresh;
      setFooterUpdated(fresh);
      if (sig !== state.sig) { state.sig = sig; render(); } // solo re-render si cambiaron los partidos
    } catch {}
    scheduleRefresh();
  }, live ? 30_000 : REFRESH_MS); // más rápido si hay partidos en vivo
}
document.addEventListener("DOMContentLoaded", init);
