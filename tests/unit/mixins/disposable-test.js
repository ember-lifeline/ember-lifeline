import Ember from 'ember';
import { module, test } from 'qunit';

import DisposableMixin from 'ember-lifeline/mixins/disposable';

const {
  Object: EmberObject,
  run
} = Ember;

module('ember-lifeline/mixins/disposable', {
  beforeEach() {
    this.BaseObject = EmberObject.extend(DisposableMixin);
    this.subject = this.BaseObject.create(...arguments);
  },

  afterEach() {
    run(this.subject, 'destroy');
  }
});

test('registerDisposable: ensures a function is passed as a disposable', function(assert) {
  assert.expect(1);

  assert.throws(() => {
    this.subject.registerDisposable({});
  }, /You must pass a function for `dispose`/);
});

test('registerDisposable: returns a disposable when a disposable is registered', function(assert) {
  assert.expect(2);

  let dispose = () => {};

  let disposable = this.subject.registerDisposable(dispose);

  assert.equal(disposable, this.subject._registeredDisposables[0], 'disposable is returned');

  let otherDisposable = this.subject.registerDisposable(dispose);

  assert.notEqual(disposable, otherDisposable, 'disposable returned is unique');
});

test('disposable invoked explicitly disposes of disposable', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let dispose = () => {
    callCount++;
  };

  let disposable = this.subject.registerDisposable(dispose);

  disposable.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(this.subject._registeredDisposables[0].disposed, 'disposable marked as disposed');
});

test('disposable invoked explicitly multiple times is only invoked once', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let dispose = () => {
    callCount++;
  };

  let disposable = this.subject.registerDisposable(dispose);

  disposable.dispose();
  disposable.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(this.subject._registeredDisposables[0].disposed, 'disposable marked as disposed');
});

test('runDisposables: runs all disposables when destroying', function(assert) {
  assert.expect(2);

  let dispose = () => {};
  let disposeTheSecond = () => {};

  this.subject.registerDisposable(dispose);
  this.subject.registerDisposable(disposeTheSecond);

  assert.equal(this.subject._registeredDisposables.length, 2, 'two disposables are registered');

  run(this.subject, 'destroy');

  assert.equal(this.subject._registeredDisposables.length, 0, 'no disposables are registered');
});

test('runDisposables: sets all disposables to disposed', function(assert) {
  assert.expect(2);

  let dispose = () => {};
  let disposeTheSecond = () => {};

  let disposable = this.subject.registerDisposable(dispose);
  let disposableTheSecond = this.subject.registerDisposable(disposeTheSecond);

  run(this.subject, 'destroy');

  assert.ok(disposable.disposed, 'first disposable is desposed');
  assert.ok(disposableTheSecond.disposed, 'second disposable is desposed');
});
