// Simula GitHub Pages en local para probar el despliegue ANTES de subirlo.
//   npm run build && node scripts/serve-pages.mjs   ->   http://localhost:4180/bus-in-live/
// Sirve dist/ bajo /bus-in-live/ y, como GitHub Pages, responde 404.html a las rutas que no son archivos.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const base = '/bus-in-live';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const notFoundPage = fs.existsSync('404.html') ? path.resolve('404.html') : path.join(root, '404.html');

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname !== base && !pathname.startsWith(base + '/')) {
    res.writeHead(404);
    return res.end('Fuera de /bus-in-live/');
  }
  let rel = pathname.slice(base.length) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404, { 'content-type': 'text/html' });
  fs.createReadStream(notFoundPage).pipe(res);
}).listen(4180, () => console.log('Simulador de GitHub Pages en http://localhost:4180/bus-in-live/'));
