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
  }, /You must pass a function as a disposable/);
});

test('registerDisposable: returns a label when a disposable is registered', function(assert) {
  assert.expect(2);

  let disposable = () => {};

  let label = this.subject.registerDisposable(disposable);

  assert.equal(label, 0, 'label is returned');

  let otherLabel = this.subject.registerDisposable(disposable);

  assert.notEqual(label, otherLabel, 'label returned is unique');
});

test('runDisposable: runs the disposable when called with valid label', function(assert) {
  assert.expect(1);

  let callCount = 0;
  let disposable = () => {
    callCount++;
  };

  let label = this.subject.registerDisposable(disposable);

  this.subject.runDisposable(label);

  assert.equal(callCount, 1, 'disposable is called');
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
