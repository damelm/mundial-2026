/* ads.js — Auspiciantes del banner rotativo (zona in-feed del fixture).
 * Para sumar/editar un anunciante, agregá o cambiá un objeto en SPONSORS.
 *
 * Campos:
 *   name      Nombre (se muestra como texto salvo en layout "full").
 *   tagline   Frase corta (layout "mark"). En "full" se omite (va en el logo).
 *   url       A dónde lleva al tocar el banner (se abre en pestaña nueva).
 *   layout    "mark" = símbolo chico + nombre + frase   |   "full" = logo completo.
 *   bg        Fondo del slot (cada marca trae el suyo).
 *   border    Color del borde/acento.
 *   nameColor Color del nombre (layout "mark").
 *   ico       Ícono de destino: "ig" (Instagram) | "shop" (tienda).
 *   icoColor  Color del ícono.
 *   logo      { svg: "<svg…>" }  ó  { img: "ruta.png", alt: "…" }
 */
const SPONSORS = [
  {
    name: "NORTHSTAR",
    tagline: "Marcamos el norte de tu empresa",
    url: "https://www.instagram.com/northstar.py",
    layout: "mark",
    bg: "#FBF8F1", border: "#EAD9A8", nameColor: "#1B2A5B",
    ico: "ig", icoColor: "#1B2A5B",
    // Recreación vectorial (monograma NS + estrella polar). Reemplazar por el
    // archivo oficial cuando esté disponible: logo: { img: "ads/northstar.png", alt: "NorthStar" }
    logo: { svg: '<svg width="42" height="42" viewBox="0 0 50 50" aria-hidden="true"><path d="M10 40 Q22 24 40 14" stroke="#E3A82B" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M39 7l2.2 5.4L46.5 14l-5.3 1.8L39 21l-2.2-5.2L31.5 14l5.3-1.6z" fill="#E3A82B"/><text x="6" y="40" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#1B2A5B">N</text><text x="26" y="44" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#1B2A5B">S</text></svg>' },
  },
  {
    name: "CYJ3D",
    tagline: "Impresiones 3D personalizadas",
    url: "https://cyj3d.mitiendanube.com/",
    layout: "mark",
    bg: "#ffffff", border: "#bcdcf2", nameColor: "#1d5a8a",
    ico: "shop", icoColor: "#2a7fc1",
    logo: { img: "ads/cyj3d.png", alt: "CYJ3D — impresiones 3D" },
  },
  {
    name: "Nexo Store",
    url: "https://nexostoreoficial.com.ar/",
    layout: "full",
    bg: "#0b0b12", border: "#2b2b3c",
    ico: "shop", icoColor: "#e8e8f0",
    logo: { img: "ads/nexostore.png", alt: "Nexo Store — todo en un lugar" },
  },
];

// Tiempo entre rotaciones (ms). 4s da para leer la frase sin marear.
const AD_ROTATE_MS = 4000;
