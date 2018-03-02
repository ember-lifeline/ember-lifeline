import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';

import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';
import { setShouldPoll, pollTaskFor } from 'ember-lifeline';

import { settled } from '@ember/test-helpers';

module('ember-lifeline/mixins/run', function(hooks) {
  hooks.beforeEach(function() {
    this.BaseObject = EmberObject.extend(ContextBoundTasksMixin);

    this.getComponent = function({ force } = {}) {
      if (force && this._component) {
        run(this._component, 'destroy');
        this._component = null;
      }

      if (this._component) {
        return this._component;
      }

      return (this._component = this.BaseObject.create(...arguments));
    };
  });

  hooks.afterEach(function() {
    run(this.getComponent(), 'destroy');
    setShouldPoll(null);
  });

  test('invokes async tasks', function(assert) {
    assert.expect(2);

    let component = this.getComponent();
    let done = assert.async();
    let hasRun = false;

    component.runTask(() => {
      hasRun = true;
      assert.ok(true, 'callback was called');
      done();
    }, 0);

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('invokes named functions as async tasks', function(assert) {
    assert.expect(3);
    let done = assert.async();
    let component = this.getComponent({
      run() {
        hasRun = true;
        assert.equal(this, component, 'context is correct');
        assert.ok(true, 'callback was called');
        done();
      },
    });
    let hasRun = false;

    component.runTask('run', 0);

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('invokes async tasks with delay', function(assert) {
    assert.expect(3);
    let component = this.getComponent();
    let done = assert.async();
    let hasRun = false;

    component.runTask(() => {
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
    let component = this.getComponent();
    let done = assert.async();
    let hasRun = false;

    component.runTask(() => {
      hasRun = true;
      assert.ok(false, 'callback was called');
    }, 0);

    assert.notOk(hasRun, 'callback should not have run yet');
    run(component, 'destroy');

    window.setTimeout(() => {
      assert.notOk(hasRun, 'callback should not have run yet');
      done();
    }, 10);
  });

  test('runTask tasks can be canceled', function(assert) {
    assert.expect(1);
    let component = this.getComponent();
    let done = assert.async();
    let hasRun = false;

    let cancelId = component.runTask(() => {
      hasRun = true;
    }, 5);

    component.cancelTask(cancelId);

    window.setTimeout(() => {
      assert.notOk(hasRun, 'callback should have been canceled previously');
      done();
    }, 10);
  });

  test('scheduleTask invokes async tasks', function(assert) {
    assert.expect(3);

    let component = this.getComponent();
    let hasRun = false;

    run(() => {
      component.scheduleTask('actions', () => {
        hasRun = true;
        assert.ok(true, 'callback was called');
      });

      assert.notOk(hasRun, 'callback should not have run yet');
    });

    assert.ok(hasRun, 'callback was called');
  });

  test('scheduleTask invokes named functions as async tasks', function(assert) {
    assert.expect(5);

    let component = this.getComponent({
      run(name) {
        hasRun = true;
        assert.equal(this, component, 'context is correct');
        assert.equal(name, 'foo', 'passed arguments are correct');
        assert.ok(true, 'callback was called');
      },
    });
    let hasRun = false;

    run(() => {
      component.scheduleTask('actions', 'run', 'foo');
      assert.notOk(hasRun, 'callback should not have run yet');
    });

    assert.ok(hasRun, 'callback was called');
  });

  test('cancels tasks added with `scheduleTask`', function(assert) {
    assert.expect(2);
    let component = this.getComponent();
    let hasRun = false;

    run(() => {
      component.scheduleTask('actions', () => {
        hasRun = true;
        assert.ok(false, 'callback was called');
      });

      assert.notOk(hasRun, 'callback should not have run yet');
      run(component, 'destroy');
    });

    assert.notOk(hasRun, 'callback should not have run yet');
  });

  test('scheduleTask tasks can be canceled', function(assert) {
    assert.expect(1);
    let component = this.getComponent();
    let hasRun = false;

    run(() => {
      let timer = component.scheduleTask('actions', () => {
        hasRun = true;
      });

      component.cancelTask(timer);
    });

    assert.notOk(hasRun, 'callback should have been canceled previously');
  });

  test('throttleTask can be canceled', function(assert) {
    assert.expect(3);

    let done = assert.async();
    let runCount = 0;
    let component = this.getComponent({
      doStuff() {
        runCount++;
        assert.equal(this, component, 'context is correct');
      },
    });

    let cancelId = component.throttleTask('doStuff', 5, false);
    component.cancelThrottle(cancelId);
    component.throttleTask('doStuff', 5, false);

    window.setTimeout(() => {
      assert.equal(
        runCount,
        2,
        'callback should have been canceled previously'
      );
      done();
    }, 10);
  });

  test('No error should be thrown by QUnit (throttles should be cleaned up)', function(assert) {
    assert.expect(0);

    let component = this.getComponent({
      doStuff() {},
    });

    component.throttleTask('doStuff', 5);
  });

  test('debounceTask runs tasks', function(assert) {
    assert.expect(4);

    let done = assert.async();
    let runCount = 0;
    let runArg;
    let component = this.getComponent({
      doStuff(arg) {
        runCount++;
        assert.equal(this, component, 'context is correct');
        runArg = arg;
      },
    });

    component.debounceTask('doStuff', 'arg1', 5);
    component.debounceTask('doStuff', 'arg2', 5);
    component.debounceTask('doStuff', 'arg3', 5);

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
    let component = this.getComponent({
      doStuff() {
        runCount++;
      },
    });

    component.debounceTask('doStuff', 5);
    component.debounceTask('doStuff', 5);
    run(component, 'destroy');

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
    let component = this.getComponent({
      doStuff() {
        runCount++;
      },
    });

    component.debounceTask('doStuff', 5);
    component.debounceTask('doStuff', 5);
    component.cancelDebounce('doStuff');

    assert.equal(runCount, 0, 'should not have run');

    window.setTimeout(() => {
      assert.equal(runCount, 0, 'should not have run');
      done();
    }, 10);
  });

  test('debounceTask triggers an assertion when a string is not the first argument', function(assert) {
    let component = this.getComponent({
      doStuff() {},
    });

    assert.throws(() => {
      component.debounceTask(component.doStuff, 5);
    }, /without a string as the first argument/);
  });

  test('debounceTask triggers an assertion the function name provided does not exist on the object', function(assert) {
    let component = this.getComponent();

    assert.throws(() => {
      component.debounceTask('doStuff', 5);
    }, /is not a function/);
  });

  test('pollTask provides ability to poll with callback provided', function(assert) {
    assert.expect(2);
    setShouldPoll(() => true);
    let component = this.getComponent();
    let calledTimes = 0;

    component.pollTask(next => {
      calledTimes++;

      if (calledTimes === 5) {
        assert.ok(true, 'polled successfully');
      } else {
        component.runTask(next, 5);
      }
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask provides ability to poll with method provided', function(assert) {
    assert.expect(3);
    setShouldPoll(() => true);
    let calledTimes = 0;
    let component = this.getComponent({
      run(next) {
        calledTimes++;

        if (calledTimes === 5) {
          assert.equal(this, component, 'context is correct');
          assert.ok(true, 'polled successfully');
        } else {
          component.runTask(next, 5);
        }
      },
    });

    component.pollTask('run');

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask calls callback once in testing mode', function(assert) {
    assert.expect(2);
    let component = this.getComponent();
    let calledTimes = 0;

    component.pollTask(next => {
      calledTimes++;

      if (calledTimes > 1) {
        assert.ok(false, 'should not be called more than once');
      }

      component.runTask(next, 5);
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    // test string form
    component.run = function(next) {
      calledTimes++;

      component.runTask(next, 5);
    };

    component.pollTask('run');
    assert.equal(calledTimes, 2, 'pollTask executed with method name properly');

    // ensure that pending pollTask's are not running
    return settled();
  });

  test('pollTask next tick can be incremented via test helper with callback', function(assert) {
    assert.expect(2);
    let component = this.getComponent();
    let calledTimes = 0;

    let token = component.pollTask(next => {
      calledTimes++;

      if (calledTimes > 2) {
        assert.ok(false, 'should not be called more than twice');
      }

      component.runTask(next, 5);
    });

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    return settled().then(function() {
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

  test('pollTask next tick can be incremented via test helper with method name', function(assert) {
    assert.expect(2);
    let calledTimes = 0;
    let component = this.getComponent({
      run(next) {
        calledTimes++;

        if (calledTimes > 2) {
          assert.ok(false, 'should not be called more than twice');
        }

        component.runTask(next, 5);
      },
    });

    let token = component.pollTask('run');

    assert.equal(calledTimes, 1, 'poll task argument was invoked initially');

    return settled().then(function() {
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

  test('pollTask cannot advance a poll that has not been scheduled', function(assert) {
    assert.expect(3);

    let component = this.getComponent();
    let calledTimes = 0;

    let token = component.pollTask(() => {
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
    return settled();
  });

  test('pollTask does not leak when destroyed', function(assert) {
    assert.expect(3);
    let component = this.getComponent();

    let token = component.pollTask(next => {
      component.runTask(next);
    });

    run(component, 'destroy');

    assert.throws(() => {
      pollTaskFor(token);
    }, `A pollTask with a token of ${token} was not found`);

    component = this.getComponent({ force: true });

    token = component.pollTask(next => {
      assert.ok(true, 'pollTask was called');
      component.runTask(next, 5);
    });

    // ensure that pending pollTask's are not running
    return settled().then(() => {
      pollTaskFor(token);
    });
  });

  test('pollTask can be manually cleared', function(assert) {
    assert.expect(3);
    let component = this.getComponent();

    let token = component.pollTask(next => {
      component.runTask(next);
    });

    component.cancelPoll(token);

    assert.throws(() => {
      pollTaskFor(token);
    }, new RegExp(`You cannot advance pollTask '${token}' when \`next\` has not been called.`));

    component = this.getComponent({ force: true });

    token = component.pollTask(next => {
      assert.ok(true, 'pollTask was called');
      component.runTask(next, 5);
    });

    // ensure that pending pollTask's are not running
    return settled().then(() => {
      pollTaskFor(token);
    });
  });
});
