'use strict';
// Depende de autos.js (CONFIG, PRECIOS_MAX y autos), que se carga antes.

// ========================================
// UTILIDADES
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoNum = new Intl.NumberFormat('es-CO');

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const comportamiento = sinMovimiento ? 'auto' : 'smooth';

function linkWhatsApp(texto = '') {
  const base = `https://wa.me/${CONFIG.whatsapp}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function porcentajeDescuento(auto) {
  return auto.original > auto.precio ? Math.round((1 - auto.precio / auto.original) * 100) : 0;
}

// Recuadro que se muestra cuando la foto del carro no existe
const FOTO_PENDIENTE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#e3eaf6"/>
  <path d="M212 262l38-56q10-14 28-14h84q18 0 28 14l38 56z" fill="#a9bbdb"/>
  <rect x="120" y="246" width="400" height="76" rx="26" fill="#94a9cf"/>
  <circle cx="212" cy="326" r="36" fill="#5c76a3"/><circle cx="212" cy="326" r="14" fill="#e3eaf6"/>
  <circle cx="428" cy="326" r="36" fill="#5c76a3"/><circle cx="428" cy="326" r="14" fill="#e3eaf6"/>
  <text x="320" y="410" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#5c76a3">Foto próximamente</text>
</svg>`);

// Nombre de archivo esperado para el logo de cada marca en img/marcas/
// (ej. "Mercedes-Benz" -> img/marcas/mercedes-benz.png). Si el archivo no existe,
// se muestra automáticamente un escudo con las iniciales de la marca.
function slugMarca(marca) {
  return marca
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '-');
}

function inicialesMarca(marca) {
  return marca.split(/[\s-]+/).map(palabra => palabra[0]).slice(0, 2).join('').toUpperCase();
}

function insigniaMarca(marca) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#e9eef4" stroke="#0f233c" stroke-width="2"/>
  <text x="32" y="40" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="21" fill="#0f233c">${inicialesMarca(marca)}</text>
</svg>`);
}

// ========================================
// ESTADO DE LOS FILTROS (una sola fuente de verdad)
const estado = { marcas: new Set(), precioMax: 0, orden: 'precio-desc' };

const ORDENES = {
  'precio-desc': (a, b) => b.precio - a.precio,
  'precio-asc': (a, b) => a.precio - b.precio,
  'descuento': (a, b) => porcentajeDescuento(b) - porcentajeDescuento(a),
  'anio-desc': (a, b) => b.anio - a.anio || a.precio - b.precio,
  'km-asc': (a, b) => a.km - b.km
};

function autosFiltrados() {
  // filter() crea una lista nueva, así que sort() nunca modifica el inventario original
  return autos
    .filter(a => estado.marcas.size === 0 || estado.marcas.has(a.marca))
    .filter(a => !estado.precioMax || a.precio <= estado.precioMax)
    .sort(ORDENES[estado.orden]);
}

// ========================================
// CONTROLES DE FILTRO
function marcasConConteo() {
  const conteo = {};
  autos.forEach(a => { conteo[a.marca] = (conteo[a.marca] || 0) + 1; });
  return Object.entries(conteo).sort(([a], [b]) => a.localeCompare(b, 'es'));
}

function opcionesPrecio(textoTodos) {
  return [`<option value="0">${textoTodos}</option>`]
    .concat(PRECIOS_MAX.map(p => `<option value="${p}">Hasta ${formatoCOP.format(p)}</option>`))
    .join('');
}

function crearControles() {
  const marcas = marcasConConteo();

  // Casillas de marca (barra lateral)
  $('#lista-marcas').innerHTML = marcas.map(([marca, n], i) => `
    <label class="marca" for="marca-${i}">
      <input type="checkbox" id="marca-${i}" value="${escaparHTML(marca)}">
      ${escaparHTML(marca)}
      <span>${n}</span>
    </label>`).join('');

  // Selects del inicio y de la barra lateral
  $('#c-marca').innerHTML = '<option value="">Todas las marcas</option>' +
    marcas.map(([marca]) => `<option value="${escaparHTML(marca)}">${escaparHTML(marca)}</option>`).join('');
  $('#c-precio').innerHTML = opcionesPrecio('Cualquier precio');
  $('#f-precio').innerHTML = opcionesPrecio('Cualquier precio');
}

// Banda superior con las marcas disponibles, deslizándose en bucle continuo
function crearTickerMarcas() {
  const pista = $('#marcas-ticker');
  if (!pista) return;

  const marcas = marcasConConteo().map(([marca]) => marca);
  if (!marcas.length) { pista.hidden = true; return; }

  // Se duplica la lista para que el desplazamiento sea continuo (sin salto al reiniciar)
  const items = [...marcas, ...marcas].map(marca => `
    <button type="button" class="marcas-ticker__item" data-marca="${escaparHTML(marca)}" aria-label="Ver autos ${escaparHTML(marca)}">
      <img class="marcas-ticker__logo" src="img/marcas/${slugMarca(marca)}.png" alt="${escaparHTML(marca)}" width="80" height="80" loading="lazy">
    </button>`).join('');
  pista.innerHTML = items;

  // Si el logo real todavía no existe en img/marcas/, se muestra un escudo con las iniciales
  $$('.marcas-ticker__logo', pista).forEach(img => {
    const marca = img.closest('[data-marca]').dataset.marca;
    img.addEventListener('error', () => { img.src = insigniaMarca(marca); }, { once: true });
  });

  // Tocar una marca filtra el catálogo por esa marca y baja hasta él
  pista.addEventListener('click', e => {
    const boton = e.target.closest('[data-marca]');
    if (!boton) return;
    estado.marcas = new Set([boton.dataset.marca]);
    actualizar();
    $('#autos').scrollIntoView({ behavior: comportamiento, block: 'start' });
  });
}

function sincronizarControles() {
  $$('#lista-marcas input').forEach(cb => { cb.checked = estado.marcas.has(cb.value); });
  $('#f-precio').value = String(estado.precioMax);
  $('#f-orden').value = estado.orden;

  const activos = estado.marcas.size + (estado.precioMax ? 1 : 0);
  $('#filtros-resumen').textContent = activos ? `Filtros (${activos})` : 'Filtros';
  $('#limpiar').hidden = activos === 0;
}

// ========================================
// TARJETAS DE AUTOS
function plantillaAuto(auto) {
  const nombre = `${auto.marca} ${auto.modelo} ${auto.anio}`;
  const descuento = porcentajeDescuento(auto);
  const mensaje = `Hola, quiero información del ${nombre} de ${formatoCOP.format(auto.precio)}.`;

  return `
    <article class="auto">
      <div class="auto__foto">
        ${descuento ? `<span class="auto__descuento">-${descuento}%</span>` : ''}
        <img src="${escaparHTML(auto.img)}" alt="${escaparHTML(nombre)}" width="640" height="480" loading="lazy">
      </div>
      <div class="auto__cuerpo">
        <h3 class="auto__nombre">${escaparHTML(auto.marca)} ${escaparHTML(auto.modelo)}</h3>
        <ul class="auto__datos">
          <li>${auto.anio}</li>
          <li>${formatoNum.format(auto.km)} km</li>
          <li>Bogotá</li>
        </ul>
        <p class="auto__precio">
          ${formatoCOP.format(auto.precio)}
          ${descuento ? `<s><span class="sr-only">Antes </span>${formatoCOP.format(auto.original)}</s>` : ''}
        </p>
        <a class="btn btn--wa btn--bloque" href="${linkWhatsApp(mensaje)}" target="_blank" rel="noopener">
          Preguntar por WhatsApp
        </a>
      </div>
    </article>`;
}

function plantillaVacio() {
  return `
    <div class="vacio">
      <p><strong>No hay autos con esos filtros.</strong></p>
      <p>Prueba con otra marca o un presupuesto más alto, o cuéntanos qué buscas y te ayudamos a encontrarlo.</p>
      <div class="vacio__acciones">
        <button class="btn btn--azul" type="button" data-accion="limpiar">Limpiar filtros</button>
        <a class="btn btn--wa" target="_blank" rel="noopener"
           href="${linkWhatsApp('Hola, estoy buscando un carro y no lo encontré en su página.')}">Cuéntanos qué buscas</a>
      </div>
    </div>`;
}

function renderAutos() {
  const lista = autosFiltrados();
  const contenedor = $('#lista-autos');

  contenedor.innerHTML = lista.length ? lista.map(plantillaAuto).join('') : plantillaVacio();
  $('#conteo').textContent = lista.length === autos.length
    ? `${autos.length} ${autos.length === 1 ? 'auto' : 'autos'}`
    : `Mostrando ${lista.length} de ${autos.length} autos`;

  // Si la foto no existe, mostramos el recuadro en vez de un ícono roto
  $$('img', contenedor).forEach(img =>
    img.addEventListener('error', () => { img.src = FOTO_PENDIENTE; }, { once: true })
  );
}

function actualizar() {
  sincronizarControles();
  renderAutos();
}

function limpiarFiltros() {
  estado.marcas.clear();
  estado.precioMax = 0;
  actualizar();
}

// ========================================
// PESTAÑAS DEL INICIO: COMPRAR / VENDER
const TABS = ['comprar', 'vender'];

function activarTab(nombre, enfocar = false) {
  TABS.forEach(n => {
    const activo = n === nombre;
    const tab = $(`#tab-${n}`);
    tab.setAttribute('aria-selected', String(activo));
    tab.tabIndex = activo ? 0 : -1;
    $(`#panel-${n}`).hidden = !activo;
    if (activo && enfocar) tab.focus();
  });
}

// Lleva a la persona al panel del inicio con la pestaña elegida
function abrirPanel(nombre) {
  activarTab(nombre);
  $('#inicio').scrollIntoView({ behavior: comportamiento, block: 'start' });
  const primerCampo = $(`#panel-${nombre} select, #panel-${nombre} input`);
  setTimeout(() => primerCampo && primerCampo.focus({ preventScroll: true }), sinMovimiento ? 0 : 450);
}

function iniciarTabs() {
  TABS.forEach(n => $(`#tab-${n}`).addEventListener('click', () => activarTab(n)));

  // Flechas izquierda/derecha para cambiar de pestaña con el teclado
  $('.tabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const actual = TABS.findIndex(n => $(`#tab-${n}`).getAttribute('aria-selected') === 'true');
    const siguiente = e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : (actual + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    activarTab(TABS[siguiente], true);
  });

  // Cualquier enlace con data-abrir="vender" abre el formulario de venta
  $$('[data-abrir]').forEach(enlace =>
    enlace.addEventListener('click', e => {
      e.preventDefault();
      abrirPanel(enlace.dataset.abrir);
    })
  );

  const desdeHash = () => { if (location.hash === '#vender') abrirPanel('vender'); };
  window.addEventListener('hashchange', desdeHash);
  desdeHash();
}

// ========================================
// FORMULARIO: COMPRAR (filtra el inventario)
function iniciarFormularioCompra() {
  $('#form-comprar').addEventListener('submit', e => {
    e.preventDefault();
    const datos = new FormData(e.target);
    const marca = datos.get('marca');

    estado.marcas = marca ? new Set([marca]) : new Set();
    estado.precioMax = Number(datos.get('precio')) || 0;
    actualizar();

    $('#autos').scrollIntoView({ behavior: comportamiento, block: 'start' });
  });
}

// ========================================
// FORMULARIO: VENDER (abre WhatsApp con los datos)
function enviarSolicitud(datos) {
  if (!CONFIG.leadsEndpoint) return;
  const cuerpo = new FormData();
  cuerpo.append('tipo', 'venta');
  Object.entries(datos).forEach(([clave, valor]) => cuerpo.append(clave, valor));
  fetch(CONFIG.leadsEndpoint, { method: 'POST', body: cuerpo, mode: 'no-cors' }).catch(() => {});
}

function iniciarFormularioVenta() {
  const form = $('#form-vender');
  const estadoVenta = $('#venta-estado');
  $('#v-anio').max = new Date().getFullYear() + 1;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    Object.keys(d).forEach(k => { d[k] = String(d[k]).trim(); });

    const precio = Number(d.precio) ? ` Espero recibir ${formatoCOP.format(Number(d.precio))}.` : '';
    const mensaje =
      `Hola, quiero vender mi ${d.marca} ${d.modelo} ${d.anio}, con ${formatoNum.format(Number(d.km))} km.` +
      `${precio} Mi WhatsApp: ${d.whatsapp}.`;
    const url = linkWhatsApp(mensaje);

    window.open(url, '_blank', 'noopener');
    enviarSolicitud(d);

    // Aviso con enlace de respaldo por si el navegador bloqueó la ventana
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.textContent = 'tócalo aquí';
    estadoVenta.textContent = 'Abrimos WhatsApp con tu solicitud. Si no se abrió, ';
    estadoVenta.append(enlace, '.');
  });
}

// ========================================
// DATOS DE CONTACTO (salen de CONFIG)
function aplicarConfig() {
  $$('[data-wa]').forEach(a => {
    a.href = linkWhatsApp(a.dataset.waText || '');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('[data-config]').forEach(el => { el.textContent = CONFIG[el.dataset.config]; });
  $$('[data-email]').forEach(a => {
    a.href = `mailto:${CONFIG.email}`;
    a.textContent = CONFIG.email;
  });
  $('#anio-actual').textContent = new Date().getFullYear();
}

// ========================================
// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  aplicarConfig();
  crearControles();
  crearTickerMarcas();
  iniciarTabs();
  iniciarFormularioCompra();
  iniciarFormularioVenta();

  // Filtros de la barra lateral
  $('#lista-marcas').addEventListener('change', () => {
    estado.marcas = new Set($$('#lista-marcas input:checked').map(cb => cb.value));
    actualizar();
  });
  $('#f-precio').addEventListener('change', e => { estado.precioMax = Number(e.target.value); actualizar(); });
  $('#f-orden').addEventListener('change', e => { estado.orden = e.target.value; actualizar(); });
  $('#limpiar').addEventListener('click', limpiarFiltros);
  $('#lista-autos').addEventListener('click', e => {
    if (e.target.closest('[data-accion="limpiar"]')) limpiarFiltros();
  });

  // En pantallas grandes los filtros siempre están abiertos; en el celular se pliegan
  const escritorio = window.matchMedia('(min-width: 900px)');
  const ajustarFiltros = () => { $('#filtros').open = escritorio.matches; };
  escritorio.addEventListener('change', ajustarFiltros);
  ajustarFiltros();

  actualizar();
});
