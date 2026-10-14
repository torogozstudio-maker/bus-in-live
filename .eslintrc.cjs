// Configuración de ESLint 8 (formato CommonJS: el proyecto usa "type": "module",
// por eso el archivo es .cjs y usa module.exports).
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': 'warn',
    eqeqeq: 'warn',
  },
};
