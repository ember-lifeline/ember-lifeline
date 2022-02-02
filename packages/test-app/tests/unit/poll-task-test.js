/* eslint-disable qunit/no-conditional-assertions */
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  runTask,
  pollTask,
  cancelPoll,
  setShouldPoll,
  _setRegisteredPollers,
} from 'ember-lifeline';
import { pollTaskFor } from 'ember-lifeline/test-support';
import { settled } from '@ember/test-helpers';
import { destroy } from '@ember/destroyable';

module('ember-lifeline/poll-task', function (hooks) {
  hooks.afterEach(function () {
    run(destroy, this.obj);
    setShouldPoll(null);
  });

  test('pollTask provides ability to poll with callback provided', function (assert) {
    assert.expect(2);

    setShouldPoll(() => true);
    this.obj = {};
    let calledTimes = 0;

    pollTask(this.obj, (next) => {
      calledTimes++;

      if (calledTimes === 5) {
        assert.ok(true, 'polled successfully');
      } else {
        runTask(this.obj, next, 5);
      }
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask provides ability to poll with method provided', function (assert) {
    assert.expect(3);

    setShouldPoll(() => true);
    let calledTimes = 0;
    let obj = (this.obj = {
      run(next) {
        calledTimes++;

        if (calledTimes === 5) {
          assert.equal(this, obj, 'context is correct');
          assert.ok(true, 'polled successfully');
        } else {
          runTask(obj, next, 5);
        }
      },
    });

    pollTask(this.obj, 'run');

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask provides ability to poll with custom string token', function (assert) {
    assert.expect(3);

    setShouldPoll(() => true);
    this.obj = {};
    let calledTimes = 0;
    let token = 'custom:token';

    let returnedToken = pollTask(
      this.obj,
      (next) => {
        calledTimes++;

        if (calledTimes === 5) {
          assert.ok(true, 'polled successfully');
        } else {
          runTask(this.obj, next, 5);
        }
      },
      token
    );

    assert.equal(token, returnedToken, 'poll task string tokens match');
    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask calls callback once in testing mode', function (assert) {
    assert.expect(2);

    let obj = (this.obj = {});
    let calledTimes = 0;

    pollTask(this.obj, (next) => {
      calledTimes++;

      if (calledTimes > 1) {
        assert.ok(false, 'should not be called more than once');
      }

      runTask(obj, next, 5);
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // test string form
    this.obj.run = function (next) {
      calledTimes++;

      runTask(obj, next, 5);
    };

    pollTask(this.obj, 'run');
    assert.equal(calledTimes, 2, 'pollTask executed with method name properly');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask next tick can be incremented via test helper with callback', function (assert) {
    assert.expect(2);

    this.obj = {};
    let calledTimes = 0;

    let token = pollTask(this.obj, (next) => {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }

      runTask(this.obj, next, 5);
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    return settled().then(function () {
      pollTaskFor(token);

      assert.equal(
        calledTimes,
        2,
        'poll task argument was invoked after ticking'
      );

      // ensure that pending pollTask's are not running
      return settled();
    });
  });

  test('pollTask next tick can be incremented via test helper with method name', function (assert) {
    assert.expect(2);

    let calledTimes = 0;
    let obj = (this.obj = {
      run(next) {
        calledTimes++;

        if (calledTimes > 2) {
          assert.ok(false, 'should not be called more than twice');
        }

        runTask(obj, next, 5);
      },
    });

    let token = pollTask(this.obj, 'run');

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    return settled().then(function () {
      pollTaskFor(token);

      assert.equal(
        calledTimes,
        2,
        'poll task argument was invoked after ticking'
      );

      // ensure that pending pollTask's are not running
      return settled();
    });
  });

  test('pollTask cannot advance a poll that has not been scheduled', function (assert) {
    assert.expect(3);

    this.obj = {};
    let calledTimes = 0;

    let token = pollTask(this.obj, () => {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    assert.throws(function () {
      pollTaskFor(token);
    }, `You cannot advance pollTask '${token}' when \`next\` has not been called.`);

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask can be manually cleared', function (assert) {
    assert.expect(3);

    this.obj = {};

    let token = pollTask(this.obj, (next) => {
      runTask(this.obj, next);
    });

    cancelPoll(this.obj, token);

    assert.throws(() => {
      pollTaskFor(token);
    }, new RegExp(`You cannot advance pollTask '${token}' when \`next\` has not been called.`));

    run(destroy, this.obj);

    this.obj = {};

    token = pollTask(this.obj, (next) => {
      assert.ok(true, 'pollTask was called');
      runTask(this.obj, next, 5);
    });

    // ensure that pending pollTask's are not running
    return settled().then(() => {
      pollTaskFor(token);
    });
  });

  test('pollTask tasks removed their tokens when cancelled', function (assert) {
    assert.expect(1);

    let map = new Map();
    _setRegisteredPollers(map);
    this.obj = {};

    let token = pollTask(this.obj, (next) => {
      runTask(this.obj, next);
    });

    cancelPoll(this.obj, token);

    assert.equal(
      map.get(this.obj).size,
      0,
      'Set deleted the token after task cancelled'
    );

    _setRegisteredPollers(new WeakMap());
  });

  test('cancelPoll can be safely called without a previous call to pollTask', function (assert) {
    assert.expect(1);

    this.obj = {};

    cancelPoll(this.obj, 'foo');

    assert.ok(true, 'cancelPoll was called without first calling pollTask');
  });
});
