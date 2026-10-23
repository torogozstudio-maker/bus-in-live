/**
 * Utilidades de sanitizacion para prevenir XSS.
 * Usar SIEMPRE al insertar datos de usuario/BD en innerHTML.
 */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#47;'
};

const HTML_RE = /[&<>"'/]/g;
const ATTR_RE = /[&<>"]/g;

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(HTML_RE, (ch) => HTML_ESCAPES[ch]);
}

export function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(ATTR_RE, (ch) => HTML_ESCAPES[ch]);
}

export function safeUrl(value, fallback = '#') {
  if (!value) return fallback;
  const url = String(value).trim();
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|\?|#)/i.test(url)) return url;
  return fallback;
}
