// Convierte una geometría GeoJSON (LineString o MultiLineString) a una lista
// de líneas en formato Leaflet [[lat, lng], ...]. Devuelve [] si no es válida.
export function geometryToLatLngs(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];

  const toLine = (coords) => {
    if (!Array.isArray(coords)) return [];
    const line = coords
      .filter(point => Array.isArray(point) && point.length >= 2)
      .map(([lng, lat]) => [Number(lat), Number(lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    return line.length >= 2 ? line : [];
  };

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map(toLine).filter(line => line.length >= 2);
  }

  const line = toLine(geometry.coordinates);
  return line.length >= 2 ? [line] : [];
}

// Elige el trazado activo más adecuado: la variante pedida, la ruta principal
// o el primero disponible (en ese orden). Ignora versiones inactivas.
export function findActiveShape(shapes, variantId = null) {
  if (!Array.isArray(shapes)) return null;

  const active = shapes.filter(shape =>
    shape && shape.active !== false && shape.geometry?.coordinates
  );
  if (active.length === 0) return null;

  if (variantId) {
    return active.find(shape => shape.variant_id === variantId)
      || active.find(shape => !shape.variant_id)
      || active[0];
  }

  return active.find(shape => !shape.variant_id) || active[0];
}
