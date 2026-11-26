# 🐣 Mi agenda TAI

Web gratuita para preparar la oposición de **Técnico Auxiliar de Informática de la Administración del Estado (TAI)**, convocatoria 2026.
Organiza el estudio, te pone a prueba con exámenes oficiales y te mantiene motivada con Pipo, una mascota que crece con tu racha.

👉 **https://henar15.github.io/agenda-tai**

> Cada persona entra con su cuenta de Google y tiene su propio horario, progreso y racha. Sin cuenta solo se ve la portada y una demo.

---

## ✨ Qué tiene

| Sección | Para qué sirve |
|---|---|
| 🏠 **Inicio** | Pipo y tu racha, lo que toca hoy, cuenta atrás al examen, nota estimada, retos de la semana y resumen del día. |
| 🗓️ **Plan** | *Hoy* (páginas que subrayar y tarjetas, se ajusta solo si te retrasas), *Semana*, *Mes* y tu *Horario* editable. |
| 📚 **Temas** | Los 34 temas por bloque, con tarjetas, test y **esquema visual** de cada tema. |
| 🃏 **Tarjetas** | Tarjetas cortas y visuales con **repaso espaciado** (1, 3, 7, 14 y 30 días). |
| 📝 **Exámenes** | Exámenes oficiales completos (2019–2025), preguntas oficiales por tema y bloque, tests de la web, **supuestos** (2.ª parte) y simulacros a medida. Con pistas, corrección al momento o al final, dudosas y penalización de −1/3. |
| 🎮 **Juegos** | Verdadero/falso, Empareja, Completa la frase, **¿Qué artículo es?**, **Ordena la línea temporal**, **Supervivencia** y **Duelo con Pipo**. |
| 📈 **Progreso** | **Puntos débiles** por tema, **historial** de racha y estadísticas, evolución de notas y logros. |
| 🍅 **Pomodoro** | Modo concentración a pantalla completa (– para minimizar, ✕ para parar). |

### 🐣 Pipo, la mascota

Empieza como huevo y va evolucionando hasta fénix según tu racha. Cada día tienes una meta pequeña de puntos (cada tarjeta clasificada o pregunta respondida suma). Hay **escudos** que protegen la racha (uno cada 7 días, máximo 2) y **días de descanso** que no la rompen. Los retos semanales dan premios para Pipo (bufanda, capa, aura).

### 📱 Como app en el móvil

La web se puede **instalar** (Android: botón «Instalar» en Inicio; iPhone: Compartir → «Añadir a pantalla de inicio») y funciona **sin conexión** con lo último que hayas cargado.

### ♿ Accesibilidad

Navegación con teclado y enlace «Saltar al contenido», etiquetas para lector de pantalla, avisos con `role=status`, botón **Aa** para agrandar el texto, contraste revisado y respeto a «reducir movimiento».

---

## 🗂️ Estructura

```
index.html            Página y estilos
app.js                Toda la lógica (vistas, juegos, exámenes, Pipo…)
firebase-config.js    Configuración pública de Firebase
sw.js                 Service worker (modo sin conexión)
manifest.webmanifest  Datos para instalar como app
firestore.rules       Reglas de seguridad de la base de datos
data/
  temas.json          Los 34 temas (bloque, páginas, semana del plan…)
  plan.json           Plan de 26 semanas
  temas/<id>.json     Tarjetas y preguntas de cada tema
  temas/<id>.esquema.json  Esquema visual del tema
  examenes/           Exámenes oficiales del INAP en JSON
  privado/            Material cifrado (solo lo abre quien tiene la clave)
```

Es una web estática (GitHub Pages) sin servidor propio: HTML, CSS y JavaScript sin dependencias ni compilación.

## 🔐 Datos y privacidad

- El inicio de sesión es **solo con Google** (Firebase Authentication).
- El progreso se guarda en **Firestore**, en `users/{uid}` y `users/{uid}/kv/{clave}`. Las reglas (`firestore.rules`) solo permiten a cada persona leer y escribir **sus propios datos**.
- También se guarda una copia en el navegador para que funcione sin conexión.
- En este repositorio **no hay datos personales** ni material de academias. Los tests compartidos en grupos privados están **cifrados** (AES-GCM) y solo se descifran con una clave guardada en la cuenta de quien tiene acceso.

## 🛠️ Montarla tú

1. Haz un fork y activa **GitHub Pages** (rama `main`, carpeta raíz).
2. Crea un proyecto en [Firebase](https://console.firebase.google.com): activa **Authentication → Google** y **Firestore**.
3. Copia la configuración web en `firebase-config.js` y añade tu dominio `*.github.io` en *Authentication → Dominios autorizados*.
4. Pega `firestore.rules` en *Firestore → Reglas* y publica.
5. Para probar en local: `python3 -m http.server` y abre `http://localhost:8000`.

Al cambiar `app.js`, sube la versión (`data-v` y `?v=` en `index.html`, `const V` en `app.js` y `C` en `sw.js`) para que los navegadores no se queden con la versión antigua.

## ➕ Añadir contenido

- **Tarjetas y preguntas de un tema:** `data/temas/<id>.json` con `{"tarjetas":[{"f":"frente","b":"reverso"}], "preguntas":[{"q":"…","opts":["a","b","c","d"],"c":0}]}` y actualiza los contadores en `temas.json`.
- **Esquema visual:** `data/temas/<id>.esquema.json` con `{"tema":"…","ramas":[{"e":"📜","t":"Título","items":["texto con **negrita**"]}]}` y `"esquema":true` en `temas.json`.
- **Examen oficial:** un JSON en `data/examenes/` (partes `p1`, `s1`, `s2` con sus preguntas y `c` = índice de la correcta) y añádelo a `index.json`.

Las tarjetas, preguntas y esquemas de los temas se generan poco a poco de forma automática a partir de los apuntes, sin subir los apuntes al repositorio.

---

Hecho con cariño para opositar con menos agobio. 💜
