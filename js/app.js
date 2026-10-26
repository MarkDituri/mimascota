/* ==========================================================
   app.js — toda la lógica de la app
     1. Configuración y ayudantes
     2. Sesión (entrar / salir)
     3. Navegación entre pantallas
     4. Menú
     5. Lo que hace cada pantalla al abrirse
     6. Cosas de PWA (service worker, instalar, conexión)
     7. Avisos
   ========================================================== */


/* ---------- 1. Configuración y ayudantes ---------- */

const APP = {
  nombre: 'miMascota',
  clave: 'mimascota',       // prefijo para lo que se guarda en el navegador (usá el mismo en sw.js)
  pantallaInicial: 'inicio' // a dónde vas después de entrar
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Guardar y leer datos en el navegador (localStorage).
// Quedan guardados aunque cierres la app.
function guardar(nombre, valor) {
  try { localStorage.setItem(`${APP.clave}:${nombre}`, JSON.stringify(valor)); } catch {}
}
function leer(nombre) {
  try { return JSON.parse(localStorage.getItem(`${APP.clave}:${nombre}`)); } catch { return null; }
}
function borrar(nombre) {
  try { localStorage.removeItem(`${APP.clave}:${nombre}`); } catch {}
}


/* ---------- 2. Sesión ---------- */

// OJO: este login es de mentira, no hay servidor. Guarda el usuario en el
// navegador y listo. Cuando tengas un backend, reemplazá lo de adentro de
// entrar() por un fetch() a tu API.
function entrar(email) {
  const nombre = email.split('@')[0];
  const usuario = {
    nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
    email,
    chip: String(Math.floor(Math.random() * 1e11)).padStart(11, '0') // número de chip de mentira
  };
  guardar('sesion', usuario);
  return usuario;
}

function salir() {
  borrar('sesion');
  cerrarMenu();
  location.hash = '#entrar';
}

function usuarioActual() {
  return leer('sesion');
}

$('#form-entrar').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const form = evento.target;
  const email = form.email.value.trim();
  const contrasena = form.contrasena.value;
  const error = $('#error-entrar');

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    error.textContent = 'Revisá el email.';
    return;
  }
  if (contrasena.length < 4) {
    error.textContent = 'La contraseña tiene que tener al menos 4 caracteres.';
    return;
  }

  error.textContent = '';
  entrar(email);
  form.reset();
  location.hash = '#' + APP.pantallaInicial;
});


/* ---------- 3. Navegación entre pantallas ---------- */

function buscarPantalla(nombre) {
  return document.querySelector(`[data-pantalla="${CSS.escape(nombre)}"]`);
}

// Qué tan "adentro" está una pantalla: Inicio = 0, Documentos (data-volver="inicio") = 1...
function profundidad(pantalla) {
  let nivel = 0;
  while (pantalla && pantalla.dataset.volver) {
    nivel++;
    pantalla = buscarPantalla(pantalla.dataset.volver);
  }
  return nivel;
}

// La pantalla principal de la que cuelga (Documentos → Inicio)
function raiz(pantalla) {
  while (pantalla.dataset.volver && buscarPantalla(pantalla.dataset.volver)) {
    pantalla = buscarPantalla(pantalla.dataset.volver);
  }
  return pantalla;
}

// Hace el cambio de pantalla deslizando: direccion 1 = adelante (la nueva entra
// desde la derecha), -1 = atrás (entra desde la izquierda), 0 = sin animación.
// Usa la View Transitions API; si el navegador no la tiene, cambia sin animar.
function animarCambio(direccion, cambiar) {
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!direccion || !document.startViewTransition || sinMovimiento) {
    cambiar();
    return;
  }
  document.documentElement.dataset.direccion = direccion > 0 ? 'adelante' : 'atras';
  document.startViewTransition(cambiar).finished.finally(() => {
    delete document.documentElement.dataset.direccion;
  });
}

let pantallaAnterior = null; // para que la flecha de volver sepa si puede ir "atrás"

// La parte de la URL después del # decide qué pantalla se ve:
// index.html#perfil muestra el <section data-pantalla="perfil">.
function mostrarPantalla() {
  const nombre = location.hash.slice(1) || APP.pantallaInicial;
  const pantalla = buscarPantalla(nombre);
  const usuario = usuarioActual();

  // Pantalla que no existe → a la inicial
  if (!pantalla) {
    location.replace('#' + APP.pantallaInicial);
    return;
  }
  // Sin sesión solo se pueden ver las pantallas con data-publica
  const esPublica = pantalla.hasAttribute('data-publica');
  if (!usuario && !esPublica) {
    location.replace('#entrar');
    return;
  }
  // Si ya entraste, no tiene sentido volver a Entrar
  if (usuario && nombre === 'entrar') {
    location.replace('#' + APP.pantallaInicial);
    return;
  }

  // ¿Vamos hacia una subpantalla (adelante), volvemos (atrás) o es del mismo nivel?
  const actual = document.querySelector('[data-pantalla]:not([hidden])');
  const direccion = actual ? Math.sign(profundidad(pantalla) - profundidad(actual)) : 0;
  if (actual && actual !== pantalla) pantallaAnterior = actual.dataset.pantalla;

  animarCambio(direccion, () => {
    $$('[data-pantalla]').forEach((p) => { p.hidden = p !== pantalla; });
    document.body.classList.toggle('sin-barra', esPublica);
    document.body.classList.toggle('subpantalla', pantalla.hasAttribute('data-volver'));

    // En la barra va el logo (si la pantalla tiene data-logo) o el título
    const titulo = pantalla.dataset.titulo || '';
    const conLogo = pantalla.hasAttribute('data-logo');
    $('#barra-logo').hidden = !conLogo;
    $('#barra-texto').textContent = conLogo ? '' : titulo;
    document.title = titulo ? `${titulo} · ${APP.nombre}` : APP.nombre;

    // Marca en la barra de abajo la sección actual (Documentos cuenta como Inicio)
    const seccion = raiz(pantalla).dataset.pantalla;
    $$('.nav-abajo a').forEach((a) => {
      if (a.getAttribute('href') === '#' + seccion) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (usuario) pintarUsuario(usuario);
    window.scrollTo(0, 0);
    if (alAbrir[nombre]) alAbrir[nombre](usuario);
  });
}

window.addEventListener('hashchange', mostrarPantalla);

// Flecha de volver de las subpantallas. Si venimos de esa pantalla funciona
// igual que el "atrás" del celu; si no (ej: recargaste acá), va directo.
$('#volver').addEventListener('click', () => {
  const destino = document.querySelector('[data-pantalla]:not([hidden])').dataset.volver;
  if (pantallaAnterior === destino) history.back();
  else location.replace('#' + destino);
});
$('#actualizar').addEventListener('click', () => location.reload());

// Links a pantallas que todavía no armaste (ej: #salud):
// en vez de no hacer nada, avisan.
document.addEventListener('click', (evento) => {
  const link = evento.target.closest('a[href^="#"]');
  if (!link) return;
  const nombre = link.getAttribute('href').slice(1);
  if (nombre && !buscarPantalla(nombre)) {
    evento.preventDefault();
    aviso(`«${link.textContent.trim()}» todavía no tiene pantalla. Agregala en index.html.`);
  }
});


/* ---------- 4. Menú ---------- */

function abrirMenu() {
  document.body.classList.add('menu-abierto');
  $('#abrir-menu').setAttribute('aria-expanded', 'true');
  $('#cerrar-menu').focus({ preventScroll: true });
}

function cerrarMenu() {
  if (!document.body.classList.contains('menu-abierto')) return;
  document.body.classList.remove('menu-abierto');
  $('#abrir-menu').setAttribute('aria-expanded', 'false');
  if ($('#menu').contains(document.activeElement)) $('#abrir-menu').focus({ preventScroll: true });
}

$('#abrir-menu').addEventListener('click', abrirMenu);
$('#cerrar-menu').addEventListener('click', cerrarMenu);
// Tocar cualquier link del menú o de la barra de abajo cierra el menú
$('#menu').addEventListener('click', (evento) => {
  if (evento.target.closest('a')) cerrarMenu();
});
$('.nav-abajo').addEventListener('click', (evento) => {
  if (evento.target.closest('a')) cerrarMenu();
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') cerrarMenu();
});
$('#btn-salir').addEventListener('click', salir);

// Nombre y chip del usuario en la cabecera del menú
function pintarUsuario(usuario) {
  $('#menu-nombre').textContent = usuario.nombre;
  $('#menu-chip').textContent = usuario.chip || '—';
}


/* ---------- 5. Lo que hace cada pantalla al abrirse ---------- */

// Si una pantalla necesita JS cada vez que se muestra, agregá acá
// una función con el mismo nombre que su data-pantalla.
const alAbrir = {
  inicio(usuario) {
    $('#saludo').textContent = `¡Hola, ${usuario.nombre}!`;
  },

  documentos() {
    // Cada vez que entrás, todos los desplegables arrancan cerrados
    $$('[data-pantalla="documentos"] details').forEach((d) => { d.open = false; });
  },

  perfil(usuario) {
    $('#perfil-avatar').textContent = usuario.nombre.charAt(0).toUpperCase();
    $('#perfil-titulo').textContent = usuario.nombre;
    $('#perfil-email').textContent = usuario.email;
    $('#form-perfil').nombre.value = usuario.nombre;
  },

  acerca() {
    actualizarEstado();
  }
};

$('#form-perfil').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const nombre = evento.target.nombre.value.trim();
  if (!nombre) return;
  const usuario = { ...usuarioActual(), nombre };
  guardar('sesion', usuario);
  alAbrir.perfil(usuario);
  pintarUsuario(usuario);
  aviso('Guardado');
});

// Tema: 'claro' (el de siempre), 'oscuro' o 'auto' (sigue al sistema)
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
}
$('#tema').value = leer('tema') || 'claro';
aplicarTema($('#tema').value);
$('#tema').addEventListener('change', (evento) => {
  guardar('tema', evento.target.value);
  aplicarTema(evento.target.value);
});

// Lo que muestra la tarjeta "Estado de la app"
async function actualizarEstado() {
  $('#estado-conexion').textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
  $('#estado-modo').textContent = estaInstalada() ? 'App instalada' : 'Página web';

  const registro = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  $('#estado-sw').textContent = registro?.active ? 'Activo' : 'No registrado';

  const claves = 'caches' in window ? await caches.keys() : [];
  $('#estado-cache').textContent = claves.filter((c) => c.startsWith(APP.clave)).join(', ') || '—';
}

// Borra el service worker y la caché de ESTA app y recarga (útil al desarrollar)
$('#btn-limpiar').addEventListener('click', async () => {
  const registro = await navigator.serviceWorker?.getRegistration();
  if (registro) await registro.unregister();
  const claves = 'caches' in window ? await caches.keys() : [];
  await Promise.all(claves.filter((c) => c.startsWith(APP.clave)).map((c) => caches.delete(c)));
  location.reload();
});


/* ---------- 6. Cosas de PWA ---------- */

// Service worker: es lo que hace que la app funcione sin internet.
// Solo anda en https:// o en http://localhost (no abriendo el archivo con doble clic).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(actualizarEstado)
    .catch((error) => console.error('No se pudo registrar el service worker:', error));
}

function estaInstalada() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// Botón "Instalar app" del menú.
// Android y Chrome de compu avisan con "beforeinstallprompt" que se puede instalar.
// iPhone no avisa nada: ahí mostramos cómo hacerlo a mano.
let pedidoInstalar = null;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const btnInstalar = $('#btn-instalar');
btnInstalar.hidden = !(esIOS && !estaInstalada());

window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  pedidoInstalar = evento;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', async () => {
  cerrarMenu();
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    await pedidoInstalar.userChoice;
    pedidoInstalar = null; // se puede usar una sola vez
    btnInstalar.hidden = true;
  } else if (esIOS) {
    aviso('En iPhone: tocá Compartir y después "Agregar a inicio".', 6000);
  }
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  aviso('¡App instalada!');
});

// Con o sin conexión
function cambioDeConexion() {
  document.body.classList.toggle('offline', !navigator.onLine);
  actualizarEstado();
}
window.addEventListener('online', () => { cambioDeConexion(); aviso('Volvió la conexión.'); });
window.addEventListener('offline', () => { cambioDeConexion(); aviso('Sin conexión. La app sigue andando con lo guardado.'); });


/* ---------- 7. Avisos ---------- */

// aviso('Texto') muestra un cartelito abajo que se va solo
let temporizadorAviso;
function aviso(texto, milisegundos = 3000) {
  const cartel = $('#aviso');
  cartel.textContent = texto;
  cartel.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { cartel.hidden = true; }, milisegundos);
}


/* ---------- Arranque ---------- */

cambioDeConexion();
mostrarPantalla();
