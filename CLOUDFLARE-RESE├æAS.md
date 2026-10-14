# NextAuto: reseñas compartidas en Cloudflare Pages

## Qué se corrigió
- Las reseñas de ejemplo se retiraron; no se presentan testimonios ficticios.
- Las reseñas reales se leen y guardan mediante `functions/api/reviews.js`, compartidas por todos los visitantes.
- Validación en cliente y servidor: campos obligatorios, longitud, calificación, imagen, campo trampa antispam, límite de 3 envíos por IP/hora y detección de duplicados durante 60 días.
- Música con intento de reproducción automática, bucle y volumen 22%; si el navegador bloquea audio audible, intenta reproducir en silencio y habilitar el sonido con la primera interacción.
- El reproductor se queda únicamente en `index.html`, evitando audio duplicado en el iframe `configurador.html`.

## Activar reseñas en Cloudflare Pages (requerido)
1. En Cloudflare, abre **Workers & Pages** y crea un **KV namespace** llamado, por ejemplo, `NEXTAUTO_REVIEWS`.
2. En tu proyecto Pages: **Settings → Functions → KV namespace bindings**.
3. Añade un binding con variable **`NEXTAUTO_REVIEWS`** y selecciona el namespace que creaste.
4. Vuelve a desplegar el sitio. Comprueba `https://TU-DOMINIO/api/reviews`; debe devolver `{"reviews":[]}` al comenzar.
5. El formulario para escribir una reseña aparece directamente en la sección “Lo que dicen nuestros clientes”. El botón “Escribir una reseña” desplaza al formulario; ya no se envía al usuario a WhatsApp.

Si no se configura el binding KV, la API responde con un error 503 y no podrá guardar reseñas compartidas. No se requiere clave API en el navegador.

## Ejecución local alternativa
El archivo `server.js` ofrece una API Express local con almacenamiento en `data/reviews.json`:

```bash
npm install
npm start
```

Después abre `http://localhost:3000`. En producción, el almacenamiento JSON del servidor Express requiere un disco persistente; en Cloudflare Pages se usa KV.

## Música
Los navegadores pueden bloquear la reproducción automática con sonido. El código lo intenta y usa silencio como alternativa permitida; el sonido se habilita en el primer gesto del visitante. No existe una forma legítima de garantizar sonido audible antes de la interacción en todos los navegadores.
