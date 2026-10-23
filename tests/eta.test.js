import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  isValidSpeed,
  pointToLineDistance,
  calculateSpeed
} from '../src/services/eta.js';
import { etaService } from '../src/services/eta.js';

describe('haversineDistance', () => {
  it('mismo punto da 0 metros', () => {
    expect(haversineDistance(13.994, -89.56, 13.994, -89.56)).toBe(0);
  });

  it('Santa Ana a ~1km al norte da ~1000 ±50 m', () => {
    // Santa Ana, El Salvador: 13.994, -89.56. 1km al norte ≈ +0.008983° lat
    const d = haversineDistance(13.994, -89.56, 14.002983, -89.56);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });

  it('es simetrico', () => {
    const a = haversineDistance(13.994, -89.56, 14.002983, -89.56);
    const b = haversineDistance(14.002983, -89.56, 13.994, -89.56);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('isValidSpeed', () => {
  it('30 km/h es valida', () => {
    expect(isValidSpeed(30)).toBe(true);
  });

  it('velocidades negativas son invalidas', () => {
    expect(isValidSpeed(-5)).toBe(false);
  });

  it('velocidades imposibles (>120) son invalidas', () => {
    expect(isValidSpeed(300)).toBe(false);
  });

  it('limites: 0 y 120 son validas, 120.1 no', () => {
    expect(isValidSpeed(0)).toBe(true);
    expect(isValidSpeed(120)).toBe(true);
    expect(isValidSpeed(120.1)).toBe(false);
  });
});

describe('pointToLineDistance', () => {
  // Segmento horizontal en Santa Ana: de (13.994, -89.56) a (13.994, -89.55)
  const lat1 = 13.994;
  const lon1 = -89.56;
  const lat2 = 13.994;
  const lon2 = -89.55;

  it('punto sobre el segmento da ~0 m', () => {
    const d = pointToLineDistance(13.994, -89.555, lat1, lon1, lat2, lon2);
    expect(d).toBeLessThan(1);
  });

  it('punto desplazado ~100m perpendicular da ~100 ±20 m', () => {
    // ~100m al norte: 100 / 111320 ≈ 0.000898°
    const d = pointToLineDistance(13.994898, -89.555, lat1, lon1, lat2, lon2);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(120);
  });

  it('cuando el segmento es un punto, mide distancia al punto', () => {
    const d = pointToLineDistance(14.002983, -89.56, 13.994, -89.56, 13.994, -89.56);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});

describe('calculateSpeed', () => {
  it('calcula velocidad en km/h a partir de dos posiciones', () => {
    const pos1 = { latitude: 13.994, longitude: -89.56, timestamp: 0 };
    // ~1km en 60s → ~60 km/h
    const pos2 = { latitude: 14.002983, longitude: -89.56, timestamp: 60000 };
    const speed = calculateSpeed(pos1, pos2);
    expect(speed).toBeGreaterThan(55);
    expect(speed).toBeLessThan(65);
  });

  it('tiempo no positivo da 0', () => {
    const pos = { latitude: 13.994, longitude: -89.56, timestamp: 1000 };
    expect(calculateSpeed(pos, pos)).toBe(0);
  });
});

describe('etaService', () => {
  it('expone las helpers puras en el objeto', () => {
    expect(typeof etaService.haversineDistance).toBe('function');
    expect(typeof etaService.isValidSpeed).toBe('function');
    expect(typeof etaService.isPositionOnRoute).toBe('function');
  });
});
