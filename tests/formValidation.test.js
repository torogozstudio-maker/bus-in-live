import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../src/utils/formValidation.js';

describe('isValidEmail', () => {
  it('acepta emails validos', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.co')).toBe(true);
    expect(isValidEmail('usuario+tag@dominio.sv')).toBe(true);
    expect(isValidEmail('x@y.io')).toBe(true);
    expect(isValidEmail('user_name@ejemplo.org')).toBe(true);
  });

  it('rechaza emails invalidos', () => {
    expect(isValidEmail('plain')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('user@@example.com')).toBe(false);
  });

  it('rechaza valores vacios y no string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
