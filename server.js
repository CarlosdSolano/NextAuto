'use strict';
const express = require('express');
const helmet = require('helmet');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'reviews.json');
const MAX_REVIEWS = 5000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const rateLimits = new Map();
const recentText = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]\n', { flag: 'wx' });
function readReviews() {
  try { const x = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); return Array.isArray(x) ? x : []; }
  catch (e) { console.error('No se pudo leer data/reviews.json:', e.message); return []; }
}
function saveReviews(reviews) {
  const temp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(reviews, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DB_FILE);
}
function normalizeText(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
function rateLimit(req, res, next) {
  const now = Date.now();
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  let entry = rateLimits.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) entry = { start: now, count: 0 };
  entry.count += 1; rateLimits.set(key, entry);
  if (entry.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Has enviado demasiadas reseñas. Intenta de nuevo más tarde.' });
  next();
}
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '1.5mb', strict: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'NextAuto reviews API' }));
app.get('/api/reviews', (_req, res) => {
  const reviews = readReviews().slice(0, MAX_REVIEWS).map(({ id, nombre, estrellas, texto, foto, fecha }) => ({ id, nombre, estrellas, texto, ...(foto ? { foto } : {}), fecha }));
  res.set('Cache-Control', 'no-store');
  res.json({ reviews });
});
app.post('/api/reviews', rateLimit, (req, res) => {
  const body = req.body || {};
  // Campo trampa para bots sencillos.
  if (typeof body.website === 'string' && body.website.trim()) return res.status(400).json({ error: 'No fue posible validar el envío.' });
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().replace(/\s+/g, ' ') : '';
  const texto = typeof body.texto === 'string' ? body.texto.trim().replace(/\r/g, '') : '';
  const estrellas = Number(body.estrellas);
  const foto = typeof body.foto === 'string' ? body.foto : '';
  if (nombre.length < 2 || nombre.length > 60 || /[<>\u0000-\u001f]/.test(nombre)) return res.status(400).json({ error: 'El nombre debe tener entre 2 y 60 caracteres válidos.' });
  if (texto.length < 10 || texto.length > 600 || /<\s*script\b/i.test(texto)) return res.status(400).json({ error: 'La reseña debe tener entre 10 y 600 caracteres.' });
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5 estrellas.' });
  if (foto && (!/^data:image\/(jpeg|png|webp);base64,/i.test(foto) || foto.length > 900000)) return res.status(400).json({ error: 'La foto no es válida o supera el tamaño permitido.' });
  const now = Date.now();
  const fingerprint = crypto.createHash('sha256').update(`${normalizeText(nombre)}|${normalizeText(texto)}`).digest('hex');
  const previous = recentText.get(fingerprint);
  if (previous && now - previous < 30 * 24 * 60 * 60 * 1000) return res.status(409).json({ error: 'Ya existe una reseña igual o muy similar.' });
  const reviews = readReviews();
  const review = { id: crypto.randomUUID(), nombre, estrellas, texto, ...(foto ? { foto } : {}), fecha: new Date().toISOString().slice(0, 10) };
  reviews.unshift(review);
  saveReviews(reviews.slice(0, MAX_REVIEWS));
  recentText.set(fingerprint, now);
  res.status(201).json({ ok: true, review });
});
app.use(express.static(__dirname, { extensions: ['html'], etag: true, maxAge: '1h', index: 'index.html' }));
app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'El envío supera el tamaño permitido.' });
  console.error(err);
  res.status(400).json({ error: 'Solicitud inválida.' });
});
app.listen(PORT, HOST, () => console.log(`NextAuto disponible en http://${HOST}:${PORT}`));
