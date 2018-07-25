import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import setupLifelineValidation from 'ember-lifeline/test-support';
import { registerDisposable } from 'ember-lifeline';

module('setupLifelineValidation options', function(hooks) {
  let disposableMap = new Map();
  setupLifelineValidation(hooks, { map: disposableMap });
  setupTest(hooks);

  hooks.beforeEach(function(assert) {
    let serviceName = 'service:under-test';
    this.owner.register(serviceName, Service.extend());
    let factory = this.owner.factoryFor
      ? this.owner.factoryFor(serviceName)
      : this.owner._lookupFactory(serviceName);

    this.service = factory.create();
  });

  test('setupLifelineValidation allows passing in a custom map', function(assert) {
    assert.expect(3);

    assert.equal(disposableMap.size, 0, 'Sanity check.');
    registerDisposable(this.service, () => {});
    assert.equal(disposableMap.size, 1, 'The map is exposed to user code.');

    // Manually clear the disposables map so as not to trigger the built-in assertion.
    disposableMap.clear();
  });
});
