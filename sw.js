/* ==========================================================
   sw.js — Service worker
   Corre "por detrás" de la app y guarda una copia de los
   archivos, para que la app abra aunque no haya internet.

   Estrategia: primero la red, si no hay conexión usa la copia.
   → Mientras tengas internet siempre ves lo último que subiste.
   → Sin internet ves la última versión que se guardó.
   ========================================================== */

const PREFIJO = 'mimascota'; // el mismo que APP.clave en js/app.js
const VERSION = 'v1';       // subila (v2, v3...) cuando borres o renombres archivos
const CACHE = `${PREFIJO}-${VERSION}`;

// Archivos que se guardan apenas se instala, para que funcione offline
// desde la primera visita. Si agregás archivos nuevos, sumalos acá.
// (Si te olvidás no pasa nada grave: se guardan la primera vez que se usan.)
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.json',
  'css/estilos.css',
  'js/app.js',
  'img/icono.svg',
  'img/icono-192.png',
  'img/icono-512.png',
  'img/icono-maskable-512.png',
  'img/apple-touch-icon.png'
];

// 1) Instalación: descarga y guarda los archivos
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting()) // que la versión nueva tome el control enseguida
  );
});

// 2) Activación: borra las cachés viejas de ESTA app (las de otras apps no se tocan)
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave.startsWith(PREFIJO + '-') && clave !== CACHE)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

// Las letras de Google Fonts no cambian nunca: se guardan la primera vez
// y después se usan desde la copia (así también andan sin internet)
const FUENTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// 3) Cada pedido de la app pasa por acá
self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const origen = new URL(pedido.url).origin;

  if (pedido.method === 'GET' && FUENTES.includes(origen)) {
    evento.respondWith(
      caches.match(pedido).then((guardada) => guardada || fetch(pedido).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return respuesta;
      }))
    );
    return;
  }

  // Del resto, solo nos metemos con lecturas (GET) de nuestro propio sitio.
  // Lo demás (APIs externas, POST, etc.) sigue de largo como siempre.
  if (pedido.method !== 'GET' || origen !== location.origin) return;

  evento.respondWith(
    fetch(pedido, { cache: 'no-cache' }) // no-cache = preguntarle al servidor si hay algo nuevo
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        // Sin conexión: usamos la copia guardada
        const guardada = await caches.match(pedido, { ignoreSearch: true });
        if (guardada) return guardada;
        // Si era una página, mostramos la app igual
        if (pedido.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      })
  );
});
