import { run } from '@ember/runloop';
import {
  cancelTask,
  runTask,
  scheduleTask,
  throttleTask,
  _setRegisteredTimers,
} from 'ember-lifeline';
import { module, test } from 'qunit';
import { destroy } from '@ember/destroyable';

module('ember-lifeline/run-task', function (hooks) {
  hooks.afterEach(function () {
    run(destroy, this.obj);
  });

  test('invokes async tasks', function (assert) {
    assert.expect(2);

    this.obj = {};
    let done = assert.async();
    let hasRun = false;

    runTask(
      this.obj,
      () => {
        hasRun = true;
        assert.ok(true, 'callback was called');
        done();
      },
      0
    );

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('invokes named functions as async tasks', function (assert) {
    assert.expect(3);

    let done = assert.async();
    let obj = (this.obj = {
      run() {
        hasRun = true;
        assert.equal(this, obj, 'context is correct');
        assert.ok(true, 'callback was called');
        done();
      },
    });
    let hasRun = false;

    runTask(this.obj, 'run', 0);

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('invokes async tasks with delay', function (assert) {
    assert.expect(3);

    this.obj = {};
    let done = assert.async();
    let hasRun = false;

    runTask(
      this.obj,
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

  test('runTask returns early on destroyed object', function (assert) {
    assert.expect(2);

    this.obj = {};
    let done = assert.async();
    let hasRun = false;

    run(destroy, this.obj);

    let cancelId = runTask(
      this.obj,
      () => {
        hasRun = true;
      },
      5
    );

    assert.equal(cancelId, -1, 'Cancel ID is 1-');

    window.setTimeout(() => {
      assert.notOk(hasRun, 'callback should not have run');
      done();
    }, 10);
  });

  test('runTask tasks can be canceled', function (assert) {
    assert.expect(1);

    this.obj = {};
    let done = assert.async();
    let hasRun = false;

    let cancelId = runTask(
      this.obj,
      () => {
        hasRun = true;
      },
      5
    );

    cancelTask(this.obj, cancelId);

    window.setTimeout(() => {
      assert.notOk(hasRun, 'callback should have been canceled previously');
      done();
    }, 10);
  });

  test('runTask tasks removed their cancelIds when run', function (assert) {
    assert.expect(1);

    let map = new Map();
    _setRegisteredTimers(map);
    this.obj = {};
    let done = assert.async();

    runTask(
      this.obj,
      () => {
        assert.equal(
          map.get(this.obj).size,
          0,
          'Set deleted the cancelId after task executed'
        );
        _setRegisteredTimers(new WeakMap());
        done();
      },
      0
    );
  });

  test('scheduleTask invokes async tasks', function (assert) {
    assert.expect(3);

    this.obj = {};
    let hasRun = false;

    run(() => {
      scheduleTask(this.obj, 'actions', () => {
        hasRun = true;
        assert.ok(true, 'callback was called');
      });

      assert.notOk(hasRun, 'callback should not have run yet');
    });

    assert.ok(hasRun, 'callback was called');
  });

  test('scheduleTask invokes named functions as async tasks', function (assert) {
    assert.expect(5);

    let obj = (this.obj = {
      run(name) {
        hasRun = true;
        assert.equal(this, obj, 'context is correct');
        assert.equal(name, 'foo', 'passed arguments are correct');
        assert.ok(true, 'callback was called');
      },
    });
    let hasRun = false;

    run(() => {
      scheduleTask(this.obj, 'actions', 'run', 'foo');
      assert.notOk(hasRun, 'callback should not have run yet');
    });

    assert.ok(hasRun, 'callback was called');
  });

  test('scheduleTask returns early on destroyed object', function (assert) {
    assert.expect(2);

    let cancelId;
    let hasRun = false;
    this.obj = {};

    run(destroy, this.obj);

    run(() => {
      cancelId = scheduleTask(this.obj, 'actions', () => {
        hasRun = true;
      });
    });

    assert.equal(cancelId, -1, 'Cancel ID is 1-');
    assert.notOk(hasRun, 'callback should not have run');
  });

  test('scheduleTask tasks can be canceled', function (assert) {
    assert.expect(1);
    this.obj = {};
    let hasRun = false;

    run(() => {
      let timer = scheduleTask(this.obj, 'actions', () => {
        hasRun = true;
      });

      cancelTask(this.obj, timer);
    });

    assert.notOk(hasRun, 'callback should have been canceled previously');
  });

  test('scheduleTask tasks removed their cancelIds when run', function (assert) {
    assert.expect(1);

    let map = new Map();
    _setRegisteredTimers(map);
    this.obj = {};
    let done = assert.async();

    run(() => {
      scheduleTask(this.obj, 'actions', () => {
        assert.equal(
          map.get(this.obj).size,
          0,
          'Set deleted the cancelId after task executed'
        );
        _setRegisteredTimers(new WeakMap());
        done();
      });
    });
  });

  test('throttleTask actually throttles', function (assert) {
    let callCount = 0;
    let callArgs;
    this.obj = {
      doStuff(...args) {
        callCount++;
        callArgs = args;
      },
    };

    run(() => {
      throttleTask(this.obj, 'doStuff', 'a', 5);
      throttleTask(this.obj, 'doStuff', 'b', 5);
      throttleTask(this.obj, 'doStuff', 'c', 5);
    });

    assert.equal(callCount, 1, 'Throttle only ran the method once');
    assert.deepEqual(
      callArgs,
      ['a'],
      'Throttle was called with the arguments from the first call only'
    );
  });

  test('throttleTask triggers an assertion when a string is not the first argument', function (assert) {
    this.obj = { doStuff() {} };

    assert.throws(() => {
      throttleTask(this.obj, this.obj.doStuff, 5);
    }, /without a string as the first argument/);
  });

  test('throttleTask triggers an assertion the function name provided does not exist on the object', function (assert) {
    this.obj = {};

    assert.throws(() => {
      throttleTask(this.obj, 'doStuff', 5);
    }, /is not a function/);
  });

  test('throttleTask triggers an assertion when spacing argument is not a number or not passed', function (assert) {
    assert.expect(2);

    this.obj = { doStuff() {} };

    assert.throws(() => {
      throttleTask(this.obj, 'doStuff', 'bad');
    }, /with incorrect `spacing` argument. Expected Number and received `bad`/);

    assert.throws(() => {
      throttleTask(this.obj, 'doStuff', {});
    }, /with incorrect `spacing` argument. Expected Number and received `\[object Object\]`/);
  });

  test('throttleTask returns early on destroyed object', function (assert) {
    assert.expect(2);

    let callCount = 0;
    let cancelId;

    this.obj = this.obj = {
      doStuff() {
        callCount++;
      },
    };

    run(destroy, this.obj);

    run(() => {
      cancelId = throttleTask(this.obj, 'doStuff');
    });

    assert.equal(cancelId, -1, 'Cancel ID is -1');
    assert.equal(callCount, 0, 'throttled method was not called');
  });

  test('throttleTask passes arguments to method', function (assert) {
    let calledWithArgs;

    this.obj = {
      doStuff(...args) {
        calledWithArgs = args;
      },
    };

    run(() => {
      throttleTask(this.obj, 'doStuff', 'hello', 'world', 5);
    });

    assert.deepEqual(calledWithArgs, ['hello', 'world']);
  });
});
