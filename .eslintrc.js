module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  env: {
    es6: true,
    browser: true
  },
  plugins: ['prettier'],
  extends: [
    'eslint:recommended',
    'plugin:ember-suave/recommended'
  ],
  rules: {
    strict: 'error'
  }
};
