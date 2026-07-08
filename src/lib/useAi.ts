/* Textos de IA (previas/resúmenes) generados por GitHub Action → data/ai.json.
 * Se leen del raw del repo con cache-bust horario. Si no existen (secret sin
 * configurar, torneo sin partidos cercanos), la app simplemente no los muestra.
 */

import { useEffect, useState } from "react";

export interface AiText {
  kind: "previa" | "resumen";
  es: string;
}

const AI_URL =
  import.meta.env.VITE_AI_URL ??
  "https://raw.githubusercontent.com/damelm/mundial-2026/main/data/ai.json";

export function useAi(): Record<string, AiText> | null {
  const [texts, setTexts] = useState<Record<string, AiText> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${AI_URL}?t=${Math.floor(Date.now() / 3_600_000)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.texts) setTexts(j.texts);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return texts;
}
