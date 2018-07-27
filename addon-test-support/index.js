import require from 'require';
import { _setRegisteredDisposables } from 'ember-lifeline';

const FAILED_ASSERTION_MESSAGE =
  'One or more objects registered disposables that were not correctly disposed of. Please ensure that objects correctly run their registered disposables by calling `runDisposables` in the `destroy` method of the object.';
let setupTestDone = false;

/**
 * Test helper to assert that all async work is disposed of.
 *
 * @method setupLifelineValidation
 * @param { QUnit.hooks } hooks Qunit's hooks object.
 * @param { Map } options.map Optional map object to use for external reference.
 * @public
 */
export default function setupLifelineValidation(hooks, options) {
  let registeredDisposables;

  if (options && options.map instanceof Map) {
    registeredDisposables = options.map;
  } else {
    registeredDisposables = new Map();
  }

  hooks.beforeEach(function() {
    _setRegisteredDisposables(registeredDisposables);
  });

  if (!setupTestDone) {
    let QUnit = require('qunit').default;

    QUnit.testDone(function(details) {
      if (details.failed === 0 && registeredDisposables.size > 0) {
        throw new Error(FAILED_ASSERTION_MESSAGE);
      }
    });

    setupTestDone = true;
  }

  hooks.afterEach(function(assert) {
    try {
      let retainedObjects = [...registeredDisposables.keys()].map(o =>
        o.toString()
      );

      assert.deepEqual(retainedObjects, [], FAILED_ASSERTION_MESSAGE);
    } finally {
      _setRegisteredDisposables(new WeakMap());
    }
  });
}
