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

export function useKo(): KoState {
  const [matches, setMatches] = useState<KoMatch[] | null>(null);
  const [loading, setLoading] = useState(true);
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
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { matches, loading, error, refresh: load };
}
