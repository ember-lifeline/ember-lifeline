import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import wait from 'ember-test-helpers/wait';
import {
  pollTask,
  cancelPoll,
  pollTaskFor,
  setShouldPoll,
} from 'ember-lifeline/poll-task';
import { runTask } from 'ember-lifeline/run-task';

module('ember-lifeline/poll-task', {
  beforeEach() {
    this.BaseObject = EmberObject.extend();
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

    return (this._subject = this.BaseObject.create(...arguments));
  },
});

test('pollTask provides ability to poll with callback provided', function(assert) {
  assert.expect(2);
  setShouldPoll(() => true);
  let subject = this.subject();
  let calledTimes = 0;

  pollTask(subject, next => {
    calledTimes++;

    if (calledTimes === 5) {
      assert.ok(true, 'polled successfully');
    } else {
      runTask(subject, next, 5);
    }
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask provides ability to poll with method provided', function(assert) {
  assert.expect(3);
  setShouldPoll(() => true);
  let calledTimes = 0;
  let subject = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes === 5) {
        assert.equal(this, subject, 'context is correct');
        assert.ok(true, 'polled successfully');
      } else {
        runTask(subject, next, 5);
      }
    },
  });

  pollTask(subject, 'run');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask calls callback once in testing mode', function(assert) {
  assert.expect(2);
  let subject = this.subject();
  let calledTimes = 0;

  pollTask(subject, next => {
    calledTimes++;

    if (calledTimes > 1) {
      assert.ok(false, 'should not be called more than once');
    }

    runTask(subject, next, 5);
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // test string form
  subject.run = function(next) {
    calledTimes++;

    runTask(subject, next, 5);
  };

  pollTask(subject, 'run');
  assert.equal(calledTimes, 2, 'pollTask executed with method name properly');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask next tick can be incremented via test helper with callback', function(assert) {
  assert.expect(2);
  let subject = this.subject();
  let calledTimes = 0;

  let token = pollTask(subject, next => {
    calledTimes++;

    if (calledTimes > 2) {
      assert.ok(false, 'should not be called more than twice');
    }

    runTask(subject, next, 5);
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  return wait().then(function() {
    pollTaskFor(token);

    assert.equal(
      calledTimes,
      2,
      'poll task argument was invoked after ticking'
    );

    // ensure that pending pollTask's are not running
    return wait();
  });
});

test('pollTask next tick can be incremented via test helper with method name', function(assert) {
  assert.expect(2);
  let calledTimes = 0;
  let subject = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }

      runTask(subject, next, 5);
    },
  });

  let token = pollTask(subject, 'run');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  return wait().then(function() {
    pollTaskFor(token);

    assert.equal(
      calledTimes,
      2,
      'poll task argument was invoked after ticking'
    );

    // ensure that pending pollTask's are not running
    return wait();
  });
});

test('pollTask cannot advance a poll that has not been scheduled', function(assert) {
  assert.expect(3);

  let subject = this.subject();
  let calledTimes = 0;

  let token = pollTask(subject, () => {
    calledTimes++;

    if (calledTimes > 2) {
      assert.ok(false, 'should not be called more than twice');
    }
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  assert.throws(function() {
    pollTaskFor(token);
  }, `You cannot advance pollTask '${token}' when \`next\` has not been called.`);

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask can be manually cleared', function(assert) {
  assert.expect(3);
  let subject = this.subject();

  let token = pollTask(subject, next => {
    runTask(subject, next);
  });

  cancelPoll(token);

  assert.throws(() => {
    pollTaskFor(token);
  }, `A pollTask with a label of '${token}' was not found`);

  subject = this.subject({ force: true });

  token = pollTask(subject, next => {
    assert.ok(true, 'pollTask was called');
    runTask(subject, next, 5);
  });

  // ensure that pending pollTask's are not running
  return wait().then(() => {
    pollTaskFor(token);
  });
});
