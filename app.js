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

const state = {
  data: null, team: null, view: "fecha", onlyMine: false, tab: "fixture",
  lang: "es", tz: null, tzCity: "", tzOff: "",
  factTimer: null, factIdx: 0, countdownTimer: null,
};

/* --------------------------- helpers --------------------------------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const L = () => I18N[state.lang] || I18N.es;
function t(path, vars) {
  const val = path.split(".").reduce((o, k) => (o ? o[k] : null), L());
  return vars ? tmpl(val || "", vars) : (val || "");
}
const pick = (o) => (o ? (o[state.lang] ?? o.en ?? o.es) : "");
const theme = () => (state.team ? TEAMS[state.team] : NEUTRAL);
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
function brandColors(tm) {
  const cands = [tm.c1, tm.c2, tm.c3];
  const ideal = 0.26; // elige el color más "vibrante medio" (evita blancos/amarillos y negros)
  const usable = cands.filter((c) => lum(c) >= 0.05);
  const pool = usable.length ? usable : cands;
  const hue = pool.reduce((best, c) => (Math.abs(lum(c) - ideal) < Math.abs(lum(best) - ideal) ? c : best));
  const brand = adjustToLum(hue, 0.2); // oscuro suficiente para texto blanco legible
  return { brand, brand2: mixHex(brand, "#ffffff", 0.18), soft: mixHex(brand, "#ffffff", 0.9) };
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
  const res = await fetch(`${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  $("#lang-current").textContent = state.lang.toUpperCase();
  $("#fact-label").textContent = t("didYouKnow");
  $("#tab-fixture").textContent = t("tabs.fixture");
  $("#tab-grupos").textContent = t("tabs.groups");
  $("#tab-bracket").textContent = t("tabs.bracket");
  $("#tab-seleccion").textContent = t("tabs.team");
  $("#seg-fecha").textContent = t("byMatchday");
  $("#seg-grupo").textContent = t("byGroup");
  $("#selector-title").textContent = t("chooseTeam");
  $("#country-search").placeholder = t("searchCountry");
  $("#neutral-name").textContent = t("neutralMode");
  $("#footer-made").innerHTML = `${t("madeWith")} · <a href="https://www.thesportsdb.com" target="_blank" rel="noopener">TheSportsDB</a>`;
  setTzHint();
  buildLangChips();
}
function setTzHint() {
  $("#tz-hint").innerHTML = `🕒 ${t("tzHint", { zone: state.tzCity || "—", off: state.tzOff || "" })}`;
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
  root.style.setProperty("--brand-2", b.brand2);
  root.style.setProperty("--brand-soft", b.soft);
  root.style.setProperty("--on-brand", "#ffffff");
  $("#meta-theme").setAttribute("content", b.brand);

  // bandera del hero
  const code = name ? flagCodeOf(name) : null;
  const hf = $("#hero-flag-img");
  if (code) { hf.src = FLAG(code); hf.style.display = ""; }
  else { hf.removeAttribute("src"); hf.style.display = "none"; $("#hero-badge").dataset.empty = "🏆"; }
  $("#hero-badge").innerHTML = code
    ? `<img id="hero-flag-img" src="${FLAG(code)}" alt="${dispName(name)}">`
    : `<span style="font-size:32px">🏆</span>`;

  $("#hero-confed").textContent = tm.confed;
  $("#hero-title").textContent = name ? dispName(name) : t("appTitle");
  $("#hero-nick").textContent = pick(tm.nick);
  $("#hero-titles").textContent = pick(tm.titles);

  const cbf = $("#country-btn-flag");
  if (code) { cbf.src = FLAG(code); cbf.style.display = ""; } else { cbf.style.display = "none"; }
  $("#country-btn-text").textContent = name ? dispName(name) : t("chooseCountry");

  const wrap = $("#only-mine-wrap");
  if (name) { wrap.hidden = false; $("#only-mine-text").textContent = t("onlyTeam", { team: dispName(name) }); }
  else { wrap.hidden = true; state.onlyMine = false; $("#only-mine").checked = false; }

  startFacts(pick(tm.facts) || tm.facts.en || tm.facts.es);
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
}

function teamCell(name, badge) {
  // Prefiere el escudo de TheSportsDB; si falla, bandera.
  const code = flagCodeOf(name);
  const fb = code ? FLAG(code) : "";
  if (badge) return `<img class="team-badge" src="${badge}" alt="${dispName(name)}" loading="lazy" onerror="this.onerror=null;this.className='team-flag';this.src='${fb}'">`;
  if (code) return `<img class="team-flag" src="${fb}" alt="${dispName(name)}" loading="lazy">`;
  return `<span class="team-flag emoji">⚽</span>`;
}
function matchCard(m) {
  const d = parseUTC(m.timestamp);
  const st = classifyStatus(m);
  const isMine = state.team && (m.home === state.team || m.away === state.team);
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
  return `<article class="match reveal ${isMine ? "mine" : ""} ${st === "live" ? "live" : ""}">
    <div class="match-meta">${grp}${venue}</div>
    <div class="team-side home">${teamCell(m.home, m.homeBadge)}<span class="team-name">${dispName(m.home)}</span></div>
    <div class="match-center">${center}</div>
    <div class="team-side away">${teamCell(m.away, m.awayBadge)}<span class="team-name">${dispName(m.away)}</span></div></article>`;
}
function stageLabel(m) {
  if (m.stage === "GROUP") return t("stages.GROUP", { r: m.round });
  return t(`stages.${m.stage}`) || m.stageName || t("knockouts");
}

function renderFixture() {
  const cont = $("#fixture-list");
  let matches = [...state.data.matches];
  if (state.onlyMine && state.team) matches = matches.filter((m) => m.home === state.team || m.away === state.team);
  if (!matches.length) { cont.innerHTML = `<div class="status">${t("noMatches")}</div>`; return; }
  let html = "";
  if (state.view === "grupo") {
    const groups = {}, ko = [];
    for (const m of matches) { if (m.stage === "GROUP" && m.group) (groups[m.group] ||= []).push(m); else ko.push(m); }
    for (const g of Object.keys(groups).sort()) {
      html += `<div class="day-group"><div class="day-head"><h3>${t("group", { g })}</h3><span class="line"></span></div>`;
      groups[g].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")).forEach((m) => (html += matchCard(m)));
      html += `</div>`;
    }
    if (ko.length) {
      html += `<div class="day-group"><div class="day-head"><h3>${t("knockouts")}</h3><span class="line"></span></div>`;
      ko.forEach((m) => (html += matchCard(m))); html += `</div>`;
    }
  } else {
    const byDay = {};
    for (const m of matches) { const d = parseUTC(m.timestamp); (byDay[d ? dayKey(d) : "zzz"] ||= []).push(m); }
    for (const k of Object.keys(byDay).sort()) {
      const s = parseUTC(byDay[k][0].timestamp);
      html += `<div class="day-group"><div class="day-head"><h3>${s ? fmtDayLong(s) : "—"}</h3><span class="line"></span></div>`;
      byDay[k].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")).forEach((m) => (html += matchCard(m)));
      html += `</div>`;
    }
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
  let html = "";
  for (const g of keys) {
    const rows = Object.values(groups[g]).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || dispName(a.team).localeCompare(dispName(b.team), state.lang));
    html += `<div class="group-card reveal"><h3>${t("group", { g })}</h3><table class="table"><thead><tr>
      <th class="pos"></th><th class="team-cell">${state.lang === "es" ? "Equipo" : state.lang === "pt" ? "Seleção" : state.lang === "fr" ? "Équipe" : "Team"}</th>
      <th>${TH.pj}</th><th>${TH.g}</th><th>${TH.e}</th><th>${TH.p}</th><th>${TH.dif}</th><th>${TH.pts}</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const dif = r.gf - r.gc;
      const code = flagCodeOf(r.team);
      const img = r.badge
        ? `<img src="${r.badge}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${code ? FLAG(code) : ""}'">`
        : (code ? `<img src="${FLAG(code)}" alt="" loading="lazy">` : `<span>⚽</span>`);
      html += `<tr class="${i < 2 ? "qualify" : ""}"><td class="pos">${i + 1}</td>
        <td class="team-cell"><div class="team-cell-inner">${img}<span>${dispName(r.team)}</span></div></td>
        <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td><td>${dif > 0 ? "+" + dif : dif}</td><td class="pts">${r.pts}</td></tr>`;
    });
    html += `</tbody></table><div class="group-legend">${t("groupLegend")}</div></div>`;
  }
  cont.innerHTML = html;
  scrollReveal(cont);
}

/* --------------------------- bracket (104) --------------------------- */
function renderBracket() {
  const cont = $("#bracket-content");
  const koData = state.data.matches.filter((m) => m.stage !== "GROUP");
  const byStage = {};
  koData.forEach((m) => (byStage[m.stage] ||= []).push(m));
  let html = `<div class="bracket-head"><div class="big">🏆 ${t("knockouts")}</div><p>${t("bracketSub")}</p></div>`;
  for (const r of KO_ROUNDS) {
    const real = (byStage[r.stage] || []).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    const d = parseUTC(r.date + "T18:00:00");
    html += `<div class="bracket-round"><h3>${t(`stages.${r.stage}`)}</h3>`;
    html += `<span class="ko-date">${d ? fmtDayShort(d) : ""}</span>`;
    for (let i = 0; i < r.n; i++) {
      const m = real[i];
      if (m) {
        const sc = m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : `<span class="ko-vs">${t("vs")}</span>`;
        html += `<div class="ko-match reveal"><div class="ko-team">${teamCellFlag(m.home)}<span>${dispName(m.home)}</span></div>
          <div class="ko-score">${sc}</div>
          <div class="ko-team away"><span>${dispName(m.away)}</span>${teamCellFlag(m.away)}</div></div>`;
      } else {
        html += `<div class="ko-match tbd reveal"><div class="ko-team"><span class="tbd-badge">?</span><span>${t("tbd")}</span></div>
          <div class="ko-score"><span class="ko-vs">${t("vs")}</span></div>
          <div class="ko-team away"><span>${t("tbd")}</span><span class="tbd-badge">?</span></div></div>`;
      }
    }
    html += `</div>`;
  }
  cont.innerHTML = html;
  scrollReveal(cont);
}
function teamCellFlag(name) {
  const code = flagCodeOf(name);
  return code ? `<img src="${FLAG(code)}" alt="${dispName(name)}" loading="lazy">` : `<span class="tbd-badge">⚽</span>`;
}

/* --------------------------- mi selección ---------------------------- */
function renderSeleccion() {
  const cont = $("#seleccion-content");
  if (!state.team) {
    cont.innerHTML = `<div class="sel-empty"><div class="big">⭐</div><p>${t("pickToSee")}</p>
      <p style="margin-top:14px"><button class="country-btn" onclick="document.getElementById('open-selector').click()">🌍 ${t("chooseCountry")}</button></p></div>`;
    return;
  }
  const tm = TEAMS[state.team];
  const code = flagCodeOf(state.team);
  const mine = state.data.matches.filter((m) => m.home === state.team || m.away === state.team).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  cont.innerHTML = `
    <div class="sel-hero">
      ${code ? `<img class="sel-flag" src="${FLAG(code)}" alt="${dispName(state.team)}">` : ""}
      <div class="sel-name">${dispName(state.team)}</div>
      <div class="sel-nick">${pick(tm.nick)}</div>
      <div class="sel-chips"><span class="sel-chip">${tm.confed}</span><span class="sel-chip">${pick(tm.titles)}</span></div>
    </div>
    <div class="sel-section-title">${t("trivia")}</div>
    <div class="sel-facts">${(pick(tm.facts) || tm.facts.en).map((f) => `<div class="sel-fact reveal">${f}</div>`).join("")}</div>
    <div class="sel-section-title">${t("matchesOf", { team: dispName(state.team) })}</div>
    <div class="fixture-list">${mine.length ? mine.map(matchCard).join("") : `<div class="status">${t("noMatches")}</div>`}</div>`;
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
  items.forEach((e, i) => { e.style.transitionDelay = ((i % 6) * 0.04).toFixed(3) + "s"; _revealIO.observe(e); });
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
  $("#lang-row").innerHTML = ["es", "en", "pt", "fr"].map((lg) => `<button class="lang-chip ${lg === state.lang ? "is-active" : ""}" data-lang="${lg}">${lg.toUpperCase()}</button>`).join("");
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

/* --------------------------- tabs + eventos -------------------------- */
function switchTab(tab) {
  state.tab = tab;
  $$(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
  $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab));
  renderActivePanel();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function wireEvents() {
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) switchTab(b.dataset.tab); });
  $("#fixture-view-seg").addEventListener("click", (e) => { const b = e.target.closest(".seg-btn"); if (!b) return; state.view = b.dataset.view; $$(".seg-btn", $("#fixture-view-seg")).forEach((x) => x.classList.toggle("is-active", x === b)); renderFixture(); });
  $("#only-mine").addEventListener("change", (e) => { state.onlyMine = e.target.checked; renderFixture(); });
  $("#open-selector").addEventListener("click", openSelector);
  $("#open-lang").addEventListener("click", () => { const order = ["es", "en", "pt", "fr"]; setLang(order[(order.indexOf(state.lang) + 1) % order.length]); });
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
  setTimezone(null); // browser por defecto hasta geo
  buildLangChips(); wireEvents(); applyI18n();

  $("#status").innerHTML = `<div class="spinner"></div>${t("loading")}`;
  const [data, geo] = await Promise.all([loadData().catch(() => null), detectGeo()]);

  if (data) {
    state.data = data;
    state.sig = JSON.stringify(data.matches);
    $("#status").innerHTML = "";
    const upd = parseUTC(data.updatedAt);
    $("#footer-updated").textContent = data.updatedAt ? `${t("updated")}: ${upd ? upd.toLocaleString(state.lang, tzOpt()) : data.updatedAt} · ${data.count} ${t("matches")}` : "";
  } else {
    $("#status").innerHTML = `<div class="error">${t("loadError")}</div>`;
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

  setInterval(async () => {
    try {
      const fresh = await loadData();
      const sig = JSON.stringify(fresh.matches);
      state.data = fresh;
      const upd = parseUTC(fresh.updatedAt);
      $("#footer-updated").textContent = fresh.updatedAt ? `${t("updated")}: ${upd ? upd.toLocaleString(state.lang, tzOpt()) : fresh.updatedAt} · ${fresh.count} ${t("matches")}` : "";
      if (sig !== state.sig) { state.sig = sig; render(); } // solo re-render si cambiaron los partidos
    } catch {}
  }, REFRESH_MS);
}
document.addEventListener("DOMContentLoaded", init);
