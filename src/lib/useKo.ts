/* Hook de datos KO: descarga el calendario al montar y lo refresca solo.
 * Cadencia: 30 s si hay partido en juego, 90 s si no. También refresca al
 * volver la pestaña a primer plano (visibilitychange).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchKoSchedule, type KoMatch } from "./ko";

export interface KoState {
  matches: KoMatch[] | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

export function useKo(initial: KoMatch[] | null = null): KoState {
  const [matches, setMatches] = useState<KoMatch[] | null>(initial);
  const [loading, setLoading] = useState(initial === null);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const data = await fetchKoSchedule();
    if (!alive.current) return;
    if (data) {
      setMatches(data);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
    const anyLive = data?.some((m) => m.live) ?? false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, anyLive ? 30_000 : 90_000);
  }, []);

  useEffect(() => {
    alive.current = true;
    // Con datos prerenderizados, el primer refresh espera a que la página
    // asiente (no compite con el primer render en el hilo principal).
    let boot: ReturnType<typeof setTimeout> | null = null;
    if (initial) boot = setTimeout(load, 2500);
    else load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      if (boot) clearTimeout(boot);
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { matches, loading, error, refresh: load };
}
