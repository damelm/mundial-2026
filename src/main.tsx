import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import type { KoMatch } from "./lib/ko";

declare global {
  interface Window {
    __KO__?: KoMatch[];
  }
}

function mount() {
  const root = createRoot(document.getElementById("root")!);
  // Render concurrente: React trocea el montaje en tareas cortas y no
  // bloquea el hilo principal (el prerender sigue visible mientras tanto).
  startTransition(() => {
    root.render(
      <StrictMode>
        <App initialData={window.__KO__ ?? null} />
      </StrictMode>,
    );
  });
}

// Con prerender: dejar que el HTML estático pinte un frame antes de que
// React reemplace el DOM (primer paint sin depender del bundle).
if (window.__KO__) {
  requestAnimationFrame(() => requestAnimationFrame(mount));
} else {
  mount();
}
