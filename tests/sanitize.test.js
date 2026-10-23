import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeAttr, safeUrl } from '../src/utils/sanitize.js';

describe('escapeHtml', () => {
  it('escapa &, <, >, ", \' y /', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
    expect(escapeHtml('/')).toBe('&#47;');
  });

  it('escapa una cadena completa', () => {
    expect(escapeHtml('<b>hola</b>')).toBe('&lt;b&gt;hola&lt;&#47;b&gt;');
  });

  it('retorna cadena vacia para null y undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('convierte numeros a string', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('escapeAttr', () => {
  it('escapa comillas dobles', () => {
    expect(escapeAttr('a"b')).toBe('a&quot;b');
  });

  it('escapa &, < y >', () => {
    expect(escapeAttr('&<>')).toBe('&amp;&lt;&gt;');
  });

  it('retorna cadena vacia para null y undefined', () => {
    expect(escapeAttr(null)).toBe('');
    expect(escapeAttr(undefined)).toBe('');
  });

  it('no escapa comillas simples (solo atributos entre comillas dobles)', () => {
    expect(escapeAttr("o'hara")).toBe("o'hara");
  });
});

describe('safeUrl', () => {
  it('acepta https://', () => {
    expect(safeUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('acepta http://', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com');
  });

  it('acepta rutas relativas', () => {
    expect(safeUrl('/ruta')).toBe('/ruta');
  });

  it('acepta mailto:', () => {
    expect(safeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('bloquea javascript: y usa fallback', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
  });

  it('bloquea javascript: en mayusculas y con espacios', () => {
    expect(safeUrl('  JaVaScRiPt:alert(1)')).toBe('#');
  });

  it('bloquea data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('usa custom fallback cuando se provee', () => {
    expect(safeUrl('javascript:alert(1)', '/inicio')).toBe('/inicio');
  });

  it('retorna fallback para valores vacios', () => {
    expect(safeUrl('')).toBe('#');
    expect(safeUrl(null)).toBe('#');
    expect(safeUrl(undefined)).toBe('#');
  });
});
