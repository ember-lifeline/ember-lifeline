import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  runTask,
  scheduleTask,
  throttleTask,
  debounceTask,
  cancelTask,
  cancelDebounce,
  getTask,
} from 'ember-lifeline/utils/tasks';

module('ember-lifeline/utils/tasks', {
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

test('invokes async tasks', function(assert) {
  assert.expect(2);

  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  runTask(
    subject,
    () => {
      hasRun = true;
      assert.ok(true, 'callback was called');
      done();
    },
    0
  );

  assert.notOk(hasRun, 'callback should not have run yet');
});

test('invokes named functions as async tasks', function(assert) {
  assert.expect(3);
  let done = assert.async();
  let subject = this.subject({
    run() {
      hasRun = true;
      assert.equal(this, subject, 'context is correct');
      assert.ok(true, 'callback was called');
      done();
    },
  });
  let hasRun = false;

  runTask(subject, 'run', 0);

  assert.notOk(hasRun, 'callback should not have run yet');
});

test('invokes async tasks with delay', function(assert) {
  assert.expect(3);
  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  runTask(
    subject,
    () => {
      hasRun = true;
      assert.ok(true, 'callback was called');
      done();
    },
    10
  );

  window.setTimeout(() => {
    assert.notOk(hasRun, 'callback should not have run yet');
  }, 5);

  assert.notOk(hasRun, 'callback should not have run yet');
});

test('runTask tasks can be canceled', function(assert) {
  assert.expect(1);
  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  let cancelId = runTask(
    subject,
    () => {
      hasRun = true;
    },
    5
  );

  cancelTask(cancelId);

  window.setTimeout(() => {
    assert.notOk(hasRun, 'callback should have been canceled previously');
    done();
  }, 10);
});

test('scheduleTask invokes async tasks', function(assert) {
  assert.expect(3);

  let subject = this.subject();
  let hasRun = false;

  run(() => {
    scheduleTask(subject, 'actions', () => {
      hasRun = true;
      assert.ok(true, 'callback was called');
    });

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  assert.ok(hasRun, 'callback was called');
});

test('scheduleTask invokes named functions as async tasks', function(assert) {
  assert.expect(5);

  let subject = this.subject({
    run(name) {
      hasRun = true;
      assert.equal(this, subject, 'context is correct');
      assert.equal(name, 'foo', 'passed arguments are correct');
      assert.ok(true, 'callback was called');
    },
  });
  let hasRun = false;

  run(() => {
    scheduleTask(subject, 'actions', 'run', 'foo');
    assert.notOk(hasRun, 'callback should not have run yet');
  });

  assert.ok(hasRun, 'callback was called');
});

test('scheduleTask tasks can be canceled', function(assert) {
  assert.expect(1);
  let subject = this.subject();
  let hasRun = false;

  run(() => {
    let timer = scheduleTask(subject, 'actions', () => {
      hasRun = true;
    });

    cancelTask(timer);
  });

  assert.notOk(hasRun, 'callback should have been canceled previously');
});

test('throttleTask triggers an assertion when a string is not the first argument', function(assert) {
  let subject = this.subject({
    doStuff() {},
  });

  assert.throws(() => {
    throttleTask(subject, subject.doStuff, 5);
  }, /without a string as the first argument/);
});

test('throttleTask triggers an assertion the function name provided does not exist on the object', function(assert) {
  let subject = this.subject();

  assert.throws(() => {
    throttleTask(subject, 'doStuff', 5);
  }, /is not a function/);
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

test('getTask returns passed in task function as task', function(assert) {
  assert.expect(1);

  let task = () => {};

  assert.equal(task, getTask(null, task, 'foo'), 'tasks are equal');
});

test('getTask returns passed in task from the instance', function(assert) {
  assert.expect(1);

  let instance = { fooTask: () => {} };

  assert.equal(
    instance.fooTask,
    getTask(instance, 'fooTask', 'foo'),
    'tasks are equal'
  );
});

test('getTask throws when task not found', function(assert) {
  assert.expect(1);

  assert.throws(() => {
    getTask({}, null, 'foo');
  }, /You must pass a task function or method name to 'foo'./);
});
