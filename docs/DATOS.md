# Formato de los datos

Todo el contenido está en `data/` en JSON. La app lo lee al arrancar, así que para añadir contenido basta con añadir o editar estos archivos.

## `data/temas.json`

Lista de los 34 temas:

```json
{ "id": "I-1", "bloque": "I", "codigo": "I.1", "orden": 1, "titulo": "La Constitución Española de 1978",
  "semana": 1, "pags": 59, "pagIni": 3, "tarjetas": true, "preguntas": true, "esquema": true }
```

`tarjetas`, `preguntas` y `esquema` indican qué archivos existen en `data/temas/` para ese tema.

## `data/temas/<id>.cards.json` — tarjetas

```json
{ "tema": "I-1", "cards": [
  { "id": "i1c1", "n": "1", "e": "📜", "t": true, "q": "¿Cuándo se aprobó en referéndum?", "a": "El **6 de diciembre de 1978**", "h": "Día de la Constitución" }
] }
```

| Campo | Significado |
|---|---|
| `id` | Único en toda la app (prefijo del tema) |
| `e` | Emoji de la tarjeta |
| `t` | `true` si es típica de examen |
| `q` / `a` | Pregunta y respuesta (lo importante en `**negrita**`) |
| `h` | Pista (opcional) |

## `data/temas/<id>.preguntas.json` — test del tema

```json
{ "tema": "I-1", "preguntas": [
  { "id": "i1-01", "tipico": true, "q": "…", "opts": ["a", "b", "c", "d"], "c": 2, "exp": "Explicación breve" }
] }
```

`c` es el índice (0–3) de la respuesta correcta.

## `data/temas/<id>.esquema.json` — esquema visual

```json
{ "tema": "I-1", "ramas": [
  { "e": "📜", "t": "Origen y estructura", "items": ["Referéndum: **6 de diciembre de 1978**"] }
] }
```

Entre 4 y 7 ramas con ideas muy cortas.

## `data/examenes/` — exámenes oficiales

`index.json` lista los exámenes. Cada examen:

```json
{ "id": "tai-l-2025", "titulo": "…", "fecha": "2026-05-23", "plantilla": "definitiva", "fuente": "https://www.inap.es/…",
  "partes": [
    { "id": "p1", "titulo": "Primera parte", "preguntas": [ { "id": "p1-1", "n": 1, "q": "…", "opts": ["…"], "c": 0, "tema": "I-1", "bloque": "I" } ], "reserva": [] },
    { "id": "s1", "titulo": "Supuesto Bloque III", "bloques": ["III"], "enunciado": "…", "preguntas": [] }
  ] }
```

Las preguntas anuladas llevan `"anulada": true`.

## `data/privado/`

Material que no puede ser público, cifrado con AES-GCM. Solo se descifra en el navegador con una clave guardada en la cuenta de Firestore de quien tiene acceso.
