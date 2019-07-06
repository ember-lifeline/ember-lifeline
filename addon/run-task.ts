import { deprecate } from '@ember/application/deprecations';
import { assert } from '@ember/debug';
import { cancel, later, schedule, throttle } from '@ember/runloop';
import {
  IDestroyable,
  IMap,
  TaskOrName,
  Timer,
  EmberRunTimer,
  EmberRunQueues,
} from './types';
import { registerDisposable } from './utils/disposable';
import getTask from './utils/get-task';

const NULL_TIMER_ID = -1;

/**
 * A map of instances/timers that allows us to
 * store cancelIds for scheduled timers per instance.
 *
 * @private
 */
let registeredTimers: IMap<IDestroyable, Set<EmberRunTimer>> = new WeakMap<
  Object,
  any
>();

/**
 * Test use only. Allows for swapping out the WeakMap to a Map, giving
 * us the ability to detect whether the timers set is empty.
 *
 * @private
 * @param {*} mapForTesting A map used to ensure correctness when testing.
 */
export function _setRegisteredTimers(
  mapForTesting: IMap<IDestroyable, Set<EmberRunTimer>>
) {
  registeredTimers = mapForTesting;
}

/**
 * Registers and runs the provided task function for the provided object at the specified
 * timeout (defaulting to 0). The timer is properly canceled if the object is destroyed
 * before it is invoked.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { runTask, runDisposables } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   didInsertElement() {
 *     runTask(this, () => {
 *       console.log('This runs after 5 seconds if this component is still displayed');
 *     }, 5000)
 *   },
 *
 *   willDestroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function runTask
 * @param { IDestroyable } destroyable the instance to register the task for
 * @param { Function | String } taskOrName a function representing the task, or string
 *                                         specifying a property representing the task,
 *                                         which is run at the provided time specified
 *                                         by timeout
 * @param { Number } [timeout=0] the time in the future to run the task
 * @public
 */
export function runTask(
  destroyable: IDestroyable,
  taskOrName: TaskOrName,
  timeout: number = 0
): Timer {
  if (destroyable.isDestroying) {
    return NULL_TIMER_ID;
  }

  let task: Function = getTask(destroyable, taskOrName, 'runTask');
  let timers: Set<EmberRunTimer> = getTimers(destroyable);
  let cancelId: EmberRunTimer = later(() => {
    timers.delete(cancelId);
    task.call(destroyable);
  }, timeout);

  timers.add(cancelId);
  return cancelId;
}

/**
 * Adds the provided function to the named queue for the provided object. The timer is
 * properly canceled if the object is destroyed before it is invoked.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { scheduleTask, runDisposables } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   init() {
 *     this._super(...arguments);
 *
 *     scheduleTask(this, 'actions', () => {
 *       console.log('This runs at the end of the run loop (via the actions queue) if this component is still displayed');
 *     })
 *   },
 *
 *   willDestroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function scheduleTask
 * @param { IDestroyable } destroyable the instance to register the task for
 * @param { String } queueName the queue to schedule the task into
 * @param { Function | String } taskOrName a function representing the task, or string
 *                                         specifying a property representing the task,
 *                                         which is run at the provided time specified
 *                                         by timeout
 * @param { ...* } args arguments to pass to the task
 * @public
 */
export function scheduleTask(
  destroyable: IDestroyable,
  queueName: EmberRunQueues,
  taskOrName: TaskOrName,
  ...args: any[]
): Timer {
  assert(
    `Called \`scheduleTask\` without a string as the first argument on ${destroyable}.`,
    typeof queueName === 'string'
  );
  assert(
    `Called \`scheduleTask\` while trying to schedule to the \`afterRender\` queue on ${destroyable}.`,
    queueName !== 'afterRender'
  );

  if (destroyable.isDestroying) {
    return NULL_TIMER_ID;
  }

  let task: Function = getTask(destroyable, taskOrName, 'scheduleTask');
  let timers: Set<EmberRunTimer> = getTimers(destroyable);
  let cancelId: EmberRunTimer;
  let taskWrapper: Function = (...taskArgs: any[]) => {
    timers.delete(cancelId);
    task.call(destroyable, ...taskArgs);
  };
  cancelId = schedule(queueName, destroyable as any, taskWrapper, ...args);

  timers.add(cancelId);

  return cancelId;
}

/**
 * Runs the function with the provided name immediately, and only once in the time window
 * specified by the spacing argument.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { throttleTask, runDisposables } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   logMe() {
 *     console.log('This will run once immediately, then only once every 300ms.');
 *   },
 *
 *   click() {
 *     throttleTask(this, 'logMe', 300);
 *   },
 *
 *   destroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function throttleTask
 * @param { IDestroyable } destroyable the instance to register the task for
 * @param { String } taskName the name of the task to throttle
 * @param { ...* } [throttleArgs] arguments to pass to the throttled method
 * @param { Number } spacing the time in the future to run the task
 * @param { Boolean } [immediate] Trigger the function on the leading instead of the trailing edge of the wait interval. Defaults to true.
 * @public
 */
export function throttleTask(
  destroyable: IDestroyable,
  taskName: any,
  ...throttleArgs: any[]
): Timer {
  assert(
    `Called \`throttleTask\` without a string as the first argument on ${destroyable}.`,
    typeof taskName === 'string'
  );
  assert(
    `Called \`throttleTask('${taskName}')\` where '${taskName}' is not a function.`,
    typeof destroyable[taskName] === 'function'
  );

  if (destroyable.isDestroying) {
    return NULL_TIMER_ID;
  }

  const lastArgument = throttleArgs[throttleArgs.length - 1];
  const spacing =
    typeof lastArgument === 'boolean'
      ? throttleArgs[throttleArgs.length - 2]
      : lastArgument;

  assert(
    `Called \`throttleTask\` with incorrect \`spacing\` argument. Expected Number and received \`${spacing}\``,
    typeof spacing === 'number'
  );

  let timers: Set<EmberRunTimer> = getTimers(destroyable);
  let cancelId: EmberRunTimer = throttle(
    destroyable as any,
    taskName,
    ...throttleArgs
  );

  timers.add(cancelId);

  return cancelId;
}

/**
 * Cancel a previously scheduled task.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { runTask, cancelTask } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   didInsertElement() {
 *     this._cancelId = runTask(this, () => {
 *       console.log('This runs after 5 seconds if this component is still displayed');
 *     }, 5000)
 *   },
 *
 *   disable() {
 *     cancelTask(this, this._cancelId);
 *   },
 *
 *   willDestroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function cancelTask
 * @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
 * @param { Number } cancelId the id returned from the *Task call
 * @public
 */
export function cancelTask(cancelId: Timer): void | undefined;
export function cancelTask(destroyable: IDestroyable, cancelId: Timer): void | undefined;
export function cancelTask(
  destroyable: IDestroyable | Timer,
  cancelId?: any
): void | undefined {
  if (cancelId === NULL_TIMER_ID) {
    return;
  }

  if (typeof cancelId === 'undefined') {
    deprecate(
      'ember-lifeline cancelTask called without an object. New syntax is cancelTask(destroyable, cancelId) and avoids a memory leak.',
      true,
      {
        id: 'ember-lifeline-cancel-task-without-object',
        until: '4.0.0',
      }
    );
    cancelId = destroyable;
  } else {
    let timers: Set<EmberRunTimer> = getTimers(<IDestroyable>destroyable);
    timers.delete(cancelId);
  }
  cancel(cancelId);
}

function getTimersDisposable(
  destroyable: IDestroyable,
  timers: Set<EmberRunTimer>
): Function {
  return function() {
    timers.forEach(cancelId => {
      cancelTask(destroyable, cancelId);
    });
    timers.clear();
  };
}

function getTimers(destroyable: IDestroyable): Set<EmberRunTimer> {
  let timers = registeredTimers.get(destroyable);

  if (!timers) {
    timers = new Set<EmberRunTimer>();
    registeredTimers.set(destroyable, timers);
    registerDisposable(destroyable, getTimersDisposable(destroyable, timers));
  }

  return timers;
}
