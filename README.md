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

## 📝 Notas

- Los datos provienen de TheSportsDB; los horarios y cruces de eliminatorias se van
  completando/ajustando a medida que la fuente los confirma.
- Las banderas usan emojis: en Android/iOS se ven perfectas; en Windows se muestran
  como las dos letras del país (limitación del sistema, no de la app).

---
Datos: [TheSportsDB](https://www.thesportsdb.com) · Hecho con ⚽
