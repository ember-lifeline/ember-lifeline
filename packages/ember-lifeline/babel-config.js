import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const resolve = require.resolve;

export default {
  plugins: [
    [
      resolve('@babel/plugin-transform-typescript'),
      {
        allowDeclareFields: true,
        onlyRemoveTypeImports: true,
        optimizeConstEnums: true,
      },
    ],
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-class-properties',
    '@embroider/addon-dev/template-colocation-plugin',
  ],
};
