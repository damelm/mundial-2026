/* Auspiciantes del banner rotativo (curado a mano, no una red de ads).
 * Para sumar o editar una marca, agregá/cambiá un objeto en SPONSORS.
 *
 *   name     Nombre de la marca.
 *   tagline  Frase corta (una línea).
 *   url      A dónde lleva al tocar (se abre en pestaña nueva).
 *   logo     Archivo en public/ads/ (se resuelve con el base path).
 *   alt      Texto alternativo del logo.
 *   tileBg   Fondo del tile donde vive el logo (cada marca trae el suyo;
 *            los logos son claros y así se leen sobre el fondo oscuro).
 *   accent   Color de acento (borde/ícono/puntito activo).
 *   dest     Destino del enlace: "ig" (Instagram) | "shop" (tienda).
 */
export type Sponsor = {
  name: string;
  tagline: string;
  url: string;
  logo: string;
  alt: string;
  tileBg: string;
  accent: string;
  dest: "ig" | "shop";
};

const AD = `${import.meta.env.BASE_URL}ads/`;

export const SPONSORS: Sponsor[] = [
  {
    name: "NorthStar",
    tagline: "Marcamos el norte de tu empresa",
    url: "https://www.instagram.com/northstar.py",
    logo: `${AD}northstar.png`,
    alt: "NorthStar — consultoría integral",
    tileBg: "#FBF8F1",
    accent: "#c9a24a",
    dest: "ig",
  },
  {
    name: "CYJ3D",
    tagline: "Impresiones 3D personalizadas",
    url: "https://cyj3d.mitiendanube.com/",
    logo: `${AD}cyj3d.png`,
    alt: "CYJ3D — impresiones 3D",
    tileBg: "#ffffff",
    accent: "#2a7fc1",
    dest: "shop",
  },
  {
    name: "Nexo Store",
    tagline: "Todo en un solo lugar",
    url: "https://nexostoreoficial.com.ar/",
    logo: `${AD}nexostore.png`,
    alt: "Nexo Store — todo en un lugar",
    tileBg: "#0b0b12",
    accent: "#8a93ff",
    dest: "shop",
  },
  {
    name: "Mister Cotillón",
    tagline: "Cotillón y decoración · Fdo. de la Mora",
    url: "https://www.instagram.com/mistercotillonnf/",
    logo: `${AD}mistercotillon.png`,
    alt: "Mister Cotillón — decoración y accesorios para fiestas",
    tileBg: "#FBF3F8",
    accent: "#c0608a",
    dest: "ig",
  },
];

/* Tiempo entre rotaciones (ms). ~5s alcanza para leer la frase sin marear. */
export const AD_ROTATE_MS = 5200;
