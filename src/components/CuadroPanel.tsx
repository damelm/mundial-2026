/* Panel del Cuadro (cargado bajo demanda): título + la Firma + contexto. */

import { STAGE_ES, aliveTeams, type KoMatch } from "../lib/ko";
import { Cuadro, CuadroExtras } from "./Cuadro";
import { MatchRow, SectionTitle } from "./rows";

export function CuadroPanel({ matches }: { matches: KoMatch[] | null }) {
  if (!matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <span className="font-mono text-xs text-muted">Armando el cuadro…</span>
      </div>
    );
  }
  const alive = aliveTeams(matches).size;
  const next = matches.find((m) => !m.finished && !m.live);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
        La Firma · Cuadro
      </p>
      <h1
        className="mt-1 text-[34px] leading-[1.02] text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        EL CAMINO
        <br />A <span className="text-gold">LA FINAL</span>
      </h1>
      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-normal text-muted">
        La senda dorada se enciende con cada equipo que avanza.{" "}
        {alive > 0 && `${alive} selecciones siguen con vida.`}
      </p>

      <Cuadro matches={matches} />
      <CuadroExtras matches={matches} />

      {next && (
        <>
          <SectionTitle title="Próximo paso" tag={STAGE_ES[next.stage]} />
          <MatchRow m={next} matches={matches} />
        </>
      )}
    </div>
  );
}
