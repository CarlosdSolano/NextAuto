// ========================================
// CONFIGURACIÓN DEL NEGOCIO
// Cambia estos datos una sola vez y se actualizan en toda la página.
const CONFIG = {
  whatsapp: '573001234567',            // Número con indicativo de país, sin + ni espacios
  whatsappVisible: '+57 300 123 4567', // Como se muestra en pantalla
  email: 'contacto@tusitio.com',

  // Opcional: URL de tu Google Apps Script para guardar cada solicitud de
  // venta en una hoja de cálculo. Déjala vacía si no la usas.
  leadsEndpoint: ''
};

// Presupuestos máximos que aparecen en los filtros (en pesos)
const PRECIOS_MAX = [70000000, 90000000, 110000000, 130000000];

// ========================================
// INVENTARIO
// Para agregar un carro, copia una línea y cambia sus datos.
// - img: ruta de la foto (si no existe, se muestra un recuadro "Foto próximamente")
// - original: precio antes del descuento (el % se calcula solo; usa el mismo valor de precio si no hay descuento)
// - km: kilometraje. OJO: son valores de ejemplo, reemplázalos por los reales.
const autos = [
  { marca: 'Audi',       modelo: 'A4',     anio: 2022, km: 34000, precio:  95000000, original: 110000000, img: 'img/audi.jpg' },
  { marca: 'Audi',       modelo: 'Q5',     anio: 2023, km: 18000, precio: 120000000, original: 135000000, img: 'img/audi.jpg' },
  { marca: 'BMW',        modelo: 'X3',     anio: 2021, km: 52000, precio: 105000000, original: 120000000, img: 'img/bmw.jpg' },
  { marca: 'BYD',        modelo: 'Dolphin', anio: 2024, km:  8000, precio:  85000000, original:  95000000, img: 'img/byd.jpg' },
  { marca: 'Chery',      modelo: 'Tiggo 8', anio: 2023, km: 21000, precio:  95000000, original: 105000000, img: 'img/chery.jpg' },
  { marca: 'Chevrolet',  modelo: 'Onix',   anio: 2022, km: 41000, precio:  65000000, original:  72000000, img: 'img/chevy.jpg' },
  { marca: 'Ford',       modelo: 'Escape',  anio: 2022, km: 32000, precio:  92000000, original:  92000000, img: 'img/ford.jpg' },
  { marca: 'Hyundai',    modelo: 'Tucson', anio: 2022, km: 29000, precio:  98000000, original: 108000000, img: 'img/hyundai.jpg' },
  { marca: 'Kia',        modelo: 'Sportage', anio: 2023, km: 12000, precio: 102000000, original: 102000000, img: 'img/kia.jpg' },
  { marca: 'Mazda',      modelo: 'CX-30',  anio: 2022, km: 27000, precio:  88000000, original:  97000000, img: 'img/mazda.jpg' },
  { marca: 'Mercedes-Benz', modelo: 'Clase A', anio: 2021, km: 38000, precio: 135000000, original: 150000000, img: 'img/mercedes.jpg' },
  { marca: 'Nissan',     modelo: 'Kicks',  anio: 2023, km: 14000, precio:  79000000, original:  79000000, img: 'img/nissan.jpg' },
  { marca: 'Renault',    modelo: 'Duster', anio: 2022, km: 36000, precio:  72000000, original:  80000000, img: 'img/renault.jpg' },
  { marca: 'Suzuki',     modelo: 'Vitara', anio: 2022, km: 24000, precio:  75000000, original:  75000000, img: 'img/suzuki.jpg' },
  { marca: 'Toyota',     modelo: 'Corolla Cross', anio: 2023, km: 16000, precio: 108000000, original: 118000000, img: 'img/toyota.jpg' },
  { marca: 'Volkswagen', modelo: 'Taos',   anio: 2023, km: 15000, precio: 110000000, original: 125000000, img: 'img/vw.jpg' }
];
