import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/utils/sanitize.js';

describe('XSS regression: escapeHtml', () => {
  it('escapeHtml de <img src=x onerror=alert(1)> no contiene <', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toContain('&lt;img');
  });

  it('escapa payloads de script', () => {
    const escaped = escapeHtml('<script>alert("xss")</script>');
    expect(escaped).not.toContain('<');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('escapa payloads con comillas para atributos', () => {
    const escaped = escapeHtml('"><img src=x onerror=alert(1)>');
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain('<');
  });
});
