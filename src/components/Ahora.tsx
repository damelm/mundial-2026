/* Panel "Ahora": hero del partido protagonista (en vivo > hoy > próximo)
 * con marcador grande, reloj y "qué se juega"; debajo, el resto del día. */

import { isToday, nextStepText, rawEs, STAGE_ES, fmtDay, fmtTime, type KoMatch } from "../lib/ko";
import { nameEs } from "../data/teams";
import { factFor, headlinesFor } from "../lib/ficha";
import { useNews, type Headline, type News } from "../lib/useNews";
import { Flag } from "./Flag";
import { MatchRow, SectionTitle } from "./rows";
import { NewspaperIcon, SparklesIcon, TrophyIcon } from "./icons";

function clockMinutes(clock: string | null): number | null {
  if (!clock) return null;
  const m = /^(\d+)/.exec(clock);
  return m ? Number(m[1]) : null;
}

function HeroCard({
  m,
  matches,
  news,
}: {
  m: KoMatch;
  matches: KoMatch[];
  news?: Headline[];
}) {
  const stakes = !m.finished ? nextStepText(m, matches) : null;
  const mins = clockMinutes(m.clock);
  const venueCity = m.venue?.split(",")[0] ?? "";

  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-panel/60 p-[18px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: m.live
            ? "radial-gradient(120% 90% at 50% -30%, rgba(255,90,95,0.1), transparent 55%)"
            : "radial-gradient(120% 90% at 50% -30%, rgba(231,184,75,0.08), transparent 55%)",
        }}
      />
      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
          {STAGE_ES[m.stage]}
          {venueCity ? ` · ${venueCity}` : ""}
        </span>
        {m.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-white">
            <span className="dot-live inline-block size-[5px] rounded-full bg-white" />
            EN VIVO
          </span>
        ) : (
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-cyan">
            {isToday(m) ? `HOY · ${fmtTime(m.timestamp)}` : `${fmtDay(m.timestamp)} · ${fmtTime(m.timestamp)}`}
          </span>
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <HeroTeam team={m.home} raw={m.homeRaw} />
        <div
          className="flex items-baseline gap-2 font-mono text-[44px] font-bold tracking-tight text-ink"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span>{m.homeScore ?? "–"}</span>
          <span className="text-[28px] text-gold-dim">–</span>
          <span>{m.awayScore ?? "–"}</span>
        </div>
        <HeroTeam team={m.away} raw={m.awayRaw} />
      </div>

      {m.homePens != null && m.awayPens != null && (
        <p className="relative mt-1 text-center font-mono text-[11px] text-gold">
          Penales {m.homePens}–{m.awayPens}
        </p>
      )}

      {m.live && (
        <div className="relative mt-3.5 flex items-center gap-2.5 font-mono text-xs text-cyan">
          <span>{m.clock || "En juego"}</span>
          <span className="h-[3px] flex-1 overflow-hidden rounded bg-line">
            <span
              className="block h-full rounded bg-gradient-to-r from-gold-dim to-gold transition-[width] duration-1000"
              style={{ width: `${Math.min(100, ((mins ?? 0) / 90) * 100)}%` }}
            />
          </span>
          <span className="text-muted">90'</span>
        </div>
      )}

      {stakes && (
        <p className="relative mt-3.5 flex items-center gap-2 border-t border-line pt-3 text-[12.5px] text-muted">
          <TrophyIcon size={13} className="flex-none text-gold" />
          {stakes}.
        </p>
      )}

      {news && news.length > 0
        ? news.map((h) => (
            <a
              key={h.u}
              href={h.u}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-3 flex gap-2 text-[12.5px] leading-relaxed text-ink/85 hover:text-cyan"
            >
              <NewspaperIcon size={13} className="mt-0.5 flex-none text-cyan" />
              <span>
                {h.t}
                <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {h.src}
                </span>
              </span>
            </a>
          ))
        : !m.finished &&
          factFor(m) && (
            <p className="relative mt-3 flex gap-2 text-[12.5px] leading-relaxed text-ink/85">
              <SparklesIcon size={13} className="mt-0.5 flex-none text-cyan" />
              <span>{factFor(m)}</span>
            </p>
          )}
    </div>
  );
}


function HeroTeam({ team, raw }: { team: string | null; raw: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <Flag team={team} size={36} />
      <span
        className="max-w-full truncate text-center text-[15px] uppercase tracking-wide text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {team ? nameEs(team) : rawEs(raw)}
      </span>
    </div>
  );
}


export function AhoraPanel({
  matches,
  loading,
  error,
}: {
  matches: KoMatch[] | null;
  loading: boolean;
  error: boolean;
}) {
  const news = useNews();
  if (loading && !matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <span className="font-mono text-xs text-muted">
          Cargando eliminatorias…
        </span>
      </div>
    );
  }
  if (!matches) {
    return (
      <div className="grid min-h-[50dvh] place-items-center px-6 text-center">
        <p className="text-sm text-muted">
          No pudimos traer los datos. Revisá la conexión y volvé a intentar.
        </p>
      </div>
    );
  }

  const pending = matches.filter((m) => !m.finished);
  const hero =
    pending.find((m) => m.live) ??
    pending.find((m) => isToday(m)) ??
    pending[0] ??
    null;

  const rest = (list: KoMatch[]) => list.filter((m) => m.id !== hero?.id);
  const live = rest(matches.filter((m) => m.live));
  const today = rest(matches.filter((m) => !m.live && !m.finished && isToday(m)));
  const upcoming = rest(
    matches.filter((m) => !m.live && !m.finished && !isToday(m)),
  ).slice(0, 4);
  const recent = matches.filter((m) => m.finished).slice(-4).reverse();

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
        En vivo
      </p>
      <h1
        className="mt-1 text-[34px] leading-none text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        AHORA
      </h1>
      <p className="mt-2 max-w-[352px] text-[13.5px] leading-normal text-muted">
        Marcadores en tiempo real, el cuadro que se enciende con cada ganador y
        las selecciones que siguen con vida, camino a la final del 19 de julio
        en Nueva York.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-line bg-panel/50 px-3 py-2 text-xs text-muted">
          Sin conexión con el marcador — mostrando los últimos datos.
        </p>
      )}

      {hero && <HeroCard m={hero} matches={matches} news={news ? headlinesFor(hero, news.items) : undefined} />}

      {live.length > 0 && (
        <>
          <SectionTitle title="También en juego" tag={STAGE_ES[live[0].stage]} />
          <div className="flex flex-col gap-2">
            {live.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                matches={matches}
                news={news ? headlinesFor(m, news.items) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {today.length > 0 && (
        <>
          <SectionTitle title="Hoy" tag={STAGE_ES[today[0].stage]} />
          <div className="flex flex-col gap-2">
            {today.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                matches={matches}
                news={news ? headlinesFor(m, news.items) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle title="Próximos" tag={STAGE_ES[upcoming[0].stage]} />
          <div className="flex flex-col gap-2">
            {upcoming.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                matches={matches}
                news={news ? headlinesFor(m, news.items) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionTitle title="Últimos resultados" />
          <div className="flex flex-col gap-2">
            {recent.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                matches={matches}
                news={news ? headlinesFor(m, news.items) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {news && <Titulares news={news} />}
    </div>
  );
}

function Titulares({ news }: { news: News }) {
  const dt = news.updatedAt ? new Date(news.updatedAt) : null;
  return (
    <>
      <SectionTitle
        title="Titulares"
        tag={
          dt
            ? `ACT. ${new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(dt)}`
            : undefined
        }
      />
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-panel/40 px-3.5 py-2">
        {news.items.slice(0, 5).map((h) => (
          <a
            key={h.u}
            href={h.u}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-2 border-b border-line/60 py-2 text-[12.5px] leading-snug text-ink/90 last:border-b-0 hover:text-cyan"
          >
            <NewspaperIcon size={13} className="mt-0.5 flex-none text-cyan" />
            <span>
              {h.t}
              <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {h.src}
              </span>
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
