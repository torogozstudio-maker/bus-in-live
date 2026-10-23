import { describe, it, expect } from 'vitest';
import { stripBase, withBase, router } from '../src/utils/router.js';

describe('stripBase', () => {
  it('quita la base del pathname (ej: GitHub Pages)', () => {
    expect(stripBase('/bus-in-live/mapa')).toBe('/mapa');
  });

  it('retorna la raiz cuando el pathname es solo la base', () => {
    expect(stripBase('/bus-in-live')).toBe('/');
    expect(stripBase('/bus-in-live/')).toBe('/');
  });

  it('retorna el pathname tal cual si no tiene base', () => {
    expect(stripBase('/login')).toBe('/login');
    expect(stripBase('/')).toBe('/');
  });

  it('asegura que el resultado empieza con /', () => {
    expect(stripBase('mapa')).toBe('/mapa');
  });

  it('maneja null/undefined', () => {
    expect(stripBase(null)).toBe('/');
    expect(stripBase(undefined)).toBe('/');
  });
});

describe('withBase', () => {
  it('prefija la base a la ruta interna', () => {
    expect(withBase('/mapa')).toBe('/bus-in-live/mapa');
  });

  it('la raiz interna se convierte en la base', () => {
    expect(withBase('/')).toBe('/bus-in-live/');
  });

  it('no duplica la base si ya esta presente', () => {
    expect(withBase('/bus-in-live/mapa')).toBe('/bus-in-live/mapa');
  });
});

describe('router', () => {
  it('es un objeto con la API del router', () => {
    expect(typeof router).toBe('object');
    expect(typeof router.add).toBe('function');
    expect(typeof router.navigate).toBe('function');
    expect(typeof router.notFound).toBe('function');
    expect(typeof router.beforeEach).toBe('function');
    expect(typeof router.getCurrentRoute).toBe('function');
  });
});
