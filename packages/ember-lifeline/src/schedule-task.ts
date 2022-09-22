import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { EmberRunTimer } from '@ember/runloop/types';
import { isDestroying } from '@ember/destroyable';
import { getTimers, NULL_TIMER_ID } from './cancel-task';
import { Destroyable, EmberRunQueues, TaskOrName, Timer } from './types';
import getTask from './utils/get-task';

/**
 * Adds the provided function to the named queue for the provided object. The timer is
 * properly canceled if the object is destroyed before it is invoked.
 *
 * Example:
 *
 * ```js
 * import Component from '@glimmer/component';
 * import { scheduleTask } from 'ember-lifeline';
 *
 * export default ScheduledComponent extends Component {
 *   start() {
 *     scheduleTask(this, 'actions', () => {
 *       console.log('This runs at the end of the run loop (via the actions queue) if this component is still displayed');
 *     })
 *   },
 * });
 * ```
 *
 * @function scheduleTask
 * @param { Destroyable } destroyable the instance to register the task for
 * @param { String } queueName the queue to schedule the task into
 * @param { Function | String } taskOrName a function representing the task, or string
 *                                         specifying a property representing the task,
 *                                         which is run at the provided time specified
 *                                         by timeout
 * @param { ...* } args arguments to pass to the task
 * @public
 */
export function scheduleTask(
  destroyable: Destroyable,
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

  if (isDestroying(destroyable)) {
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
