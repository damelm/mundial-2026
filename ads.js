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
    logo: { img: "ads/northstar.png", alt: "NorthStar — consultoría integral" },
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
