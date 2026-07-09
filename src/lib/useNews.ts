/* Titulares del Mundial desde data/news.json (Google News RSS vía el workflow
 * update-news, gratis y sin claves). Se leen del raw del repo con cache-bust
 * horario; si no están disponibles, la app no muestra la sección.
 */

import { useEffect, useState } from "react";

export interface Headline {
  t: string;
  src: string;
  u: string;
}

export interface News {
  updatedAt: string;
  items: Headline[];
}

const NEWS_URL =
  import.meta.env.VITE_NEWS_URL ??
  "https://raw.githubusercontent.com/damelm/mundial-2026/main/data/news.json";

export function useNews(): News | null {
  const [news, setNews] = useState<News | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${NEWS_URL}?t=${Math.floor(Date.now() / 3_600_000)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.es?.length)
          setNews({ updatedAt: j.updatedAt ?? "", items: j.es });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return news;
}
