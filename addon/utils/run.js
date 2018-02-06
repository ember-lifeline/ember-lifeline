import Ember from 'ember';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import { registerDisposable } from '../utils/disposable';

const { WeakMap } = Ember;

/**
 * A map of instances/timers that allows us to
 * store cancelIds for scheduled timers per instance.
 *
 * @private
 *
 */
const registeredTimers = new WeakMap();

/**
   Registers and runs the provided task function for the provided object at the specified
   timeout (defaulting to 0). The timer is properly canceled if the object is destroyed
   before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import { runTask, runDisposables } from 'ember-lifeline';

   export default Component.extend({
     [DESTROY_PATCHED]: true,

     didInsertElement() {
       runTask(this, () => {
         console.log('This runs after 5 seconds if this component is still displayed');
       }, 5000)
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @function runTask
   @param { Object } obj the instance to register the task for
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @param { Number } [timeout=0] the time in the future to run the task
   @public
   */
export function runTask(obj, taskOrName, timeout = 0) {
  assert(`Called \`runTask\` on destroyed object: ${obj}.`, !obj.isDestroyed);

  let timers = registeredTimers.get(obj);

  if (!timers) {
    registeredTimers.set(obj, (timers = []));

    registerDisposable(obj, getTimersDisposable(timers));
  }

  let cancelId = run.later(() => {
    let cancelIndex = timers.indexOf(cancelId);
    timers.splice(cancelIndex, 1);

    let task = getTask(obj, taskOrName, 'runTask');

    task.call(obj);
  }, timeout);

  timers.push(cancelId);
  return cancelId;
}

export function getTask(instance, taskOrName, taskName) {
  let type = typeof taskOrName;
  let task;

  if (type === 'function') {
    task = taskOrName;
  } else if (type === 'string' && instance[taskOrName]) {
    task = instance[taskOrName];
  } else {
    throw new TypeError(
      `You must pass a task function or method name to '${taskName}'.`
    );
  }

  return task;
}

function getTimersDisposable(timers) {
  return function() {
    for (let i = 0; i < timers.length; i++) {
      run.cancel(timers[i]);
    }
  };
}
