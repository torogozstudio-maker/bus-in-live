// Base de despliegue ('' en local con base '/', '/bus-in-live' en GitHub Pages).
// Las rutas internas del router SIEMPRE van sin base: '/', '/mapa', '/login'.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const REDIRECT_KEY = 'spa-redirect';

/** Quita la base de un pathname del navegador: '/bus-in-live/mapa' -> '/mapa'. */
export function stripBase(pathname) {
  let p = pathname || '/';
  if (BASE && (p === BASE || p.startsWith(BASE + '/'))) p = p.slice(BASE.length);
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

/** Ruta interna -> ruta real del navegador: '/mapa' -> '/bus-in-live/mapa'. */
export function withBase(path) {
  return BASE + stripBase(path);
}

/** URL absoluta de una ruta de la app (para redirects de OAuth, correos, etc.). */
export function appUrl(path = '/') {
  return `${window.location.origin}${withBase(path)}`;
}

const routes = new Map();
let currentRoute = null;
let notFoundHandler = null;
let beforeEachGuards = [];
let afterEachHooks = [];

function parsePath(path) {
  const [rawPathname, search] = path.split('?');
  const pathname = stripBase(rawPathname);
  const params = {};
  const query = new URLSearchParams(search || '');
  return { pathname, query, params, search: search ? `?${search}` : '' };
}

function matchRoute(pathname, pattern) {
  const routeParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (routeParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];

    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = pathPart;
    } else if (routePart !== pathPart) {
      return null;
    }
  }

  return params;
}

export const router = {
  add(path, handler) {
    routes.set(path, handler);
    return this;
  },

  notFound(handler) {
    notFoundHandler = handler;
    return this;
  },

  beforeEach(guard) {
    beforeEachGuards.push(guard);
    return this;
  },

  /** Se ejecuta después de pintar cada pantalla (por ejemplo, para actualizar el título). */
  afterEach(hook) {
    afterEachHooks.push(hook);
    return this;
  },

  async navigate(path, replace = false) {
    const { pathname, query, params: urlParams, search } = parsePath(path);

    for (const guard of beforeEachGuards) {
      const result = await guard(pathname, query);
      if (result === false) return;
      if (typeof result === 'string') {
        return this.navigate(result, replace);
      }
    }

    let matched = false;

    for (const [pattern, handler] of routes) {
      const params = matchRoute(pathname, pattern);
      if (params !== null) {
        currentRoute = { pattern, params: { ...params, ...urlParams }, query, pathname };
        matched = true;
        await handler(currentRoute);
        break;
      }
    }

    if (!matched && notFoundHandler) {
      currentRoute = { pattern: null, params: urlParams, query, pathname };
      await notFoundHandler(currentRoute);
    }

    for (const hook of afterEachHooks) hook(currentRoute);

    const url = withBase(pathname) + search;
    if (replace) {
      history.replaceState(null, '', url);
    } else {
      history.pushState(null, '', url);
    }
  },

  /** Vuelve a cargar la ruta actual (lo usan los botones "Reintentar"). */
  reload() {
    const r = currentRoute;
    const qs = r?.query?.toString();
    return this.navigate((r?.pathname || '/') + (qs ? `?${qs}` : ''), true);
  },

  getCurrentRoute() {
    return currentRoute;
  },

  getParam(name) {
    return currentRoute?.params?.[name];
  },

  getQuery(name) {
    return currentRoute?.query?.get(name);
  },

  start() {
    window.addEventListener('popstate', () => {
      const path = window.location.pathname + window.location.search;
      this.navigate(path, true);
    });

    document.addEventListener('click', (e) => {
      const retry = e.target.closest('[data-retry]');
      if (retry) {
        e.preventDefault();
        this.reload();
        return;
      }
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) this.navigate(href);
        return;
      }
      const button = e.target.closest('button[data-link]');
      if (button) {
        e.preventDefault();
        const href = button.getAttribute('data-link');
        if (href) this.navigate(href);
      }
    });

    // 404.html (GitHub Pages) guarda la ruta pedida y nos manda a la raíz de la app
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    const initialPath = saved
      ? saved + window.location.search
      : window.location.pathname + window.location.search;
    this.navigate(initialPath, true);
  },

  back() {
    history.back();
  }
};

export function createRouteLink(path, text, classes = '') {
  return `<a href="${path}" data-link class="${classes}">${text}</a>`;
}