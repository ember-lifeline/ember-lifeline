import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import setupLifelineValidation from 'ember-lifeline/test-support';
import { registerDisposable } from 'ember-lifeline';

module('setupLifelineValidation', function(hooks) {
  setupLifelineValidation(hooks);
  setupTest(hooks);

  hooks.beforeEach(function(assert) {
    let originalPushResult = assert.pushResult;
    assert.pushResult = function(resultInfo) {
      // Inverts the result so we can test failing assertions
      resultInfo.result = !resultInfo.result;
      resultInfo.message = `Failed: ${resultInfo.message}`;
      originalPushResult(resultInfo);
    };

    let serviceName = 'service:under-test';
    this.owner.register(serviceName, Service.extend());
    let factory = this.owner.factoryFor
      ? this.owner.factoryFor(serviceName)
      : this.owner._lookupFactory(serviceName);

    this.service = factory.create();
  });

  test('setupLifelineValidation fails when registeredDisposables is not cleared', function(assert) {
    assert.expect(1);

    registerDisposable(this.service, () => {});
  });
});
