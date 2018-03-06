import require from 'require';
import { hasRunAllDisposables } from 'ember-lifeline';

let QUnit = require('qunit').default;

const FAILED_ASSERTION_MESSAGE =
  'One or more objects registered disposables that were not correctly disposed of. Please ensure that objects correctly run their registered disposables by calling `runDisposables` in the `destroy` method of the object.';
let setupTestDone = false;

export default function setupLifelineValidation(hooks) {
  if (!setupTestDone) {
    QUnit.testDone(ensureDisposablesRunIfNoFailures);

    setupTestDone = true;
  }

  hooks.afterEach(ensureDisposablesRun);
}

export function ensureDisposablesRunIfNoFailures(details) {
  if (details.failed === 0 && !hasRunAllDisposables()) {
    throw new Error(FAILED_ASSERTION_MESSAGE);
  }
}

export function ensureDisposablesRun() {
  if (!hasRunAllDisposables()) {
    QUnit.assert.ok(false, FAILED_ASSERTION_MESSAGE);
  }
}
