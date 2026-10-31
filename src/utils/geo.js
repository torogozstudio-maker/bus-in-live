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
