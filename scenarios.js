/* scenarios.js — Motor de escenarios de clasificación · Mundial 2026
 *
 * Puro (sin DOM): recibe la lista de partidos de fase de grupos y responde
 *   - el estado de un equipo: clasificado / eliminado / depende
 *   - "qué se juega" un partido: qué le pasa a cada equipo si gana/empata/pierde
 *   - si el partido REALMENTE define algo (para no mostrar ruido)
 *
 * Top-2: exacto, por fuerza bruta de los partidos que faltan en el grupo
 * (a lo sumo 3^6 = 729 combinaciones). Terceros: por cotas cruzando los 12
 * grupos (los 8 mejores clasifican). Lo que depende de los goles o de otros
 * grupos se marca "depende" en vez de inventar certezas.
 *
 * Trabaja a nivel de PUNTOS para las garantías; cuando un desempate fino
 * (diferencia de gol / goles) puede cambiar el resultado, devuelve "depende".
 *
 * Funciona como módulo (Node, para tests) o como global window.Scenarios.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.Scenarios = mod;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const QUALIFY_THIRDS = 8; // mejores terceros que pasan a 32avos

  // ---- detección de partido terminado (se puede sobreescribir vía opts) ----
  function defaultIsFinal(m) {
    if (m.live === true) return false;
    const s = String(m.status || "").toUpperCase();
    if (/FT|AET|\bPEN\b|FINISH|\bAP\b/.test(s)) return true;
    if (m.homeScore != null && m.awayScore != null && s !== "NS" && s !== "") return true;
    return false;
  }
  const decided = (m, isFinal) => isFinal(m) && m.homeScore != null && m.awayScore != null;

  // ---- datos de un grupo: equipos, jugados, pendientes ----
  function groupData(matches, group, isFinal) {
    const gm = matches.filter((m) => m.stage === "GROUP" && m.group === group);
    const teams = [];
    for (const m of gm) for (const tn of [m.home, m.away]) if (tn && !teams.includes(tn)) teams.push(tn);
    const played = [], remaining = [];
    for (const m of gm) {
      if (decided(m, isFinal)) played.push({ home: m.home, away: m.away, hs: m.homeScore, as: m.awayScore });
      else if (m.home && m.away) remaining.push({ home: m.home, away: m.away, id: String(m.id) });
    }
    return { teams, played, remaining };
  }

  // tabla base (pj/pts/gf/gc) desde partidos jugados
  function tally(teams, played) {
    const t = {};
    for (const n of teams) t[n] = { team: n, pj: 0, gf: 0, gc: 0, pts: 0 };
    for (const r of played) {
      const H = t[r.home], A = t[r.away];
      if (!H || !A) continue;
      H.pj++; A.pj++; H.gf += r.hs; H.gc += r.as; A.gf += r.as; A.gc += r.hs;
      if (r.hs > r.as) { H.pts += 3; }
      else if (r.hs < r.as) { A.pts += 3; }
      else { H.pts++; A.pts++; }
    }
    return t;
  }

  // enumera los 3^n desenlaces de `remaining` y devuelve, por escenario, los
  // PUNTOS finales de cada equipo. (los goles no se enumeran: para garantías
  // alcanza con puntos; los empates de puntos se tratan como "depende".)
  function scenarios(teams, played, remaining) {
    const base = tally(teams, played);
    const basePts = {};
    for (const n of teams) basePts[n] = base[n].pts;
    const out = [];
    const n = remaining.length;
    const rec = (i, pts) => {
      if (i === n) { out.push(Object.assign({}, pts)); return; }
      const { home, away } = remaining[i];
      // local gana
      let p = Object.assign({}, pts); p[home] += 3; rec(i + 1, p);
      // empate
      p = Object.assign({}, pts); p[home] += 1; p[away] += 1; rec(i + 1, p);
      // visitante gana
      p = Object.assign({}, pts); p[away] += 3; rec(i + 1, p);
    };
    rec(0, basePts);
    return { base, scenarios: out };
  }

  // posición (peor caso) de un equipo dentro de un escenario de puntos
  // worstRank: si todos los empatados en pts quedaran por encima.
  // bestRank: si quedara por encima de todos los empatados.
  function ranks(team, pts) {
    const mine = pts[team];
    let better = 0, equal = 0;
    for (const k in pts) {
      if (k === team) continue;
      if (pts[k] > mine) better++;
      else if (pts[k] === mine) equal++;
    }
    return { best: better + 1, worst: better + equal + 1 };
  }

  // resumen de un equipo sobre un conjunto de escenarios
  function summarize(team, scen) {
    let guaranteedTop2 = true, guaranteedFirst = true, canTop2 = false, canTop3 = false;
    let maxThirdPts = -1; // máximos puntos con los que podría quedar 3.º
    for (const s of scen) {
      const r = ranks(team, s);
      if (r.worst > 2) guaranteedTop2 = false;
      if (r.worst > 1) guaranteedFirst = false;
      if (r.best <= 2) canTop2 = true;
      if (r.best <= 3) canTop3 = true;
      // puede quedar 3.º en este escenario si no está garantizado top2 y el
      // mejor caso lo deja 3.º o peor pero alcanzable como 3.º
      if (r.best <= 3 && r.worst >= 3) maxThirdPts = Math.max(maxThirdPts, s[team]);
    }
    return { guaranteedTop2, guaranteedFirst, canTop2, canTop3, maxThirdPts };
  }

  // rango de puntos del 3.º de un grupo (sobre sus propios escenarios)
  // devuelve { min, max } de los puntos que tendrá el equipo que salga 3.º.
  function thirdPtsRange(matches, group, isFinal) {
    const { teams, played, remaining } = groupData(matches, group, isFinal);
    if (teams.length < 3) return null;
    const { scenarios: scen } = scenarios(teams, played, remaining);
    let min = Infinity, max = -Infinity;
    for (const s of scen) {
      // puntos del 3.º = 3.º valor más alto
      const vals = teams.map((t) => s[t]).sort((a, b) => b - a);
      const third = vals[2];
      if (third < min) min = third;
      if (third > max) max = third;
    }
    return { min, max };
  }

  // ¿un equipo que queda 3.º con `pts` puntos, clasifica como mejor tercero?
  // 'in' (seguro) / 'out' (imposible) / 'depends'. Compara contra el rango de
  // los terceros de los OTROS grupos (cota por puntos, ignora desempate fino).
  function thirdOutlook(matches, group, pts, isFinal) {
    const others = [...new Set(matches.filter((m) => m.stage === "GROUP" && m.group && m.group !== group).map((m) => m.group))];
    let surelyAbove = 0; // grupos cuyo 3.º quedará SÍ o SÍ por encima
    let maybeAbove = 0;  // grupos cuyo 3.º PODRÍA quedar por encima
    for (const g of others) {
      const r = thirdPtsRange(matches, g, isFinal);
      if (!r) continue;
      if (r.min > pts) { surelyAbove++; maybeAbove++; }
      else if (r.max > pts) { maybeAbove++; }
    }
    if (surelyAbove >= QUALIFY_THIRDS) return "out";     // 8+ seguros arriba → no entra
    if (maybeAbove < QUALIFY_THIRDS) return "in";        // ni en el peor caso lo superan 8 → entra
    return "depends";
  }

  // ---- API: estado de un equipo (incondicional) ----
  // status: 'first' | 'through' | 'out' | 'alive'
  function teamStatus(matches, group, team, opts) {
    opts = opts || {};
    const isFinal = opts.isFinal || defaultIsFinal;
    const { teams, played, remaining } = groupData(matches, group, isFinal);
    if (!teams.includes(team)) return null;
    const { scenarios: scen } = scenarios(teams, played, remaining);
    const sm = summarize(team, scen);
    if (sm.guaranteedFirst) return { status: "first", note: "1.º asegurado" };
    if (sm.guaranteedTop2) return { status: "through", note: "clasificado" };
    if (!sm.canTop3) return { status: "out", note: "eliminado" };
    // No puede asegurar top-2. Ser 3.º nunca está garantizado (depende de
    // ganar y de otros grupos), así que el 3.º sólo sirve para DESCARTAR:
    // si ni en su mejor caso como 3.º entra, está eliminado.
    if (!sm.canTop2 && sm.maxThirdPts >= 0) {
      if (thirdOutlook(matches, group, sm.maxThirdPts, isFinal) === "out")
        return { status: "out", note: "eliminado" };
    }
    return { status: "alive", note: "depende" };
  }

  // ---- API: qué se juega un partido ----
  // Para CADA equipo del partido, qué bucket le toca si gana/empata/pierde.
  // bucket de resultado: 'first' | 'through' | 'out' | 'depends'
  function matchStakes(matches, matchId, opts) {
    opts = opts || {};
    const isFinal = opts.isFinal || defaultIsFinal;
    const m = matches.find((x) => String(x.id) === String(matchId));
    if (!m || m.stage !== "GROUP" || !m.group) return null;
    if (decided(m, isFinal)) return { matters: false, decided: true, home: null, away: null };

    const group = m.group;
    const { teams, played, remaining } = groupData(matches, group, isFinal);
    const idx = remaining.findIndex((r) => r.id === String(m.id));
    if (idx < 0) return { matters: false, home: null, away: null };

    // escenarios separados por el resultado de ESTE partido
    const fixed = (outcome) => {
      // partidos pendientes con este fijado
      const rem2 = remaining.filter((_, i) => i !== idx);
      const played2 = played.concat([
        outcome === "H" ? { home: m.home, away: m.away, hs: 1, as: 0 } :
        outcome === "A" ? { home: m.home, away: m.away, hs: 0, as: 1 } :
                          { home: m.home, away: m.away, hs: 0, as: 0 },
      ]);
      return scenarios(teams, played2, rem2).scenarios;
    };

    const evalTeam = (team, scen) => {
      const sm = summarize(team, scen);
      if (sm.guaranteedFirst) return "first";
      if (sm.guaranteedTop2) return "through";
      if (!sm.canTop3) return "out";
      if (!sm.canTop2 && sm.maxThirdPts >= 0 &&
          thirdOutlook(matches, group, sm.maxThirdPts, isFinal) === "out") return "out";
      return "depends";
    };

    const perTeam = (team) => ({
      team,
      win: evalTeam(team, fixed(team === m.home ? "H" : "A")),
      draw: evalTeam(team, fixed("D")),
      lose: evalTeam(team, fixed(team === m.home ? "A" : "H")),
    });

    const home = perTeam(m.home);
    const away = perTeam(m.away);
    // "se juega algo" si para algún equipo no es el mismo bucket en G/E/P
    const stake = (o) => !(o.win === o.draw && o.draw === o.lose);
    const matters = stake(home) || stake(away);
    return { matters, group, home, away };
  }

  return {
    QUALIFY_THIRDS,
    defaultIsFinal,
    groupData,
    teamStatus,
    matchStakes,
    _internal: { tally, scenarios, summarize, thirdPtsRange, thirdOutlook, ranks },
  };
});
