import EmberObject from '@ember/object';
import { module, test } from 'qunit';
import { debounceTask, cancelDebounce, runDisposables } from 'ember-lifeline';

module('ember-lifeline/debounce-task', {
  beforeEach() {
    this.BaseObject = EmberObject.extend();
  },

  afterEach() {
    runDisposables(this.obj);
  },

  subject() {
    if (this._subject) {
      return this._subject;
    }

    return (this._subject = this.BaseObject.create(...arguments));
  },
});

test('debounceTask runs tasks', function(assert) {
  assert.expect(4);

  let done = assert.async();
  let runCount = 0;
  let runArg;
  let obj = (this.obj = this.subject({
    doStuff(arg) {
      runCount++;
      assert.equal(this, obj, 'context is correct');
      runArg = arg;
    },
  }));

  debounceTask(this.obj, 'doStuff', 'arg1', 5);
  debounceTask(this.obj, 'doStuff', 'arg2', 5);
  debounceTask(this.obj, 'doStuff', 'arg3', 5);

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 1, 'should have run only once');
    assert.equal(runArg, 'arg3', 'should run the task with the last arg');
    done();
  }, 10);
});

test('debounceTask can be canceled', function(assert) {
  let done = assert.async();
  assert.expect(2);

  let runCount = 0;
  this.obj = this.subject({
    doStuff() {
      runCount++;
    },
  });

  debounceTask(this.obj, 'doStuff', 5);
  debounceTask(this.obj, 'doStuff', 5);
  cancelDebounce(this.obj, 'doStuff');

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 0, 'should not have run');
    done();
  }, 10);
});
