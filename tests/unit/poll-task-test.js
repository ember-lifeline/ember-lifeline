import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import wait from 'ember-test-helpers/wait';
import {
  runTask,
  pollTask,
  cancelPoll,
  pollTaskFor,
  setShouldPoll,
  runDisposables,
} from 'ember-lifeline';

module('ember-lifeline/poll-task', {
  beforeEach() {
    this.BaseObject = EmberObject.extend();
  },

  afterEach() {
    runDisposables(this.obj);
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
  this.obj = this.subject();
  let calledTimes = 0;

  pollTask(this.obj, next => {
    calledTimes++;

    if (calledTimes === 5) {
      assert.ok(true, 'polled successfully');
    } else {
      runTask(this.obj, next, 5);
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
  let obj = (this.obj = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes === 5) {
        assert.equal(this, obj, 'context is correct');
        assert.ok(true, 'polled successfully');
      } else {
        runTask(obj, next, 5);
      }
    },
  }));

  pollTask(this.obj, 'run');

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask calls callback once in testing mode', function(assert) {
  assert.expect(2);
  let obj = (this.obj = this.subject());
  let calledTimes = 0;

  pollTask(this.obj, next => {
    calledTimes++;

    if (calledTimes > 1) {
      assert.ok(false, 'should not be called more than once');
    }

    runTask(obj, next, 5);
  });

  assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

  // test string form
  this.obj.run = function(next) {
    calledTimes++;

    runTask(obj, next, 5);
  };

  pollTask(this.obj, 'run');
  assert.equal(calledTimes, 2, 'pollTask executed with method name properly');

  // ensure that pending pollTask's are not running
  return wait();
});

test('pollTask next tick can be incremented via test helper with callback', function(assert) {
  assert.expect(2);
  this.obj = this.subject();
  let calledTimes = 0;

  let token = pollTask(this.obj, next => {
    calledTimes++;

    if (calledTimes > 2) {
      assert.ok(false, 'should not be called more than twice');
    }

    runTask(this.obj, next, 5);
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
  let obj = (this.obj = this.subject({
    run(next) {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }

      runTask(obj, next, 5);
    },
  }));

  let token = pollTask(this.obj, 'run');

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

  this.obj = this.subject();
  let calledTimes = 0;

  let token = pollTask(this.obj, () => {
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
  this.obj = this.subject();

  let token = pollTask(this.obj, next => {
    runTask(this.obj, next);
  });

  cancelPoll(token);

  assert.throws(() => {
    pollTaskFor(token);
  }, new RegExp(`You cannot advance pollTask '${token}' when \`next\` has not been called.`));

  this.obj = this.subject({ force: true });

  token = pollTask(this.obj, next => {
    assert.ok(true, 'pollTask was called');
    runTask(this.obj, next, 5);
  });

  // ensure that pending pollTask's are not running
  return wait().then(() => {
    pollTaskFor(token);
  });
});
