import { module, test } from 'qunit';
import getTask from 'ember-lifeline/utils/get-task';

module('ember-lifeline/utils/get-task', function () {
  test('getTask returns passed in task function as task', function (assert) {
    assert.expect(1);

    let task = () => {};

    assert.equal(task, getTask(null, task, 'foo'), 'tasks are equal');
  });

  test('getTask returns passed in task from the instance', function (assert) {
    assert.expect(1);

    let instance = { fooTask: () => {} };

    assert.equal(
      instance.fooTask,
      getTask(instance, 'fooTask', 'foo'),
      'tasks are equal'
    );
  });

  test('getTask throws when task not found', function (assert) {
    assert.expect(1);

    assert.throws(() => {
      getTask({}, null, 'foo');
    }, /You must pass a task function or method name to 'foo'./);
  });
});
