import { cancelDebounce, debounceTask } from 'ember-lifeline';
import { module, test } from 'qunit';
import { destroy } from '@ember/destroyable';

module('ember-lifeline/debounce-task', function (hooks) {
  hooks.afterEach(function () {
    destroy(this.obj);
  });

  test('debounceTask runs tasks', function (assert) {
    assert.expect(4);

    let done = assert.async();
    let runCount = 0;
    let runArg;
    let obj = (this.obj = {
      doStuff(arg) {
        runCount++;
        assert.equal(this, obj, 'context is correct');
        runArg = arg;
      },
    });

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

  test('debounceTask triggers an assertion when delay argument is not a number or not passed', function (assert) {
    this.obj = { doStuff() {} };

    assert.throws(() => {
      debounceTask(this.obj, 'doStuff', 'bad');
    }, /with incorrect `spacing` argument. Expected Number and received `bad`/);

    assert.throws(() => {
      debounceTask(this.obj, 'doStuff', {});
    }, /with incorrect `spacing` argument. Expected Number and received `\[object Object\]`/);
  });

  test('debounceTask passes arguments to method', function (assert) {
    assert.expect(2);

    let callCount = 0;
    let calledWithArgs;
    const done = assert.async();

    this.obj = {
      doStuff(...args) {
        callCount++;
        calledWithArgs = args;
      },
    };

    debounceTask(this.obj, 'doStuff', 'hello', 'world', 5);

    setTimeout(() => {
      assert.equal(callCount, 1, 'should have run only once');
      assert.deepEqual(calledWithArgs, ['hello', 'world']);
      done();
    }, 10);
  });

  test('debounceTask can be canceled', function (assert) {
    let done = assert.async();
    assert.expect(2);

    let runCount = 0;
    this.obj = {
      doStuff() {
        runCount++;
      },
    };

    debounceTask(this.obj, 'doStuff', 5);
    debounceTask(this.obj, 'doStuff', 5);
    cancelDebounce(this.obj, 'doStuff');

    assert.equal(runCount, 0, 'should not have run');

    window.setTimeout(() => {
      assert.equal(runCount, 0, 'should not have run');
      done();
    }, 10);
  });

  test('cancelDebounce does not throw an error if the debounced task was never run', function (assert) {
    assert.expect(1);

    this.obj = {
      doStuff() {},
    };

    cancelDebounce(this.obj, 'doStuff');

    assert.ok(true, 'should not have thrown an error');
  });

  test('cancelDebounce does not throw an error if the debounced task is no longer pending', function (assert) {
    let done = assert.async();
    assert.expect(1);

    this.obj = {
      doStuff() {},
    };

    debounceTask(this.obj, 'doStuff', 5);

    window.setTimeout(() => {
      cancelDebounce(this.obj, 'doStuff');
      assert.ok(true, 'should not have thrown an error');
      done();
    }, 10);
  });
});
