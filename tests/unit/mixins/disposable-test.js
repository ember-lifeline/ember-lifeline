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

test('registerDisposable: returns a token when a disposable is registered', function(assert) {
  assert.expect(2);

  let disposable = () => {};

  let token = this.subject.registerDisposable(disposable);

  assert.equal(token, this.subject._registeredDisposables[0], 'token is returned');

  let otherToken = this.subject.registerDisposable(disposable);

  assert.notEqual(token, otherToken, 'token returned is unique');
});

test('disposable invoked explicitly disposes of disposable', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let disposable = () => {
    callCount++;
  };

  let token = this.subject.registerDisposable(disposable);

  token.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(this.subject._registeredDisposables[0].disposed, 'disposable marked as disposed');
});

test('disposable invoked explicitly multiple times is only invoked once', function(assert) {
  assert.expect(2);

  let callCount = 0;
  let disposable = () => {
    callCount++;
  };

  let token = this.subject.registerDisposable(disposable);

  token.dispose();
  token.dispose();

  assert.equal(callCount, 1, 'disposable is called');
  assert.ok(this.subject._registeredDisposables[0].disposed, 'disposable marked as disposed');
});

test('runDisposables: runs all disposables when destroying', function(assert) {
  assert.expect(2);

  let disposable = () => {};
  let disposableTheSecond = () => {};

  this.subject.registerDisposable(disposable);
  this.subject.registerDisposable(disposableTheSecond);

  assert.equal(this.subject._registeredDisposables.length, 2, 'two disposables are registered');

  run(this.subject, 'destroy');

  assert.equal(this.subject._registeredDisposables.length, 0, 'no disposables are registered');
});
