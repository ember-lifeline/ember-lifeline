import { assert } from '@ember/debug';
import { throttle } from '@ember/runloop';
import { EmberRunTimer } from '@ember/runloop/types';
import { isDestroying } from '@ember/destroyable';
import { NULL_TIMER_ID, getTimers } from './cancel-task';
import { Destroyable, Timer } from './types';

/**
 * Runs the function with the provided name immediately, and only once in the time window
 * specified by the spacing argument.
 *
 * Example:
 *
 * ```js
 * import Component from '@glimmer/component';
 * import { throttleTask } from 'ember-lifeline';
 *
 * export default LoggerComponent extends Component {
 *   logMe() {
 *     console.log('This will run once immediately, then only once every 300ms.');
 *   },
 *
 *   click() {
 *     throttleTask(this, 'logMe', 300);
 *   },
 * });
 * ```
 *
 * @function throttleTask
 * @param { Destroyable } destroyable the instance to register the task for
 * @param { String } taskName the name of the task to throttle
 * @param { ...* } [throttleArgs] arguments to pass to the throttled method
 * @param { Number } spacing the time in the future to run the task
 * @param { Boolean } [immediate] Trigger the function on the leading instead of the trailing edge of the wait interval. Defaults to true.
 * @public
 */
export function throttleTask(
  destroyable: Destroyable,
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

  if (isDestroying(destroyable)) {
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
    // @ts-ignore Ignores type mismatch issues with passing rest arguments to throttle.
    taskName,
    ...throttleArgs
  );

  timers.add(cancelId);

  return cancelId;
}
