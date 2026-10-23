// Carga Leaflet (código y hoja de estilos) solo cuando una pantalla con mapa lo necesita.
// Antes la hoja se pedía a unpkg.com desde index.html y bloqueaba el renderizado de TODAS las pantallas.
let leafletPromise = null;

export function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet]) => leaflet.default);
  }
  return leafletPromise;
}
