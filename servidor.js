// Servidor local mínimo para probar la PWA (no necesita instalar nada).
// Uso:  node servidor.js     → después abrí http://localhost:8080
//
// ¿Por qué hace falta? Si abrís index.html con doble clic (file://),
// el service worker no funciona. Tiene que ser http://localhost o https://.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = process.env.PORT || 8080;
const RAIZ = __dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((pedido, respuesta) => {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(pedido.url, 'http://localhost').pathname);
  } catch {
    respuesta.writeHead(400);
    return respuesta.end();
  }
  if (ruta.endsWith('/')) ruta += 'index.html';

  const archivo = path.join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ + path.sep)) { // no dejar salir de esta carpeta
    respuesta.writeHead(403);
    return respuesta.end();
  }

  fs.readFile(archivo, (error, datos) => {
    if (error) {
      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return respuesta.end('No encontrado');
    }
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    respuesta.end(datos);
  });
}).listen(PUERTO, () => {
  console.log(`Tu PWA está en http://localhost:${PUERTO}  (Ctrl+C para cortar)`);
});
