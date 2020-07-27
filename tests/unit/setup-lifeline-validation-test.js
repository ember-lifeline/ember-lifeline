/* global QUnit */
import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { registerDisposable } from 'ember-lifeline';
import { setupLifelineValidation } from 'ember-lifeline/test-support';

module('setupLifelineValidation', function (hooks) {
  setupLifelineValidation(hooks);
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    let test = QUnit.config.current;
    test.pushFailure = function (message) {
      assert.ok(
        message.indexOf(
          'Some destroyables were not destroyed during this test'
        ) >= 0,
        `Failed: ${message}`
      );
    };

    let serviceName = 'service:under-test';
    this.owner.register(serviceName, Service.extend());
    let factory = this.owner.factoryFor
      ? this.owner.factoryFor(serviceName)
      : this.owner._lookupFactory(serviceName);

    this.service = factory.create();
  });

  test('setupLifelineValidation fails when registeredDisposables is not cleared', function (assert) {
    assert.expect(1);

    registerDisposable(this.service, () => {});
  });
});
