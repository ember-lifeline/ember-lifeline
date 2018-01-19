import EmberObject from '@ember/object';
import { module, test } from 'qunit';
import {
  registerDisposable,
  // runDisposables,
} from 'ember-lifeline/utils/disposable';

module('ember-lifeline/utils/disposable');

test('registerDisposable asserts if `dispose` is not a function', function(assert) {
  assert.expect(1);

  assert.throws(function() {
    registerDisposable({}, null);
  });
});

test('registerDisposable correctly allocates array if not allocated', function(assert) {
  assert.expect(2);

  let obj = EmberObject.create({});

  assert.equal(obj._registeredDisposables, undefined);

  registerDisposable(obj, function() {});

  assert.equal(obj._registeredDisposables.constructor, Array);
});
