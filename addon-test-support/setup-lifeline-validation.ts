import require from 'require';
import { _setRegisteredDisposables } from 'ember-lifeline';

const FAILED_ASSERTION_MESSAGE =
  'One or more objects registered disposables that were not correctly disposed of. Please ensure that objects correctly run their registered disposables by calling `runDisposables` in the `destroy` method of the object.';
let setupTestDone = false;

export default function setupLifelineValidation(hooks) {
  let registeredDisposables = new Map();
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
      let retainedObjects = [];
      registeredDisposables.forEach((_, k) =>
        retainedObjects.push(k.toString())
      );

      assert.deepEqual(retainedObjects, [], FAILED_ASSERTION_MESSAGE);
    } finally {
      _setRegisteredDisposables(new WeakMap());
    }
  });
}
