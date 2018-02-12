import Ember from 'ember';
import { module, test } from 'qunit';
import getOrAllocate from 'ember-lifeline/utils/get-or-allocate';

const { WeakMap } = Ember;

module('ember-lifeline/utils/get-or-allocate', {
  beforeEach() {
    this.map = new WeakMap();
    this.obj = {};
    this.disposable = () => () => {};
  },

  afterEach() {
    this.map = null;
    this.obj = null;
  },
});

test("allocates an array for object when it doesn't exist", function(assert) {
  assert.expect(2);

  getOrAllocate(this.map, this.obj, Array, this.disposable);

  assert.ok(this.map.get(this.obj), 'value is defined');
  assert.equal(this.map.get(this.obj).constructor, Array, 'value is a array');
});

test("allocates an object for object when it doesn't exist", function(assert) {
  assert.expect(2);

  getOrAllocate(this.map, this.obj, Object, this.disposable);

  assert.ok(this.map.get(this.obj), 'value is defined');
  assert.equal(
    this.map.get(this.obj).constructor,
    Object,
    'value is an object'
  );
});

test("allocates an array on object when it doesn't exist and returns value", function(assert) {
  assert.expect(1);

  let value = getOrAllocate(this.map, this.obj, Array, this.disposable);

  assert.equal(
    this.map.get(this.obj),
    value,
    'foo property is defined and returned'
  );
});

test("doesn't allocate value when value already exists", function(assert) {
  assert.expect(2);

  let arr = [];
  arr.push(1);
  this.map.set(this.obj, arr);
  let value = getOrAllocate(this.map, this.obj, Array, this.disposable);

  assert.equal(arr, value, 'values are equal');
  assert.equal(this.map.get(this.obj)[0], 1, 'value is defined and returned');
});
