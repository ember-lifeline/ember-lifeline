import { cancel } from '@ember/runloop';
import { registerDestructor } from '@ember/destroyable';
import { EmberRunTimer, IDestroyable, IMap } from './types';

export const NULL_TIMER_ID = -1;

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

export function getTimersDisposable(
  destroyable: IDestroyable,
  timers: Set<EmberRunTimer>
) {
  return function () {
    timers.forEach((cancelId) => {
      cancelTask(destroyable, cancelId);
    });
    timers.clear();
  };
}

export function getTimers(destroyable: IDestroyable): Set<EmberRunTimer> {
  let timers = registeredTimers.get(destroyable);

  if (!timers) {
    timers = new Set<EmberRunTimer>();
    registeredTimers.set(destroyable, timers);
    registerDestructor(destroyable, getTimersDisposable(destroyable, timers));
  }

  return timers;
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
 * });
 * ```
 *
 * @function cancelTask
 * @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
 * @param { Number } cancelId the id returned from the *Task call
 * @public
 */
export function cancelTask(
  destroyable: IDestroyable,
  cancelId: EmberRunTimer
): void | undefined {
  let timers: Set<EmberRunTimer> = getTimers(<IDestroyable>destroyable);

  timers.delete(cancelId);
  cancel(cancelId);
}
