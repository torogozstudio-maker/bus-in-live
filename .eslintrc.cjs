/** @type {import('eslint').Linter.Config} */
const config = {
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'eqeqeq': 'error',
    'strict': 'off',
  },
};

export default config;