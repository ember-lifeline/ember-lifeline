/* eslint-env node */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    'ember-cli-addon-docs': {
      documentingAddonAt: '../ember-lifeline'
    }
  });

  app.import({ test: 'vendor/fix-promise.js' });

  const { maybeEmbroider } = require('@embroider/test-setup');
  return maybeEmbroider(app);
};
