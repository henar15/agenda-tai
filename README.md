# Mi agenda TAI

Agenda de estudio para la oposición de Técnico Auxiliar de Informática del Estado (TAI): planning semanal, temario, tarjetas, tests con penalización, «Mis errores», simulacros y juegos.

Web: https://henar15.github.io/agenda-tai/

## Contenido
- `data/temas.json`: los 34 temas del programa (BOE 26‑nov‑2026).
- `data/temas/<tema>.cards.json`: tarjetas de cada tema (`"t": true` = típica de examen).
- `data/temas/<tema>.preguntas.json`: banco de preguntas tipo test.
- `data/tests.json`: tests guardados.
- `data/plan.json`: planning semana a semana.
- `data/progreso-inicial.json`: progreso con el que arranca la web la primera vez.

## Guardar el progreso en la nube (Firebase)
1. Crea un proyecto en https://console.firebase.google.com
2. Activa **Authentication → Google** y añade `henar15.github.io` en *Authorized domains*.
3. Activa **Firestore** y pega las reglas de `firestore.rules`.
4. Copia la configuración web (`firebaseConfig`) en `firebase-config.js`.

Sin Firebase, la web guarda el progreso en el navegador.
