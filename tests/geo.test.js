import { describe, it, expect } from 'vitest';
import { geometryToLatLngs } from '../src/utils/geo.js';

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
