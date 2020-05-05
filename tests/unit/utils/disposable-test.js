import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  registerDisposable,
  runDisposables,
  _setRegisteredDisposables,
} from 'ember-lifeline';

module('ember-lifeline/utils/disposable', function (hooks) {
  hooks.beforeEach(function () {
    this.obj = EmberObject.extend({
      destroy() {
        runDisposables(this);

        this._super(...arguments);
      },
    }).create();

    this.registeredDisposables = new Map();

    _setRegisteredDisposables(this.registeredDisposables);
  });

  hooks.afterEach(function (assert) {
    run(this.obj, 'destroy');

    let retainedObjects = [];
    this.registeredDisposables.forEach((v, k) =>
      retainedObjects.push(k.toString())
    );

    assert.deepEqual(
      retainedObjects,
      [],
      'Registered disposables should be empty'
    );

    _setRegisteredDisposables(new WeakMap());
  });

  hooks.after(function () {
    _setRegisteredDisposables(new WeakMap());
  });

  test('registerDisposable asserts params are not present', function (assert) {
    assert.expect(4);

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

  test('registerDisposable correctly allocates array if not allocated', function (assert) {
    assert.expect(3);

    assert.equal(this.registeredDisposables.get(this.obj), undefined);

    registerDisposable(this.obj, function () {});

    assert.equal(this.registeredDisposables.get(this.obj).constructor, Array);
  });

  test('registerDisposable adds disposable to disposables', function (assert) {
    assert.expect(2);

    let dispose = () => {};

    registerDisposable(this.obj, dispose);

    assert.equal(
      this.registeredDisposables.get(this.obj)[0],
      dispose,
      'dispose function is added to _registeredDisposables'
    );
  });

  test('registerDisposable adds unique disposable to disposables', function (assert) {
    assert.expect(3);

    let dispose = () => {};

    registerDisposable(this.obj, dispose);

    assert.equal(
      dispose,
      this.registeredDisposables.get(this.obj)[0],
      'disposable is returned'
    );

    let otherDisposable = registerDisposable(this.obj, dispose);

    assert.notEqual(dispose, otherDisposable, 'disposable returned is unique');
  });

  test('runDisposables runs all disposables when destroying', function (assert) {
    assert.expect(3);

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

    runDisposables(this.obj);

    assert.equal(callCount, 2, 'no disposables are registered');
  });

  test('destroy integration runs all disposables when destroying', function (assert) {
    assert.expect(3);

    let callCount = 0;

    let dispose = () => {
      callCount++;
    };
    let disposeTheSecond = () => {
      callCount++;
    };

    registerDisposable(this.obj, dispose);
    registerDisposable(this.obj, disposeTheSecond);

    this.registeredDisposables.get(this.obj);

    assert.equal(callCount, 0, 'two disposables are registered');

    run(this.obj, 'destroy');

    assert.equal(callCount, 2, 'no disposables are registered');
  });
});
