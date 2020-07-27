import {
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from 'ember-destroyable-polyfill';

export default function setupLifelineValidation(hooks: NestedHooks) {
  hooks.beforeEach(function () {
    enableDestroyableTracking();
  });

  hooks.afterEach(async function () {
    assertDestroyablesDestroyed();
  });
}
