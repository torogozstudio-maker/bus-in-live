const routes = new Map();
let currentRoute = null;
let notFoundHandler = null;
let beforeEachGuards = [];

function parsePath(path) {
  const [pathname, search] = path.split('?');
  const params = {};
  const query = new URLSearchParams(search || '');
  return { pathname, query, params };
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

  async navigate(path, replace = false) {
    const { pathname, query, params: urlParams } = parsePath(path);

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

    if (replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
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

    const initialPath = window.location.pathname + window.location.search;
    this.navigate(initialPath, true);
  },

  back() {
    history.back();
  }
};

export function createRouteLink(path, text, classes = '') {
  return `<a href="${path}" data-link class="${classes}">${text}</a>`;
}