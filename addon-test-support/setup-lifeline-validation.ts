import {
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from 'ember-destroyable-polyfill';
import { settled } from '@ember/test-helpers';

export default function setupLifelineValidation(hooks: NestedHooks) {
  hooks.beforeEach(function () {
    enableDestroyableTracking();
  });

  hooks.afterEach(async function () {
    await settled();
    assertDestroyablesDestroyed();
  });
}
