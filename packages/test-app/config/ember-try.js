'use strict';

const getChannelURL = require('ember-source-channel-url');
const { embroiderSafe, embroiderOptimized } = require('@embroider/test-setup');

// Recent ember-source releases (5.x+) no longer work with the ember-cli /
// testing dependencies this app was generated with, so the release, beta and
// canary scenarios bring their own modern versions of them.
const emberCurrentDeps = {
  'ember-cli': '^6.0.0',
  '@ember/test-helpers': '^5.0.0',
  'ember-cli-app-version': '^7.0.0',
  'ember-cli-htmlbars': '^7.0.0',
  'ember-qunit': '^9.0.0',
  'ember-resolver': '^13.0.0',
  'qunit-dom': '^3.0.0',
  'ember-load-initializers': '^3.0.0',
};

module.exports = async function () {
  return {
    usePnpm: true,
    scenarios: [
      {
        name: 'ember-lts-3.28',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.0',
          },
        },
      },
      {
        name: 'ember-lts-4.4',
        npm: {
          devDependencies: {
            'ember-source': '~4.4.0',
          },
        },
      },
      {
        name: 'ember-lts-4.8',
        npm: {
          devDependencies: {
            'ember-source': '~4.8.0',
          },
        },
      },
      {
        name: 'ember-release',
        npm: {
          devDependencies: {
            ...emberCurrentDeps,
            'ember-source': await getChannelURL('release'),
          },
        },
      },
      {
        name: 'ember-beta',
        npm: {
          devDependencies: {
            ...emberCurrentDeps,
            'ember-source': await getChannelURL('beta'),
          },
        },
      },
      {
        name: 'ember-canary',
        npm: {
          devDependencies: {
            ...emberCurrentDeps,
            'ember-source': await getChannelURL('canary'),
          },
        },
      },
      embroiderSafe(),
      embroiderOptimized(),
    ],
  };
};
