/* app.js — Mundial 2026 fixture. Vanilla JS, sin dependencias.
 * Usa themes.js (TEAMS, NEUTRAL, CODE_TO_TEAM, TEAM_NAMES_SORTED).
 */
"use strict";

const DATA_URL = "data/fixture.json";
const STORE_KEY = "wc26-choice"; // guarda elección explícita del usuario
const REFRESH_MS = 60_000;

const state = {
  data: null,
  team: null,        // nombre del equipo (clave de TEAMS) o null = neutral
  view: "fecha",     // "fecha" | "grupo"
  onlyMine: false,
  tab: "fixture",
  factTimer: null,
  factIdx: 0,
  countdownTimer: null,
};

/* ------------------------- Utilidades --------------------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const themeOf = (name) => (name && TEAMS[name]) || NEUTRAL;
const esName = (name) => (TEAMS[name] ? TEAMS[name].es : name);
const flagOf = (name) => (TEAMS[name] ? TEAMS[name].flag : "⚽");

function parseUTC(ts) {
  if (!ts) return null;
  // TheSportsDB entrega "YYYY-MM-DDTHH:MM:SS" (UTC). Añadimos Z si falta zona.
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + "Z";
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function classifyStatus(m) {
  const s = (m.status || "").toUpperCase();
  const finished = ["FT", "AET", "PEN", "MATCH FINISHED", "FINISHED", "AP"];
  const live = ["1H", "2H", "HT", "ET", "LIVE", "P", "BT", "IN PLAY", "PLAYING"];
  if (finished.some((x) => s.includes(x)) || (m.homeScore != null && m.awayScore != null && (s === "" ))) return "ft";
  if (live.some((x) => s.includes(x))) return "live";
  if (m.homeScore != null && m.awayScore != null && s !== "NS") return "ft";
  return "ns";
}

function fmtTime(d) {
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayLong(d) {
  return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}
function fmtDayShort(d) {
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}
function dayKey(d) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD en zona local
}

/* ------------------------- Carga de datos ----------------------------- */
async function loadData() {
  const res = await fetch(`${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function detectCountry() {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const j = await res.json();
    return j.country_code || null;
  } catch {
    return null;
  }
}

/* ------------------------- Temática ----------------------------------- */
function applyTheme(name) {
  state.team = name;
  const t = themeOf(name);
  const root = document.documentElement;
  root.style.setProperty("--c1", t.c1);
  root.style.setProperty("--c2", t.c2);
  root.style.setProperty("--c3", t.c3);
  $("#meta-theme").setAttribute("content", t.c1);

  // Hero
  $("#hero-flag").textContent = t.flag;
  $("#hero-confed").textContent = t.confed;
  $("#hero-title").textContent = name ? t.es : "Mundial 2026";
  $("#hero-nick").textContent = t.nick;
  $("#hero-titles").textContent = t.titles;

  // Botón selector
  $("#country-btn-flag").textContent = t.flag;
  $("#country-btn-text").textContent = name ? t.es : "Elegir país";

  // Filtro "solo mi selección"
  const wrap = $("#only-mine-wrap");
  if (name) {
    wrap.hidden = false;
    $("#only-mine-text").textContent = `Solo ${t.es}`;
  } else {
    wrap.hidden = true;
    state.onlyMine = false;
    $("#only-mine").checked = false;
  }

  startFacts(t.facts);
  burstConfetti(true);
  markActiveCountry();
  render();
}

function startFacts(facts) {
  clearInterval(state.factTimer);
  state.factIdx = 0;
  const el = $("#fact-text");
  const show = () => {
    el.classList.add("fading");
    setTimeout(() => {
      el.textContent = facts[state.factIdx % facts.length];
      state.factIdx++;
      el.classList.remove("fading");
    }, 300);
  };
  el.textContent = facts[0];
  state.factIdx = 1;
  if (facts.length > 1) state.factTimer = setInterval(show, 5500);
}

/* ------------------------- Render principal --------------------------- */
function render() {
  if (!state.data) return;
  renderFixture();
  renderGroups();
  renderBracket();
  renderSeleccion();
  renderCountdown();
}

function teamBadge(name, badge, size = 44) {
  const flag = flagOf(name);
  if (badge) {
    return `<img class="team-badge" style="width:${size}px;height:${size}px" src="${badge}" alt="${esName(name)}"
      loading="lazy" onerror="this.outerHTML='<span class=&quot;team-badge-fallback&quot; style=&quot;width:${size}px;height:${size}px&quot;>${flag}</span>'">`;
  }
  return `<span class="team-badge-fallback" style="width:${size}px;height:${size}px">${flag}</span>`;
}

function matchCard(m) {
  const d = parseUTC(m.timestamp);
  const st = classifyStatus(m);
  const isMine = state.team && (m.home === state.team || m.away === state.team);
  let center;
  if (st === "ns") {
    center = `<div class="match-time">${d ? fmtTime(d) : "--:--"}</div>
              <div class="match-date-sm">${d ? fmtDayShort(d) : ""}</div>
              <span class="match-status st-ns">Programado</span>`;
  } else {
    const score = `${m.homeScore ?? "-"}<span class="sep">:</span>${m.awayScore ?? "-"}`;
    const label = st === "live"
      ? `<span class="match-status st-live">● En vivo</span>`
      : `<span class="match-status st-ft">Final</span>`;
    center = `<div class="match-score">${score}</div>${label}`;
  }
  const grp = m.group ? `<span class="match-grouptag">Grupo ${m.group}</span>` : (m.stageName || "");
  const venue = m.venue ? ` · ${m.venue}${m.city ? ", " + m.city.split(",")[0] : ""}` : "";
  return `
  <article class="match ${isMine ? "mine" : ""} ${st === "live" ? "live" : ""}">
    <div class="team-side home">
      ${teamBadge(m.home, m.homeBadge)}
      <span class="team-name">${esName(m.home)}</span>
    </div>
    <div class="match-center">${center}</div>
    <div class="team-side away">
      ${teamBadge(m.away, m.awayBadge)}
      <span class="team-name">${esName(m.away)}</span>
    </div>
    <div class="match-meta">${grp}${venue}</div>
  </article>`;
}

function renderFixture() {
  const cont = $("#fixture-list");
  let matches = [...state.data.matches];
  if (state.onlyMine && state.team) {
    matches = matches.filter((m) => m.home === state.team || m.away === state.team);
  }
  if (!matches.length) {
    cont.innerHTML = `<div class="status">No hay partidos para mostrar.</div>`;
    return;
  }

  let html = "";
  if (state.view === "grupo") {
    const groups = {};
    const ko = [];
    for (const m of matches) {
      if (m.stage === "GROUP" && m.group) (groups[m.group] ||= []).push(m);
      else ko.push(m);
    }
    for (const g of Object.keys(groups).sort()) {
      html += `<div class="day-group"><div class="day-head"><h3>Grupo ${g}</h3><span class="line"></span></div>`;
      groups[g]
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
        .forEach((m) => (html += matchCard(m)));
      html += `</div>`;
    }
    if (ko.length) {
      html += `<div class="day-group"><div class="day-head"><h3>Eliminatorias</h3><span class="line"></span></div>`;
      ko.forEach((m) => (html += matchCard(m)));
      html += `</div>`;
    }
  } else {
    // por jornada/fecha
    const byDay = {};
    for (const m of matches) {
      const d = parseUTC(m.timestamp);
      const k = d ? dayKey(d) : "zzz";
      (byDay[k] ||= []).push(m);
    }
    for (const k of Object.keys(byDay).sort()) {
      const sample = parseUTC(byDay[k][0].timestamp);
      const title = sample ? fmtDayLong(sample) : "Fecha por confirmar";
      html += `<div class="day-group"><div class="day-head"><h3>${title}</h3><span class="line"></span></div>`;
      byDay[k]
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
        .forEach((m) => (html += matchCard(m)));
      html += `</div>`;
    }
  }
  cont.innerHTML = html;
  revealOnScroll(cont);
}

/* ------------------------- Tablas de grupos --------------------------- */
function computeStandings() {
  const groups = {};
  for (const m of state.data.matches) {
    if (m.stage !== "GROUP" || !m.group) continue;
    const g = (groups[m.group] ||= {});
    for (const tm of [m.home, m.away]) {
      g[tm] ||= { team: tm, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, badge: null };
    }
    const badgeHome = m.homeBadge, badgeAway = m.awayBadge;
    if (badgeHome) g[m.home].badge = badgeHome;
    if (badgeAway) g[m.away].badge = badgeAway;
    const st = classifyStatus(m);
    if (st === "ns" || m.homeScore == null || m.awayScore == null) continue;
    const H = g[m.home], A = g[m.away];
    H.pj++; A.pj++;
    H.gf += m.homeScore; H.gc += m.awayScore;
    A.gf += m.awayScore; A.gc += m.homeScore;
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
  if (!keys.length) { cont.innerHTML = `<div class="status">Aún no hay grupos cargados.</div>`; return; }

  let html = "";
  for (const g of keys) {
    const rows = Object.values(groups[g]).sort((a, b) =>
      b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf ||
      esName(a.team).localeCompare(esName(b.team), "es")
    );
    html += `<div class="group-card"><h3>Grupo ${g}</h3>
      <table class="table"><thead><tr>
        <th class="pos"></th><th class="team-cell">Equipo</th>
        <th>PJ</th><th>G</th><th>E</th><th>P</th><th>DIF</th><th>PTS</th>
      </tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const dif = r.gf - r.gc;
      const badge = r.badge
        ? `<img src="${r.badge}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag',textContent:'${flagOf(r.team)}'}))">`
        : `<span class="flag">${flagOf(r.team)}</span>`;
      html += `<tr class="${i < 2 ? "qualify" : ""}">
        <td class="pos">${i + 1}</td>
        <td class="team-cell"><div class="team-cell-inner">${badge}<span>${esName(r.team)}</span></div></td>
        <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td>
        <td>${dif > 0 ? "+" + dif : dif}</td><td class="pts">${r.pts}</td>
      </tr>`;
    });
    html += `</tbody></table>
      <div class="group-legend">Clasifican los 2 primeros de cada grupo + los 8 mejores terceros.</div></div>`;
  }
  cont.innerHTML = html;
}

/* ------------------------- Bracket ------------------------------------ */
function renderBracket() {
  const cont = $("#bracket-content");
  const ko = state.data.matches.filter((m) => m.stage !== "GROUP");
  if (!ko.length) {
    cont.innerHTML = `
      <div class="bracket-intro">
        <div class="big">🏆 Eliminatorias</div>
        <p>El cuadro de octavos, cuartos, semis y final se completará automáticamente
        en cuanto terminen los grupos y se definan los cruces.</p>
        <p style="margin-top:10px;color:var(--ink-dim);font-size:13px">
        32 equipos avanzan a la fase final (los 2 primeros de cada grupo + los 8 mejores terceros).</p>
      </div>`;
    return;
  }
  const order = ["R32", "R16", "QF", "SF", "TP", "F"];
  const byStage = {};
  ko.forEach((m) => (byStage[m.stage] ||= []).push(m));
  let html = "";
  for (const s of order) {
    if (!byStage[s]) continue;
    const title = byStage[s][0].stageName || s;
    html += `<div class="bracket-round"><h3>${title}</h3>`;
    byStage[s]
      .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
      .forEach((m) => {
        const badgeH = m.homeBadge ? `<img src="${m.homeBadge}" alt="">` : `<span>${flagOf(m.home)}</span>`;
        const badgeA = m.awayBadge ? `<img src="${m.awayBadge}" alt="">` : `<span>${flagOf(m.away)}</span>`;
        const sc = m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "";
        html += `<div class="ko-match">
          <div class="ko-team">${badgeH}${esName(m.home)}</div>
          <div class="ko-score">${sc || '<span class="ko-vs">vs</span>'}</div>
          <div class="ko-team">${esName(m.away)}${badgeA}</div>
        </div>`;
      });
    html += `</div>`;
  }
  cont.innerHTML = html;
}

/* ------------------------- Mi selección ------------------------------- */
function renderSeleccion() {
  const cont = $("#seleccion-content");
  if (!state.team) {
    cont.innerHTML = `
      <div class="sel-empty">
        <div class="big">⭐</div>
        <p>Elegí tu selección para ver sus datos, curiosidades y partidos.</p>
        <p style="margin-top:14px"><button class="country-btn" onclick="document.getElementById('open-selector').click()">
          <span>🌍</span> Elegir país</button></p>
      </div>`;
    return;
  }
  const t = themeOf(state.team);
  const mine = state.data.matches
    .filter((m) => m.home === state.team || m.away === state.team)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  let html = `
    <div class="sel-hero">
      <div class="sel-flag">${t.flag}</div>
      <div class="sel-name">${t.es}</div>
      <div class="sel-nick">${t.nick}</div>
      <div class="sel-chips">
        <span class="sel-chip">${t.confed}</span>
        <span class="sel-chip">${t.titles}</span>
      </div>
    </div>
    <div class="sel-section-title">Curiosidades</div>
    <div class="sel-facts">
      ${t.facts.map((f) => `<div class="sel-fact">${f}</div>`).join("")}
    </div>
    <div class="sel-section-title">Partidos de ${t.es}</div>
    <div class="fixture-list">
      ${mine.length ? mine.map(matchCard).join("") : '<div class="status">Sin partidos cargados todavía.</div>'}
    </div>`;
  cont.innerHTML = html;
  revealOnScroll(cont);
}

/* ------------------------- Countdown ---------------------------------- */
function renderCountdown() {
  clearInterval(state.countdownTimer);
  const box = $("#countdown");
  const now = Date.now();
  let pool = state.data.matches.filter((m) => {
    const d = parseUTC(m.timestamp);
    return d && d.getTime() > now && classifyStatus(m) === "ns";
  });
  if (state.team) {
    const mineNext = pool.filter((m) => m.home === state.team || m.away === state.team);
    if (mineNext.length) pool = mineNext;
  }
  pool.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  const next = pool[0];
  if (!next) { box.hidden = true; return; }
  const d = parseUTC(next.timestamp);
  box.hidden = false;
  $("#countdown-label").textContent =
    (state.team && (next.home === state.team || next.away === state.team))
      ? `Próximo partido de ${esName(state.team)}` : "Próximo partido del Mundial";

  const tick = () => {
    const diff = d.getTime() - Date.now();
    if (diff <= 0) { $("#countdown-body").innerHTML = `<span class="countdown-time">¡EN JUEGO!</span>`; clearInterval(state.countdownTimer); return; }
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    const t = days > 0 ? `${days}d ${h}h ${min}m` : `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    $("#countdown-body").innerHTML =
      `<div>${esName(next.home)} vs ${esName(next.away)}</div><span class="countdown-time">${t}</span>`;
  };
  tick();
  state.countdownTimer = setInterval(tick, 1000);
}

/* ------------------------- Reveal on scroll --------------------------- */
function revealOnScroll(container) {
  const items = $$(".match", container);
  if (!("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("reveal")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("reveal"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -40px 0px" });
  items.forEach((i) => io.observe(i));
}

/* ------------------------- Selector de país --------------------------- */
function buildCountryGrid() {
  const grid = $("#country-grid");
  grid.innerHTML = TEAM_NAMES_SORTED.map((name) => `
    <button class="country-item" data-team="${name}">
      <span class="ci-flag">${TEAMS[name].flag}</span>
      <span class="ci-name">${TEAMS[name].es}</span>
    </button>`).join("");
}
function markActiveCountry() {
  $$(".country-item").forEach((b) =>
    b.classList.toggle("is-active", (b.dataset.team || "") === (state.team || "")));
}
function openSelector() { $("#selector").hidden = false; $("#country-search").value = ""; filterCountries(""); markActiveCountry(); }
function closeSelector() { $("#selector").hidden = true; }
function filterCountries(q) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const nq = norm(q);
  $$(".country-item", $("#country-grid")).forEach((b) => {
    b.style.display = norm(b.textContent).includes(nq) ? "" : "none";
  });
}

/* ------------------------- Confetti ----------------------------------- */
let confettiParts = [];
let confettiRAF = null;
function burstConfetti(big = false) {
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const t = themeOf(state.team);
  const colors = [t.c1, t.c2, t.c3, "#ffffff"];
  const n = big ? 110 : 50;
  for (let i = 0; i < n; i++) {
    confettiParts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.6,
      y: -20,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 2,
      g: 0.12 + Math.random() * 0.08,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
      ttl: 140 + Math.random() * 60,
    });
  }
  if (!confettiRAF) animateConfetti();
}
function animateConfetti() {
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  confettiParts = confettiParts.filter((p) => p.life < p.ttl && p.y < innerHeight + 30);
  confettiParts.forEach((p) => {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });
  if (confettiParts.length) confettiRAF = requestAnimationFrame(animateConfetti);
  else { confettiRAF = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

/* ------------------------- Tabs --------------------------------------- */
function switchTab(tab) {
  state.tab = tab;
  $$(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
  $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ------------------------- Eventos ------------------------------------ */
function wireEvents() {
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab"); if (b) switchTab(b.dataset.tab);
  });
  $("#fixture-view-seg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn"); if (!b) return;
    state.view = b.dataset.view;
    $$(".seg-btn", $("#fixture-view-seg")).forEach((x) => x.classList.toggle("is-active", x === b));
    renderFixture();
  });
  $("#only-mine").addEventListener("change", (e) => { state.onlyMine = e.target.checked; renderFixture(); });

  $("#open-selector").addEventListener("click", openSelector);
  $("#selector").addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeSelector(); });
  $("#country-grid").addEventListener("click", (e) => {
    const b = e.target.closest(".country-item"); if (!b) return;
    chooseTeam(b.dataset.team || null);
    closeSelector();
  });
  $(".neutral-item").addEventListener("click", () => { chooseTeam(null); closeSelector(); });
  $("#country-search").addEventListener("input", (e) => filterCountries(e.target.value));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSelector(); });
}

function chooseTeam(name) {
  try { localStorage.setItem(STORE_KEY, name || "__NEUTRAL__"); } catch {}
  applyTheme(name);
}

/* ------------------------- Inicio ------------------------------------- */
async function init() {
  buildCountryGrid();
  wireEvents();

  // 1) Datos del fixture
  $("#status").innerHTML = `<div class="spinner"></div>Cargando fixture del Mundial…`;
  try {
    state.data = await loadData();
    $("#status").innerHTML = "";
    $("#footer-updated").textContent = state.data.updatedAt
      ? `Actualizado: ${parseUTC(state.data.updatedAt)?.toLocaleString("es") || state.data.updatedAt} · ${state.data.count} partidos`
      : "";
  } catch (err) {
    $("#status").innerHTML = `<div class="error">No se pudo cargar el fixture (${err.message}). Reintentá en unos minutos.</div>`;
  }

  // 2) Tema: elección guardada o autodetección por país
  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch {}
  if (stored === "__NEUTRAL__") {
    applyTheme(null);
  } else if (stored && TEAMS[stored]) {
    applyTheme(stored);
  } else {
    applyTheme(null); // base mientras detecta
    const code = await detectCountry();
    const team = code && CODE_TO_TEAM[code];
    if (team) applyTheme(team);
  }

  // 3) Refresco en vivo
  setInterval(async () => {
    try {
      const fresh = await loadData();
      state.data = fresh;
      $("#footer-updated").textContent = fresh.updatedAt
        ? `Actualizado: ${parseUTC(fresh.updatedAt)?.toLocaleString("es") || fresh.updatedAt} · ${fresh.count} partidos`
        : "";
      render();
    } catch {}
  }, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", init);
