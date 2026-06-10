# 🏆 Mundial 2026 — Fixture en vivo y temático

Web app del **fixture completo del Mundial 2026** (USA · Canadá · México), en tiempo real
y **temática según el país desde el que te conectás**. Si entrás desde Argentina se viste
de Argentina, con sus datos y curiosidades; lo mismo para cualquiera de las 48 selecciones.
Hay un selector para cambiar de país cuando quieras.

🔗 **En vivo:** https://damelm.github.io/mundial-2026

## ✨ Características

- **Fixture completo** por jornada o por grupo, con escudos, sede y **horario en tu hora local**.
- **Estados en vivo**: programado / en vivo / finalizado, con marcadores que se actualizan solos.
- **Tablas de los 12 grupos** calculadas en vivo desde los resultados.
- **Cuadro de eliminatorias** que se completa automáticamente cuando se definen los cruces.
- **Temática por país**: colores, apodo, palmarés y curiosidades de tu selección.
- **Mobile-first**, pensado para Android de gama media. Sin frameworks, carga instantánea.
- **Detección automática del país** por IP + selector manual con buscador.

## 🛠️ Cómo funciona

Sitio estático (HTML + CSS + JS vanilla, sin build). Los datos del fixture viven en
`data/fixture.json`, que un **GitHub Action** regenera cada 15 minutos desde
[TheSportsDB](https://www.thesportsdb.com) (API pública gratuita, sin claves privadas).

```
index.html          → estructura
styles.css          → estilos y animaciones ("estadio vibrante")
app.js              → lógica (fixture, tablas, bracket, temas, hora local)
themes.js           → datos de las 48 selecciones (colores, apodos, curiosidades)
data/fixture.json   → datos que actualiza el Action
scripts/fetch-data.mjs       → baja y normaliza los datos
.github/workflows/update-data.yml → cron cada 15 min
```

## 🔄 Actualización de datos

- **Automática:** cada 15 minutos vía GitHub Actions (no requiere que el sitio esté abierto).
- **Manual:** pestaña *Actions* → *Actualizar fixture Mundial 2026* → *Run workflow*.
- También podés correrlo local: `node scripts/fetch-data.mjs`.

## 🚀 Despliegue y propagación de cambios (PWA)

El sitio es una PWA con Service Worker, así que las versiones viejas pueden quedar
cacheadas en el dispositivo. Para que cualquier cambio de código llegue a **todos**
los usuarios (web y PWA instalada) **sin que tengan que forzar recarga**:

- El workflow **Versionar Service Worker** (`.github/workflows/bump-sw.yml`) estampa
  `sw.js` con un hash del contenido cada vez que cambia el frontend.
- Al cambiar `sw.js`, el navegador instala el SW nuevo y `index.html` hace
  `skip-waiting` + un único `location.reload()` automático.
- **No tenés que tocar la versión a mano.** Solo hacé push de tus cambios a `main`;
  el bump y el deploy de Pages ocurren solos.

> La primera apertura tras un cambio dispara la recarga automática; en una PWA
> instalada puede requerir cerrarla y reabrirla una vez para tomar el SW nuevo.

## 📝 Notas

- **104 partidos**: 72 de fase de grupos (datos en vivo) + 32 de eliminatorias
  (esqueleto que se completa solo cuando TheSportsDB define los cruces).
- **Horarios en tu zona horaria**: los timestamps de la fuente son UTC y se convierten
  a la zona horaria de tu navegador (la del sistema operativo, que es la fuente confiable).
  La geolocalización por IP **no** se usa para la hora —fallaba con VPN, datos móviles o
  proxies y hacía que los horarios "no coincidieran"—; solo define país, idioma y tema.
- **Idioma automático** (ES/EN/PT/FR) según el país detectado, con selector manual.
- **Banderas** como imágenes vectoriales (flagcdn.com), se ven igual en todos los sistemas.
- Identidad visual inspirada en la marca oficial "We Are 26" (negro/dorado + color por
  selección) y animaciones estilo 21st.dev (aurora, beams, meteoros, marquee, scoreboard).

---
Datos: [TheSportsDB](https://www.thesportsdb.com) · Hecho con ⚽

© 2026 damelm · **Todos los derechos reservados.** Código publicado solo por transparencia; ver [LICENSE](LICENSE).
