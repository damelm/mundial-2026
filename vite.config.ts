import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Sitio de proyecto: se sirve en https://damelm.github.io/mundial-2026/
export default defineConfig({
  base: "/mundial-2026/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",
      includeAssets: ["favicon.ico", "icons/*.png", "og-image.jpg"],
      manifest: {
        name: "Fix26 · Mundial 2026",
        short_name: "Fix26",
        description: "Eliminatorias del Mundial 2026 en vivo",
        start_url: "/mundial-2026/",
        scope: "/mundial-2026/",
        display: "standalone",
        background_color: "#0A0E1A",
        theme_color: "#0A0E1A",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
