const MAX_REVIEWS = 5000;
const DAY = 86400;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});
const clean = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const norm = value => clean(value).toLowerCase();
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function clientKey(request) { return request.headers.get('CF-Connecting-IP') || 'unknown'; }

export async function onRequestGet({ env }) {
  if (!env.NEXTAUTO_REVIEWS) return json({ error: 'Falta configurar el binding KV NEXTAUTO_REVIEWS en Cloudflare Pages.' }, 503);
  const reviews = [];
  let cursor;
  do {
    const page = await env.NEXTAUTO_REVIEWS.list({ prefix: 'review:', limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const key of page.keys) {
      const value = await env.NEXTAUTO_REVIEWS.get(key.name, 'json');
      if (value && value.id && value.nombre && value.texto) reviews.push(value);
      if (reviews.length >= MAX_REVIEWS) break;
    }
    cursor = page.list_complete || reviews.length >= MAX_REVIEWS ? undefined : page.cursor;
  } while (cursor);
  reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json({ reviews: reviews.map(({ id, nombre, estrellas, texto, foto, fecha }) => ({ id, nombre, estrellas, texto, ...(foto ? { foto } : {}), fecha })) });
}

export async function onRequestPost({ request, env }) {
  if (!env.NEXTAUTO_REVIEWS) return json({ error: 'Falta configurar el binding KV NEXTAUTO_REVIEWS en Cloudflare Pages.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, 400); }
  if (typeof body.website === 'string' && body.website.trim()) return json({ error: 'No fue posible validar el envío.' }, 400);
  const nombre = clean(body.nombre);
  const texto = String(body.texto || '').trim().replace(/\r/g, '');
  const estrellas = Number(body.estrellas);
  const foto = typeof body.foto === 'string' ? body.foto : '';
  if (nombre.length < 2 || nombre.length > 60 || /[<>\u0000-\u001f]/.test(nombre)) return json({ error: 'El nombre debe tener entre 2 y 60 caracteres válidos.' }, 400);
  if (texto.length < 10 || texto.length > 600 || /<\s*script\b/i.test(texto)) return json({ error: 'La reseña debe tener entre 10 y 600 caracteres.' }, 400);
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return json({ error: 'La calificación debe estar entre 1 y 5 estrellas.' }, 400);
  if (foto && (!/^data:image\/(jpeg|png|webp);base64,/i.test(foto) || foto.length > 900000)) return json({ error: 'La foto no es válida o supera el tamaño permitido.' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const ipHash = await sha256(clientKey(request));
  const rateKey = `rate:${ipHash}:${Math.floor(now / 3600)}`;
  const count = Number(await env.NEXTAUTO_REVIEWS.get(rateKey) || 0);
  if (count >= 3) return json({ error: 'Has enviado demasiadas reseñas. Intenta de nuevo más tarde.' }, 429);
  await env.NEXTAUTO_REVIEWS.put(rateKey, String(count + 1), { expirationTtl: 3700 });

  const fingerprint = await sha256(`${norm(nombre)}|${norm(texto)}`);
  const duplicate = await env.NEXTAUTO_REVIEWS.get(`duplicate:${fingerprint}`);
  if (duplicate) return json({ error: 'Ya existe una reseña igual o muy similar.' }, 409);
  const review = {
    id: crypto.randomUUID(), nombre, estrellas, texto,
    ...(foto ? { foto } : {}),
    fecha: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString()
  };
  await env.NEXTAUTO_REVIEWS.put(`review:${review.createdAt}:${review.id}`, JSON.stringify(review));
  await env.NEXTAUTO_REVIEWS.put(`duplicate:${fingerprint}`, review.id, { expirationTtl: 60 * DAY });
  return json({ ok: true, review }, 201);
}
