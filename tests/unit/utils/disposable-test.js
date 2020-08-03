import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { registerDisposable, runDisposables } from 'ember-lifeline';
import {
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from '@ember/destroyable';

module('ember-lifeline/utils/disposable', function (hooks) {
  hooks.beforeEach(function () {
    this.obj = EmberObject.extend({
      destroy() {
        runDisposables(this);

        this._super(...arguments);
      },
    }).create();

    enableDestroyableTracking();
  });

  hooks.afterEach(function () {
    run(this.obj, 'destroy');

    assertDestroyablesDestroyed();
  });

  test('registerDisposable asserts params are not present', function (assert) {
    assert.expect(3);

    assert.throws(function () {
      registerDisposable();
    }, /Called `registerDisposable` where `obj` is not an object/);

    assert.throws(function () {
      registerDisposable({}, null);
    }, /Called `registerDisposable` where `dispose` is not a function/);

    registerDisposable(this.obj, () => {});
    run(this.obj, 'destroy');

    assert.throws(function () {
      registerDisposable(this.obj, () => {});
    }, /Called `registerDisposable` on a destroyed object/);
  });

  test('destroy integration runs all disposables when destroying', function (assert) {
    assert.expect(2);

    let callCount = 0;

    let dispose = () => {
      callCount++;
    };
    let disposeTheSecond = () => {
      callCount++;
    };

    registerDisposable(this.obj, dispose);
    registerDisposable(this.obj, disposeTheSecond);

    assert.equal(callCount, 0, 'two disposables are registered');

    run(this.obj, 'destroy');

    assert.equal(callCount, 2, 'no disposables are registered');
  });
});
