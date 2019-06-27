// @ts-ignore
import require from 'require';
import { _setRegisteredDisposables } from 'ember-lifeline';

const FAILED_ASSERTION_MESSAGE =
  'One or more objects registered disposables that were not correctly disposed of. Please ensure that objects correctly run their registered disposables by calling `runDisposables` in the `destroy` method of the object.';

export default function setupLifelineValidation(hooks: NestedHooks) {
  let registeredDisposables = new Map();
  hooks.beforeEach(function() {
    _setRegisteredDisposables(registeredDisposables);
  });

  hooks.afterEach(function(assert: Assert) {
    let test = QUnit.config.current;

    try {
      let retainedObjects: unknown[] = [];
      registeredDisposables.forEach((_, k) =>
        retainedObjects.push(k.toString())
      );

      if (retainedObjects.length > 0) {
        if (test.expected !== null) {
          test.expected += 1;
        }

        assert.deepEqual(retainedObjects, [], FAILED_ASSERTION_MESSAGE);
      }
    } finally {
      _setRegisteredDisposables(new WeakMap());
    }
  });
}
