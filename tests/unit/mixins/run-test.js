import Ember from 'ember';
import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import wait from 'ember-test-helpers/wait';

import ContextBoundTasksMixin, {
  setShouldPoll,
  pollTaskFor
} from 'ember-lifeline/mixins/run';

module('ember-lifeline/mixins/run', {
  beforeEach() {
    this.BaseObject = EmberObject.extend(ContextBoundTasksMixin);
  },

  afterEach() {
    run(this.subject(), 'destroy');
    setShouldPoll(null);
  },

  subject({ force } = {}) {
    if (force && this._subject) {
      run(this._subject, 'destroy');
      this._subject = null;
    }

    if (this._subject) {
      return this._subject;
    }

    return this._subject = this.BaseObject.create(...arguments);
  }
});

test('ensures arrays are not eagerly allocated', function(assert) {
  assert.expect(3);

  let subject = this.subject();

  assert.notOk(subject._pendingTimers);
  assert.notOk(subject._pendingDebounces);
  assert.notOk(subject._pollerLabels);
});

test('invokes async tasks', function(assert) {
  assert.expect(2);

  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  subject.runTask(() => {
    hasRun = true;
    assert.ok(true, 'callback was called');
    done();
  }, 0);

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
    }
  });
  let hasRun = false;

  subject.runTask('run', 0);

  assert.notOk(hasRun, 'callback should not have run yet');
});

test('invokes async tasks with delay', function(assert) {
  assert.expect(3);
  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  subject.runTask(() => {
    hasRun = true;
    assert.ok(true, 'callback was called');
    done();
  }, 10);

  window.setTimeout(() => {
    assert.notOk(hasRun, 'callback should not have run yet');
  }, 5);

  assert.notOk(hasRun, 'callback should not have run yet');
});

test('cancels tasks added with `runTask`', function(assert) {
  assert.expect(2);
  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  subject.runTask(() => {
    hasRun = true;
    assert.ok(false, 'callback was called');
  }, 0);

  assert.notOk(hasRun, 'callback should not have run yet');
  run(subject, 'destroy');

  window.setTimeout(() => {
    assert.notOk(hasRun, 'callback should not have run yet');
    done();
  }, 10);
});

test('runTask tasks can be canceled', function(assert) {
  assert.expect(1);
  let subject = this.subject();
  let done = assert.async();
  let hasRun = false;

  let cancelId = subject.runTask(() => {
    hasRun = true;
  }, 5);

  subject.cancelTask(cancelId);

  window.setTimeout(() => {
    assert.notOk(hasRun, 'callback should have been canceled previously');
    done();
  }, 10);
});

test('throttleTask triggers an assertion when a string is not the first argument', function(assert) {
  let subject = this.subject({
    doStuff() {}
  });

  assert.throws(() => {
    subject.throttleTask(subject.doStuff, 5);
  }, /without a string as the first argument/);
});

test('throttleTask triggers an assertion the function name provided does not exist on the object', function(assert) {
  let subject = this.subject();

  assert.throws(() => {
    subject.throttleTask('doStuff', 5);
  }, /is not a function/);
});

test('throttleTask can be canceled', function(assert) {
  assert.expect(1);

  let done = assert.async();
  let runCount = 0;
  let subject = this.subject({
    doStuff() {
      runCount++;
    }
  });

  let cancelId = subject.throttleTask('doStuff', 5, false);
  subject.cancelThrottle(cancelId);
  subject.throttleTask('doStuff', 5, false);

  window.setTimeout(() => {
    assert.equal(runCount, 2, 'callback should have been canceled previously');
    done();
  }, 10);
});

test('No error should be thrown by QUnit (throttles should be cleaned up)', function(assert) {
  assert.expect(0);

  let subject = this.subject({
    doStuff() {}
  });

  subject.throttleTask('doStuff', 5);
});

test('debounceTask runs tasks', function(assert) {
  assert.expect(3);

  let done = assert.async();
  let runCount = 0;
  let runArg;
  let subject = this.subject({
    doStuff(arg) {
      runCount++;
      runArg = arg;
    }
  });

  subject.debounceTask('doStuff', 'arg1', 5);
  subject.debounceTask('doStuff', 'arg2', 5);
  subject.debounceTask('doStuff', 'arg3', 5);

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 1, 'should have run only once');
    assert.equal(runArg, 'arg3', 'should run the task with the last arg');
    done();
  }, 10);
});

test('debounceTask should cancel properly on teardown', function(assert) {
  let done = assert.async();
  assert.expect(2);

  let runCount = 0;
  let subject = this.subject({
    doStuff() {
      runCount++;
    }
  });

  subject.debounceTask('doStuff', 5);
  subject.debounceTask('doStuff', 5);
  run(subject, 'destroy');

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 0, 'should not have run');
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
    }
  });

  subject.debounceTask('doStuff', 5);
  subject.debounceTask('doStuff', 5);
  subject.cancelDebounce('doStuff');

  assert.equal(runCount, 0, 'should not have run');

  window.setTimeout(() => {
    assert.equal(runCount, 0, 'should not have run');
    done();
  }, 10);
});

test('debounceTask triggers an assertion when a string is not the first argument', function(assert) {
  let subject = this.subject({
    doStuff() {}
  });

  assert.throws(() => {
    subject.debounceTask(subject.doStuff, 5);
  }, /without a string as the first argument/);
});

test('debounceTask triggers an assertion the function name provided does not exist on the object', function(assert) {
  let subject = this.subject();

  assert.throws(() => {
    subject.debounceTask('doStuff', 5);
  }, /is not a function/);
});

test('pollTask: provides ability to poll with callback provided', function(assert) {
  assert.expect(2);
  setShouldPoll(() => true);
  let subject = this.subject();
  let calledTimes = 0;

  subject.pollTask((next) => {
    calledTimes++;

    if (calledTimes === 5) {
      assert.ok(true, 'polled successfully');
    } else {
      subject.runTask(next, 5);
    }
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: provides ability to poll with method provided', function(assert) {
  assert.expect(2);
  setShouldPoll(() => true);
  let calledTimes = 0;
  let subject = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes === 5) {
        assert.ok(true, 'polled successfully');
      } else {
        subject.runTask(next, 5);
      }
    }
  });

  subject.pollTask('run');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: calls callback once in testing mode', function(assert) {
  assert.expect(2);
  let subject = this.subject();
  let calledTimes = 0;

  subject.pollTask((next) => {
    calledTimes++;

    if (calledTimes > 1) {
      assert.ok(false, 'should not be called more than once');
    }

    subject.runTask(next, 5);
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // test string form
  subject.run = function(next) {
    calledTimes++;

    subject.runTask(next, 5);
  };

  subject.pollTask('run');
  assert.equal(calledTimes, 2, 'pollTask executed with method name properly');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: next tick can be incremented via test helper with callback', function(assert) {
  assert.expect(2);
  let subject = this.subject();
  let calledTimes = 0;

  subject.pollTask((next) => {
    calledTimes++;

    if (calledTimes > 2) {
      assert.ok(false, 'should not be called more than twice');
    }

    subject.runTask(next, 5);
  }, 'testington');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  return wait()
    .then(function() {
      pollTaskFor('testington');

      assert.equal(calledTimes, 2, 'poll task argument was invoked after ticking');

      // ensure that pending pollTask's are not running
      return wait();
    });
});

test('pollTask: next tick can be incremented via test helper with method name', function(assert) {
  assert.expect(2);
  let calledTimes = 0;
  let subject = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }

      subject.runTask(next, 5);
    }
  });

  subject.pollTask('run', 'testington');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  return wait()
    .then(function() {
      pollTaskFor('testington');

      assert.equal(calledTimes, 2, 'poll task argument was invoked after ticking');

      // ensure that pending pollTask's are not running
      return wait();
    });
});

test('pollTask: cannot advance a poll that has not been scheduled', function(assert) {
  assert.expect(3);

  let subject = this.subject();
  let calledTimes = 0;

  subject.pollTask(() => {
    calledTimes++;

    if (calledTimes > 2) {
      assert.ok(false, 'should not be called more than twice');
    }
  }, 'testington');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  assert.throws(function() {
    pollTaskFor('testington');
  }, /You cannot advance a pollTask \(`testington`\) when `next` has not been called./);

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: cannot use the same label twice in normal dev mode', function(assert) {
  assert.expect(1);
  setShouldPoll(() => true);
  let subject = this.subject();

  subject.pollTask(() => {}, 'one');

  assert.throws(() => {
    subject.pollTask(() => {}, 'one');
  }, /The label provided to `pollTask` must be unique/);

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: cannot use the same label twice in test mode', function(assert) {
  assert.expect(2);
  let subject = this.subject();

  subject.pollTask(() => {}, 'one');

  assert.throws(() => {
    subject.pollTask(() => {}, 'one');
  }, /The label provided to `pollTask` must be unique/);

  subject = this.subject({ force: true });

  subject.pollTask((next) => {
    assert.ok(true, 'pollTask was called');
    subject.runTask(next, 5);
  }, 'one');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask: does not leak when destroyed', function(assert) {
  assert.expect(3);
  let subject = this.subject();

  subject.pollTask((next) => {
    subject.runTask(next);
  }, 'one');

  run(subject, 'destroy');

  assert.throws(() => {
    pollTaskFor('one');
  }, /A pollTask with a label of 'one' was not found/);

  subject = this.subject({ force: true });

  subject.pollTask((next) => {
    assert.ok(true, 'pollTask was called');
    subject.runTask(next, 5);
  }, 'one');

  // ensure that pending pollTask's are not running
  return wait()
    .then(() => {
      pollTaskFor('one');
    });
});

test('pollTask: can be manually cleared', function(assert) {
  assert.expect(3);
  let subject = this.subject();

  subject.pollTask((next) => {
    subject.runTask(next);
  }, 'one');

  subject.cancelPoll('one');

  assert.throws(() => {
    pollTaskFor('one');
  }, /A pollTask with a label of 'one' was not found/);

  subject = this.subject({ force: true });

  subject.pollTask((next) => {
    assert.ok(true, 'pollTask was called');
    subject.runTask(next, 5);
  }, 'one');

  // ensure that pending pollTask's are not running
  return wait()
    .then(() => {
      pollTaskFor('one');
    });
});
