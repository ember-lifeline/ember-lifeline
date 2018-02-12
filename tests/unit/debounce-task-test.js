import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { debounceTask, cancelDebounce } from 'ember-lifeline';

module('ember-lifeline/debounce-task', {
  beforeEach() {
    this.BaseObject = EmberObject.extend();
  },

  afterEach() {
    run(this.subject(), 'destroy');
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
  let subject = this.subject({
    doStuff(arg) {
      runCount++;
      assert.equal(this, subject, 'context is correct');
      runArg = arg;
    },
  });

  debounceTask(subject, 'doStuff', 'arg1', 5);
  debounceTask(subject, 'doStuff', 'arg2', 5);
  debounceTask(subject, 'doStuff', 'arg3', 5);

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
  let subject = this.subject({
    doStuff() {
      runCount++;
    },
  });

  debounceTask(subject, 'doStuff', 5);
  debounceTask(subject, 'doStuff', 5);
  cancelDebounce(subject, 'doStuff');

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 0, 'should not have run');
    done();
  }, 10);
});
