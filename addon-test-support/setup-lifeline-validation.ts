import { deprecate } from '@ember/debug';
import {
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from '@ember/destroyable';

export default function setupLifelineValidation(hooks: NestedHooks) {
  deprecate(
    'ember-lifeline setupLifelineValidation is deprecated. The library takes care of disposing all the disposables and hence it is not required to track if all the disposables have been destroyed',
    false,
    {
      id: 'ember-lifeline-deprecated-setupLifelineValidation',
      until: '7.0.0',
      // @ts-ignore
      for: 'ember-lifeline',
      since: {
        enabled: '6.0.3',
      },
    }
  );

  hooks.beforeEach(function () {
    enableDestroyableTracking();
  });

  hooks.afterEach(async function () {
    assertDestroyablesDestroyed();
  });
}
