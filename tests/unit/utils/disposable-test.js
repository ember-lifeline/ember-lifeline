import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  registerDisposable,
  runDisposables,
} from 'ember-lifeline/utils/disposable';

module('ember-lifeline/utils/disposable', {
  beforeEach() {
    this.subject = EmberObject.create();
  },

  afterEach() {
    run(this.subject, 'destroy');
  },
});

test('registerDisposable asserts if `dispose` is not a function', function(assert) {
  assert.expect(1);

  assert.throws(function() {
    registerDisposable({}, null);
  });
});

test('registerDisposable correctly allocates array if not allocated', function(assert) {
  assert.expect(2);

  assert.equal(this.subject._registeredDisposables, undefined);

  registerDisposable(this.subject, function() {});

  assert.equal(this.subject._registeredDisposables.constructor, Array);
});

test('registerDisposable correctly converts dispose function to disposable', function(assert) {
  assert.expect(3);

  let dispose = () => {};

  let disposable = registerDisposable(this.subject, dispose);

  assert.equal(disposable.constructor, Object, 'disposable is an object');
  assert.equal(
    disposable.dispose.constructor,
    Function,
    'disposable.dispose is a function'
  );
  assert.equal(disposable.disposed, false, 'disposable is not disposed');
});

test('registerDisposable adds disposable to disposables', function(assert) {
  assert.expect(1);

  let dispose = () => {};

  let disposable = registerDisposable(this.subject, dispose);

  assert.equal(
    this.subject._registeredDisposables[0],
    disposable,
    'dispose function is added to _registeredDisposables'
  );
});

test('registerDisposable adds unique disposable to disposables', function(assert) {
  assert.expect(2);

  let dispose = () => {};

  let disposable = registerDisposable(this.subject, dispose);

  assert.equal(
    disposable,
    this.subject._registeredDisposables[0],
    'disposable is returned'
  );

  let otherDisposable = registerDisposable(this.subject, dispose);

  assert.notEqual(disposable, otherDisposable, 'disposable returned is unique');
});

test('registerDisposable sets up willDestroy', function(assert) {
  assert.expect(2);

  let dispose = () => {};

  assert.notOk(
    this.subject.willDestroy.patched,
    'willDestroy has not been patched'
  );

  registerDisposable(this.subject, dispose);

  assert.ok(this.subject.willDestroy.patched, 'willDestroy is patched');
});

test('registerDisposable sets up willDestroy only once', function(assert) {
  assert.expect(3);

  let dispose = () => {};

  assert.notOk(
    this.subject.willDestroy.patched,
    'willDestroy has not been patched'
  );

  registerDisposable(this.subject, dispose);

  assert.ok(this.subject.willDestroy.patched, 'willDestroy is patched');

  this.subject.willDestroy.twice = false;

  registerDisposable(this.subject, dispose);

  assert.notOk(this.subject.willDestroy.twice, 'willDestroy only patched once');
});

test('disposable invoked explicitly disposes of disposable', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let dispose = () => {
    callCount++;
  };

  let disposable = registerDisposable(this.subject, dispose);

  disposable.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(
    this.subject._registeredDisposables[0].disposed,
    'disposable marked as disposed'
  );
});

test('disposable invoked explicitly multiple times is only invoked once', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let dispose = () => {
    callCount++;
  };

  let disposable = registerDisposable(this.subject, dispose);

  disposable.dispose();
  disposable.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(
    this.subject._registeredDisposables[0].disposed,
    'disposable marked as disposed'
  );
});

test('runDisposables: runs all disposables when destroying', function(assert) {
  assert.expect(2);

  let dispose = () => {};
  let disposeTheSecond = () => {};

  registerDisposable(this.subject, dispose);
  registerDisposable(this.subject, disposeTheSecond);

  assert.equal(
    this.subject._registeredDisposables.length,
    2,
    'two disposables are registered'
  );

  run(this.subject, 'destroy');

  assert.equal(
    this.subject._registeredDisposables.length,
    0,
    'no disposables are registered'
  );
});

test('runDisposables: sets all disposables to disposed', function(assert) {
  assert.expect(2);

  let dispose = () => {};
  let disposeTheSecond = () => {};

  let disposable = registerDisposable(this.subject, dispose);
  let disposableTheSecond = registerDisposable(this.subject, disposeTheSecond);

  run(this.subject, 'destroy');

  assert.ok(disposable.disposed, 'first disposable is desposed');
  assert.ok(disposableTheSecond.disposed, 'second disposable is desposed');
});

test('runDisposables throws when no disposables are passed as a parameter', function(assert) {
  assert.expect(1);

  assert.throws(() => {
    runDisposables();
  }, 'Called `runDisposables` where `disposables` is not an array of disposables');
});
