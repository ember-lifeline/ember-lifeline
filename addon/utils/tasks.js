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
 * A map of instances/debounce functions that allows us to
 * store pending debounces per instance.
 *
 * @private
 *
 */
const registeredDebounces = new WeakMap();

/**
   Registers and runs the provided task function for the provided object at the specified
   timeout (defaulting to 0). The timer is properly canceled if the object is destroyed
   before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import { runTask, runDisposables } from 'ember-lifeline';

   export default Component.extend({
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

  let timers = getOrAllocate(registeredTimers, obj, Array, getTimersDisposable);

  let cancelId = run.later(() => {
    let cancelIndex = timers.indexOf(cancelId);
    timers.splice(cancelIndex, 1);

    let task = getTask(obj, taskOrName, 'runTask');

    task.call(obj);
  }, timeout);

  timers.push(cancelId);
  return cancelId;
}

/**
   Adds the provided function to the named queue for the provided object. The timer is
   properly canceled if the object is destroyed before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import { scheduleTask, runDisposables } from 'ember-lifeline';

   export default Component.extend({
     init() {
       this._super(...arguments);
       scheduleTask(this, 'actions', () => {
         console.log('This runs at the end of the run loop (via the actions queue) if this component is still displayed');
       })
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @function scheduleTask
   @param { Object } obj the instance to register the task for
   @param { String } queueName the queue to schedule the task into
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @param { ...* } args arguments to pass to the task
   @public
   */
export function scheduleTask(obj, queueName, taskOrName, ...args) {
  assert(
    `Called \`scheduleTask\` without a string as the first argument on ${obj}.`,
    typeof queueName === 'string'
  );
  assert(
    `Called \`scheduleTask\` while trying to schedule to the \`afterRender\` queue on ${obj}.`,
    queueName !== 'afterRender'
  );
  assert(
    `Called \`scheduleTask\` on destroyed object: ${obj}.`,
    !obj.isDestroyed
  );

  let task = getTask(obj, taskOrName, 'scheduleTask');
  let cancelId = run.schedule(queueName, obj, task, ...args);
  let timers = getOrAllocate(registeredTimers, obj, Array, getTimersDisposable);

  timers.push(cancelId);

  return cancelId;
}

/**
   Runs the function with the provided name immediately, and only once in the time window
   specified by the timeout argument.

   Example:

   ```js
   import Component from 'ember-component';
   import { throttleTask, runDisposables } from 'ember-lifeline';

   export default Component.extend({
     logMe() {
       console.log('This will run once immediately, then only once every 300ms.');
     },

     click() {
       throttleTask(this, 'logMe', 300);
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @method throttleTask
   @param { Object } obj the instance to register the task for
   @param { String } name the name of the task to throttle
   @param { Number } [timeout] the time in the future to run the task
   @public
   */
export function throttleTask(obj, name, timeout = 0) {
  assert(
    `Called \`throttleTask\` without a string as the first argument on ${obj}.`,
    typeof name === 'string'
  );
  assert(
    `Called \`throttleTask('${name}', ${timeout})\` where '${name}' is not a function.`,
    typeof obj[name] === 'function'
  );
  assert(
    `Called \`throttleTask\` on destroyed object: ${obj}.`,
    !obj.isDestroyed
  );

  let timers = getOrAllocate(registeredTimers, obj, Array, getTimersDisposable);
  let cancelId = run.throttle(obj, name, timeout);

  timers.push(cancelId);

  return cancelId;
}

/**
   Runs the function with the provided name after the timeout has expired on the last
   invocation. The timer is properly canceled if the object is destroyed before it is
   invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import { debounceTask, runDisposables } from 'ember-lifeline';

   export default Component.extend({
     logMe() {
       console.log('This will only run once every 300ms.');
     },

     click() {
       debounceTask(this, 'logMe', 300);
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @method debounceTask
   @param { Object } obj the instance to register the task for
   @param { String } name the name of the task to debounce
   @param { ...* } debounceArgs arguments to pass to the debounced method
   @param { Number } wait the amount of time to wait before calling the method (in milliseconds)
   @public
   */
export function debounceTask(obj, name, ...debounceArgs) {
  assert(
    `Called \`debounceTask\` without a string as the first argument on ${obj}.`,
    typeof name === 'string'
  );
  assert(
    `Called \`obj.debounceTask('${name}', ...)\` where 'obj.${name}' is not a function.`,
    typeof obj[name] === 'function'
  );
  assert(
    `Called \`debounceTask\` on destroyed object: ${obj}.`,
    !obj.isDestroyed
  );

  let pendingDebounces = getOrAllocate(
    registeredDebounces,
    obj,
    Object,
    getDebouncesDisposable
  );
  let debounce = pendingDebounces[name];
  let debouncedTask;

  if (!debounce) {
    debouncedTask = (...args) => {
      delete pendingDebounces[name];
      obj[name](...args);
    };
  } else {
    debouncedTask = debounce.debouncedTask;
  }

  // cancelId is new, even if the debounced function was already present
  let cancelId = run.debounce(obj, debouncedTask, ...debounceArgs);

  pendingDebounces[name] = { debouncedTask, cancelId };
}

/**
   Cancel a previously scheduled task.

   Example:

   ```js
   import Component from 'ember-component';
   import { runTask, cancelTask } from 'ember-lifeline';

   export default Component.extend({
     didInsertElement() {
       this._cancelId = runTask(this, () => {
         console.log('This runs after 5 seconds if this component is still displayed');
       }, 5000)
     },

     disable() {
        cancelTask(this._cancelId);
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @method cancelTask
   @param { Number } cancelId the id returned from the runTask or scheduleTask call
   @public
   */
export function cancelTask(cancelId) {
  run.cancel(cancelId);
}

/**
   Cancel a previously debounced task.

   Example:

   ```js
   import Component from 'ember-component';
   import { debounceTask, cancelDebounce } from 'ember-lifeline';

   export default Component.extend(ContextBoundTasksMixin, {
     logMe() {
       console.log('This will only run once every 300ms.');
     },

     click() {
       debounceTask(this, 'logMe', 300);
     },

     disable() {
        cancelDebounce(this, 'logMe');
     },

     destroy() {
       runDisposables(this);
     }
   });
   ```

   @method cancelDebounce
   @param { Object } obj the instance to register the task for
   @param { String } methodName the name of the debounced method to cancel
   @public
   */
export function cancelDebounce(obj, name) {
  let pendingDebounces = registeredDebounces.get(obj);

  if (pendingDebounces === undefined) {
    return;
  }

  let { cancelId } = pendingDebounces[name];

  run.cancel(cancelId);
}

export function getTask(obj, taskOrName, taskName) {
  let type = typeof taskOrName;
  let task;

  if (type === 'function') {
    task = taskOrName;
  } else if (type === 'string' && obj[taskOrName]) {
    task = obj[taskOrName];
  } else {
    throw new TypeError(
      `You must pass a task function or method name to '${taskName}'.`
    );
  }

  return task;
}

function getOrAllocate(weakMap, obj, Type, getDisposable) {
  let value = weakMap.get(obj);

  if (!value) {
    weakMap.set(obj, (value = new Type()));

    registerDisposable(obj, getDisposable(value));
  }

  return value;
}

function getTimersDisposable(timers) {
  return function() {
    for (let i = 0; i < timers.length; i++) {
      cancelTask(timers[i]);
    }
  };
}

function getDebouncesDisposable(debounces) {
  return function() {
    let debounceNames = debounces && Object.keys(debounces);

    if (!debounceNames || !debounceNames.length) {
      return;
    }

    for (let i = 0; i < debounceNames.length; i++) {
      let { cancelId } = debounces[debounceNames[i]];

      cancelTask(cancelId);
    }
  };
}
