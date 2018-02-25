import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  registeredDisposables,
  registerDisposable,
  runDisposables,
} from 'ember-lifeline/utils/disposable';

module('ember-lifeline/utils/disposable', function(hooks) {
  hooks.beforeEach(function() {
    this.subject = EmberObject.create({
      destroy() {
        runDisposables(this);
      },
    });
  });

  hooks.afterEach(function() {
    run(this.subject, 'destroy');
  });

  test('registerDisposable asserts params are not present', function(assert) {
    assert.expect(2);

    assert.throws(function() {
      registerDisposable();
    }, /Called `registerDisposable` where `obj` is not an object/);

    assert.throws(function() {
      registerDisposable({}, null);
    }, /Called `registerDisposable` where `dispose` is not a function/);
  });

  test('registerDisposable correctly allocates array if not allocated', function(assert) {
    assert.expect(2);

    assert.equal(registeredDisposables.get(this.subject), undefined);

    registerDisposable(this.subject, function() {});

    assert.equal(registeredDisposables.get(this.subject).constructor, Array);
  });

  test('registerDisposable adds disposable to disposables', function(assert) {
    assert.expect(1);

    let dispose = () => {};

    registerDisposable(this.subject, dispose);

    assert.equal(
      registeredDisposables.get(this.subject)[0],
      dispose,
      'dispose function is added to _registeredDisposables'
    );
  });

  test('registerDisposable adds unique disposable to disposables', function(assert) {
    assert.expect(2);

    let dispose = () => {};

    registerDisposable(this.subject, dispose);

    assert.equal(
      dispose,
      registeredDisposables.get(this.subject)[0],
      'disposable is returned'
    );

    let otherDisposable = registerDisposable(this.subject, dispose);

    assert.notEqual(dispose, otherDisposable, 'disposable returned is unique');
  });

  test('runDisposables runs all disposables when destroying', function(assert) {
    assert.expect(2);

    let callCount = 0;

    let dispose = () => {
      callCount++;
    };
    let disposeTheSecond = () => {
      callCount++;
    };

    registerDisposable(this.subject, dispose);
    registerDisposable(this.subject, disposeTheSecond);

    assert.equal(callCount, 0, 'two disposables are registered');

    runDisposables(this.subject);

    assert.equal(callCount, 2, 'no disposables are registered');
  });

  test('destroy integration runs all disposables when destroying', function(assert) {
    assert.expect(2);

    let callCount = 0;

    let dispose = () => {
      callCount++;
    };
    let disposeTheSecond = () => {
      callCount++;
    };

    registerDisposable(this.subject, dispose);
    registerDisposable(this.subject, disposeTheSecond);

    registeredDisposables.get(this.subject);

    assert.equal(callCount, 0, 'two disposables are registered');

    run(this.subject, 'destroy');

    assert.equal(callCount, 2, 'no disposables are registered');
  });
});
