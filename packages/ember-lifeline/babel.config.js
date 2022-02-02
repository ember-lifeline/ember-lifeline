module.exports = {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
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
