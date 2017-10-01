import { module, test } from 'qunit';
import getOrAllocate from 'ember-lifeline/utils/get-or-allocate';

module('ember-lifeline/utils/get-or-allocate', {
  beforeEach() {
    this.subject = {};
  },

  afterEach() {
    this.subject = null;
  }
});

test('allocates an array on object when property doesn\'t exist', function(assert) {
  getOrAllocate(this.subject, 'foo', []);

  assert.ok(this.subject.foo, 'foo property is defined');
  assert.equal(this.subject.foo.constructor, Array, 'foo is a array');
});

test('allocates an object on object when property doesn\'t exist', function(assert) {
  getOrAllocate(this.subject, 'foo', {});

  assert.ok(this.subject.foo, 'foo property is defined');
  assert.equal(this.subject.foo.constructor, Object, 'foo is a object');
});

test('allocates an array on object when property doesn\'t exist and returns value', function(assert) {
  let property = getOrAllocate(this.subject, 'foo', []);

  assert.equal(this.subject.foo, property, 'foo property is defined and returned');
});

test('doesn\'t allocate property when property already exists', function(assert) {

  this.subject = { foo: 'bar' };
  let property = getOrAllocate(this.subject, 'foo', []);

  assert.equal(property, 'bar', 'foo property is defined and returned');
});

