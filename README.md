# miMascota: base de PWA en HTML, CSS y JS

Una app web que se puede **instalar en el celu o la compu** y que **anda sin internet**.
Sin frameworks, sin `npm install` ni compilación: editás HTML, CSS y JS, guardás y recargás.

Trae: pantalla de **Entrar**, **Inicio**, **Perfil**, **Acerca de**, **menú a pantalla completa**, modo oscuro,
botón **Instalar app** y aviso cuando se corta la conexión.

---

## Cómo arrancar

**Doble clic en `iniciar.bat`.** Se abre el navegador en http://localhost:8080.

O desde una terminal, dentro de esta carpeta:

```bash
node servidor.js
```

> ⚠️ No abras `index.html` con doble clic. Así la ves como archivo (`file://`) y el
> service worker (lo que la hace instalable y offline) no funciona. Tiene que ser
> `http://localhost` o una página con `https://`.

---

## Qué es cada archivo

```
index.html        → TODAS las pantallas y el menú (acá vas a trabajar más)
css/estilos.css   → el diseño. Los colores están arriba de todo, en :root
js/app.js         → la lógica: entrar/salir, cambiar de pantalla, menú, tema
sw.js             → service worker: guarda copia de los archivos para funcionar offline
manifest.json     → nombre, colores e íconos de la app instalada
img/              → íconos de la app
servidor.js       → servidor local para probar (no es parte de la app)
iniciar.bat       → doble clic = servidor + navegador
```

---

## Agregar una pantalla nueva

1. En `index.html`, copiá un bloque `<section class="pantalla" ...>` y cambiale el nombre:

   ```html
   <section class="pantalla" data-pantalla="productos" data-titulo="Productos" hidden>
     <div class="tarjeta">
       <h3>Mis productos</h3>
       <p>Acá va tu contenido.</p>
     </div>
   </section>
   ```

2. Sumá la opción al menú (también en `index.html`, dentro de `<nav class="menu">`):

   ```html
   <a class="menu-item" href="#productos"><svg class="ico"><use href="#ico-casa"/></svg>Productos</a>
   ```

   Los atajos de Inicio (Vehículos, Trabajo...) y la barra de abajo (Novedades, GuauBot)
   ya apuntan a `#vehiculos`, `#novedades`, etc. Mientras esa pantalla no exista, tocarlos muestra
   un aviso. Apenas creás el `<section data-pantalla="vehiculos">`, el atajo empieza a abrirla.

   **Links que llaman:** `<a href="tel:911">` abre el teclado de llamadas del celu con el número
   cargado (mirá la pantalla Teléfonos útiles).

3. Si la pantalla necesita JavaScript cada vez que se abre, agregá una función en
   `alAbrir` dentro de `js/app.js`, con el mismo nombre:

   ```js
   productos(usuario) {
     $('#lista-productos').textContent = 'Cargando...';
   },
   ```

Cualquier link a `#productos` abre esa pantalla. Si querés que se vea **sin haber entrado**,
agregale `data-publica` al `<section>`.

**Subpantallas** (como Documentos): agregale `data-volver="inicio"` al `<section>`. Con eso,
en la barra aparece la flecha para volver y el botón de actualizar, la pantalla entra
deslizándose desde la derecha (y al volver sale hacia la derecha), y en la barra de abajo
queda marcado Inicio.

**Desplegables:** usá `<details class="desplegable">` con un `<summary>` adentro, copiando uno
de la pantalla Documentos. Se abren y se cierran solos, sin JavaScript.

---

## Cambiar nombre, colores e íconos

- **Nombre:** `<title>` y `apple-mobile-web-app-title` en `index.html`, `name` y `short_name` en
  `manifest.json`, y `APP.nombre` en `js/app.js`.
- **Colores:** variables de `:root` en `css/estilos.css`. Si cambiás `--acento`, poné el mismo
  color en `theme-color` (en `index.html` y en `manifest.json`) y en `background_color` del manifest.
- **Íconos:** reemplazá los archivos de `img/` por los tuyos, con el mismo nombre y tamaño:
  `icono-192.png` (192×192), `icono-512.png` (512×512), `icono-maskable-512.png` (512×512,
  con el dibujo bien centrado y aire alrededor porque Android lo recorta en círculo),
  `apple-touch-icon.png` (180×180, sin transparencia) e `icono.svg`.
  Podés probar cómo se recorta el maskable en https://maskable.app/editor
- **Prefijo:** `mimascota` está en `APP.clave` (`js/app.js`) y en `PREFIJO` (`sw.js`).
  Tienen que ser iguales. Cambialo por el nombre de tu app, sobre todo si vas a tener
  varias apps en el mismo dominio (por ejemplo, varias en GitHub Pages).

---

## El service worker (`sw.js`), en criollo

- **Con internet** siempre trae lo último del servidor y de paso guarda una copia.
- **Sin internet** usa la última copia guardada.
- Si agregás archivos nuevos (una imagen, otro `.js`), sumalos a la lista `ARCHIVOS`
  para que anden offline desde la primera visita.
- Si **borrás o renombrás** archivos, subí `VERSION` (`v1` → `v2`) para que se limpie la caché vieja.
- ¿Ves una versión vieja mientras desarrollás? **Menú → Acerca de → Borrar caché y recargar.**

---

## El login es de mentira

No hay servidor: acepta cualquier email y una contraseña de 4 o más caracteres, y guarda
el usuario en el navegador (`localStorage`). Cuando tengas un backend, cambiá lo que hay
adentro de la función `entrar()` en `js/app.js` por un `fetch()` a tu API.

Para guardar tus propios datos, ya tenés dos funciones listas en `js/app.js`:

```js
guardar('notas', ['comprar pan', 'llamar a Juan']);
const notas = leer('notas'); // → ['comprar pan', 'llamar a Juan']
```

---

## Probarla en el celu

En el celu necesitás **https**, así que hay que publicarla. La forma más fácil y gratis
es **GitHub Pages**:

1. Creá un repositorio en GitHub y subí el contenido de esta carpeta.
2. En el repo: **Settings → Pages → Branch: `main` / carpeta `/ (root)` → Save**.
3. En un minuto queda en `https://tu-usuario.github.io/nombre-del-repo/`.
4. Abrila en el celu:
   - **Android (Chrome):** menú → *Instalar app* (o el botón *Instalar app* del menú de la app).
   - **iPhone (Safari):** botón *Compartir* → *Agregar a inicio*.

Todos los caminos de la app son relativos, así que funciona igual en una subcarpeta.

---

## Revisar que todo esté bien (Chrome de la compu)

`F12` → pestaña **Application**:
- **Manifest**: tiene que mostrar nombre e íconos, sin errores.
- **Service workers**: tiene que decir *activated and is running*. Tildando **Offline** podés
  probar cómo anda sin internet.
