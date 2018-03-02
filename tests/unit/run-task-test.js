import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import {
  runTask,
  scheduleTask,
  throttleTask,
  cancelTask,
  runDisposables,
} from 'ember-lifeline';

module('ember-lifeline/run-task', function(hooks) {
  hooks.beforeEach(function() {
    this.BaseObject = EmberObject.extend();

    this.getComponent = function() {
      if (this._component) {
        return this._component;
      }

      return (this._component = this.BaseObject.create(...arguments));
    };
  });

  hooks.afterEach(function() {
    runDisposables(this.obj);
  });

  test('invokes async tasks', function(assert) {
    assert.expect(2);

    this.obj = this.getComponent();
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

  test('invokes named functions as async tasks', function(assert) {
    assert.expect(3);
    let done = assert.async();
    let obj = (this.obj = this.getComponent({
      run() {
        hasRun = true;
        assert.equal(this, obj, 'context is correct');
        assert.ok(true, 'callback was called');
        done();
      },
    }));
    let hasRun = false;

    runTask(this.obj, 'run', 0);

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('invokes async tasks with delay', function(assert) {
    assert.expect(3);
    this.obj = this.getComponent();
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

  test('runTask tasks can be canceled', function(assert) {
    assert.expect(1);
    this.obj = this.getComponent();
    let done = assert.async();
    let hasRun = false;

    let cancelId = runTask(
      this.obj,
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

    this.obj = this.getComponent();
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

  test('scheduleTask invokes named functions as async tasks', function(assert) {
    assert.expect(5);

    let obj = (this.obj = this.getComponent({
      run(name) {
        hasRun = true;
        assert.equal(this, obj, 'context is correct');
        assert.equal(name, 'foo', 'passed arguments are correct');
        assert.ok(true, 'callback was called');
      },
    }));
    let hasRun = false;

    run(() => {
      scheduleTask(this.obj, 'actions', 'run', 'foo');
      assert.notOk(hasRun, 'callback should not have run yet');
    });

    assert.ok(hasRun, 'callback was called');
  });

  test('scheduleTask tasks can be canceled', function(assert) {
    assert.expect(1);
    this.obj = this.getComponent();
    let hasRun = false;

    run(() => {
      let timer = scheduleTask(this.obj, 'actions', () => {
        hasRun = true;
      });

      cancelTask(timer);
    });

    assert.notOk(hasRun, 'callback should have been canceled previously');
  });

  test('throttleTask triggers an assertion when a string is not the first argument', function(assert) {
    this.obj = this.getComponent({
      doStuff() {},
    });

    assert.throws(() => {
      throttleTask(this.obj, this.obj.doStuff, 5);
    }, /without a string as the first argument/);
  });

  test('throttleTask triggers an assertion the function name provided does not exist on the object', function(assert) {
    this.obj = this.getComponent();

    assert.throws(() => {
      throttleTask(this.obj, 'doStuff', 5);
    }, /is not a function/);
  });
});
