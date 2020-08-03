import {
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from '@ember/destroyable';

export default function setupLifelineValidation(hooks: NestedHooks) {
  hooks.beforeEach(function () {
    enableDestroyableTracking();
  });

  hooks.afterEach(async function () {
    assertDestroyablesDestroyed();
  });
}
