import { describe, it, expect } from 'vitest';
import { geometryToLatLngs, findActiveShape } from '../src/utils/geo.js';

describe('geometryToLatLngs', () => {
  it('convierte un LineString a una línea [lat, lng]', () => {
    const geometry = {
      type: 'LineString',
      coordinates: [[-89.56, 13.99], [-89.55, 13.995]]
    };

    expect(geometryToLatLngs(geometry)).toEqual([
      [[13.99, -89.56], [13.995, -89.55]]
    ]);
  });

  it('convierte un MultiLineString en varias líneas', () => {
    const geometry = {
      type: 'MultiLineString',
      coordinates: [
        [[-89.56, 13.99], [-89.55, 13.995]],
        [[-89.54, 14.0], [-89.53, 14.005]]
      ]
    };

    expect(geometryToLatLngs(geometry)).toEqual([
      [[13.99, -89.56], [13.995, -89.55]],
      [[14.0, -89.54], [14.005, -89.53]]
    ]);
  });

  it('descarta líneas con menos de dos puntos', () => {
    expect(geometryToLatLngs({ type: 'LineString', coordinates: [[-89.56, 13.99]] })).toEqual([]);
    expect(geometryToLatLngs({
      type: 'MultiLineString',
      coordinates: [
        [[-89.56, 13.99]],
        [[-89.54, 14.0], [-89.53, 14.005]]
      ]
    })).toEqual([[[14.0, -89.54], [14.005, -89.53]]]);
  });

  it('devuelve [] para geometrías inválidas', () => {
    expect(geometryToLatLngs(null)).toEqual([]);
    expect(geometryToLatLngs({})).toEqual([]);
    expect(geometryToLatLngs({ type: 'Point', coordinates: [-89.56, 13.99] })).toEqual([]);
    expect(geometryToLatLngs({ type: 'LineString', coordinates: 'nope' })).toEqual([]);
  });
});

describe('findActiveShape', () => {
  const geometry = { type: 'LineString', coordinates: [[-89.56, 13.99], [-89.55, 13.995]] };
  const base = { variant_id: null, active: true, geometry };
  const variantA = { variant_id: 'a', active: true, geometry };
  const variantB = { variant_id: 'b', active: false, geometry };

  it('prefiere la variante pedida', () => {
    expect(findActiveShape([base, variantA], 'a')).toBe(variantA);
  });

  it('usa la ruta principal si no se pide variante', () => {
    expect(findActiveShape([variantA, base])).toBe(base);
  });

  it('cae a la ruta principal si la variante no tiene trazado', () => {
    expect(findActiveShape([base], 'a')).toBe(base);
  });

  it('ignora versiones inactivas', () => {
    expect(findActiveShape([variantB])).toBeNull();
    expect(findActiveShape([variantB, base])).toBe(base);
  });

  it('devuelve null sin trazados', () => {
    expect(findActiveShape(null)).toBeNull();
    expect(findActiveShape([])).toBeNull();
  });
});
