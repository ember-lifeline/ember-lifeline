import Mixin from '@ember/object/mixin';
import { runTask, scheduleTask, throttleTask, cancelTask } from '../run-task';
import { pollTask, cancelPoll, Token } from '../poll-task';
import { debounceTask, cancelDebounce } from '../debounce-task';
import { runDisposables } from '../utils/disposable';
import { TaskOrName, EmberRunQueues } from '../types';

/**
 * ContextBoundTasksMixin provides a mechanism to run tasks (ala `setTimeout` or
 * `Ember.run.later`) with automatic cancellation when the host object is
 * destroyed.
 *
 * These capabilities are very commonly needed, so this mixin is by default
 * included into all `Ember.View`, `Ember.Component`, and `Ember.Service` instances.
 *
 * @class ContextBoundTasksMixin
 * @public
 */
export default Mixin.create({
  /**
   * Runs the provided task function at the specified timeout (defaulting to 0).
   * The timer is properly canceled if the object is destroyed before it is invoked.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   didInsertElement() {
   *     this.runTask(() => {
   *       console.log('This runs after 5 seconds if this component is still displayed');
   *     }, 5000)
   *   }
   * });
   * ```
   *
   * @method runTask
   * @param { Function | String } taskOrName a function representing the task, or string
   *                                         specifying a property representing the task,
   *                                         which is run at the provided time specified
   *                                         by timeout
   * @param { Number } [timeout=0] the time in the future to run the task
   * @public
   */
  runTask(taskOrName: TaskOrName, timeout = 0) {
    return runTask(this, taskOrName, timeout);
  },

  /**
   * Cancel a previously scheduled task.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   didInsertElement() {
   *     this._cancelId = this.runTask(() => {
   *       console.log('This runs after 5 seconds if this component is still displayed');
   *     }, 5000)
   *   },
   *
   *   disable() {
   *      this.cancelTask(this._cancelId);
   *   }
   * });
   * ```
   *
   * @method cancelTask
   * @param { Number } cancelId the id returned from the runTask or scheduleTask call
   * @public
   */
  cancelTask(cancelId: number) {
    cancelTask(cancelId);
  },

  /**
   * Adds the provided function to the named queue. The timer is properly canceled if the
   * object is destroyed before it is invoked.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'web-client/mixins/context-bound-tasks';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   init() {
   *     this._super(...arguments);
   *     this.scheduleTask('actions', () => {
   *       console.log('This runs at the end of the run loop (via the actions queue) if this component is still displayed');
   *     });
   *   }
   * });
   * ```
   *
   * @method scheduleTask
   * @param { String } queueName the queue to schedule the task into
   * @param { Function | String } taskOrName a function representing the task, or string
   *                                         specifying a property representing the task,
   *                                         which is run at the provided time specified
   *                                         by timeout
   * @param { ...* } args arguments to pass to the task
   * @public
   */
  scheduleTask(
    queueName: EmberRunQueues,
    taskOrName: TaskOrName,
    ...args: any[]
  ) {
    return scheduleTask(this, queueName, taskOrName, ...args);
  },

  /**
   * Runs the function with the provided name after the timeout has expired on the last
   * invocation. The timer is properly canceled if the object is destroyed before it is
   * invoked.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   logMe() {
   *     console.log('This will only run once every 300ms.');
   *   },
   *
   *   click() {
   *     this.debounceTask('logMe', 300);
   *   }
   * });
   * ```
   *
   * @method debounceTask
   * @param { String } name the name of the task to debounce
   * @param { ...* } debounceArgs arguments to pass to the debounced method
   * @param { Number } wait the amount of time to wait before calling the method (in milliseconds)
   * @public
   */
  debounceTask(name: string, ...debounceArgs: any[]) {
    debounceTask(this, name, ...debounceArgs);
  },

  /**
   * Cancel a previously debounced task.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   logMe() {
   *     console.log('This will only run once every 300ms.');
   *   },
   *
   *   click() {
   *     this.debounceTask('logMe', 300);
   *   },
   *
   *   disable() {
   *      this.cancelDebounce('logMe');
   *   }
   * });
   * ```
   *
   * @method cancelDebounce
   * @param { String } name the name of the debounced method to cancel
   * @public
   */
  cancelDebounce(name: string) {
    cancelDebounce(this, name);
  },

  /**
   * Runs the function with the provided name immediately, and only once in the time window
   * specified by the timeout argument.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   logMe() {
   *     console.log('This will run once immediately, then only once every 300ms.');
   *   },
   *
   *   click() {
   *     this.throttleTask('logMe', 300);
   *   }
   * });
   * ```
   *
   * @method throttleTask
   * @param { String } name the name of the task to throttle
   * @param { Number } [timeout] the time in the future to run the task
   * @public
   */
  throttleTask(name: string, timeout: number) {
    return throttleTask(this, name, timeout);
  },

  /**
   * Cancel a previously throttled task.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundTasksMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundTasksMixin, {
   *   logMe() {
   *     console.log('This will only run once every 300ms.');
   *   },
   *
   *   click() {
   *     this.throttleTask('logMe', 300);
   *   },
   *
   *   disable() {
   *      this.cancelThrottle('logMe');
   *   }
   * });
   * ```
   *
   * @method cancelThrottle
   * @param { Number } cancelId the id returned from the throttleTask call
   * @public
   */
  cancelThrottle(cancelId: number) {
    cancelTask(cancelId);
  },

  /**
   * Sets up a function that can perform polling logic in a testing safe way.
   * The task is invoked synchronously with an argument (generally called `next`).
   * In normal development/production when `next` is invoked, it will trigger the
   * task again (recursively). However, when in test mode the recursive polling
   * functionality is disabled, and usage of the `pollTaskFor` helper is required.
   *
   * Example:
   *
   * ```js
   * // app/components/foo-bar.js
   * export default Component.extend({
   *   api: injectService(),
   *
   *   init() {
   *     this._super(...arguments);
   *
   *     let token = this.pollTask((next) => {
   *       this.get('api').request('get', 'some/path')
   *         .then(() => {
   *           this.runTask(next, 1800);
   *         })
   *     });
   *
   *     this._pollToken = token;
   *   }
   * });
   * ```
   *
   * Test Example:
   *
   * ```js
   * import wait from 'ember-test-helpers/wait';
   * import { pollTaskFor } from 'ember-lifeline';
   *
   * //...snip...
   *
   * test('foo-bar watches things', function(assert) {
   *   this.render(hbs`{{foo-bar}}`);
   *
   *   return wait()
   *     .then(() => {
   *       assert.equal(serverRequests, 1, 'called initially');
   *
   *       pollTaskFor(this._pollToken);
   *       return wait();
   *     })
   *     .then(() => {
   *       assert.equal(serverRequests, 2, 'called again');
   *     });
   * });
   * ```
   *
   * @method pollTask
   * @param { Function | String } taskOrName a function representing the task, or string
   *                                         specifying a property representing the task,
   *                                         which is run at the provided time specified
   *                                         by timeout
   * @param { Token } token the token used to uniquely identify the pollTask
   * @public
   */
  pollTask(taskOrName: TaskOrName, token: Token) {
    return pollTask(this, taskOrName, token);
  },

  /**
   * Clears a previously setup polling task.
   *
   * NOTE: This does not cancel any nested `runTask` calls. You're required to cancel any
   * cancelable behaviors, including any calls to `runTask` using `cancelTask`.
   *
   * Example:
   *
   * ```js
   * // app/components/foo-bar.js
   * export default Component.extend({
   *   api: injectService(),
   *
   *   enableAutoRefresh() {
   *     this.pollTask((next) => {
   *       this.get('api').request('get', 'some/path')
   *         .then(() => {
   *           this.runTask(next, 1800);
   *         })
   *     });
   *   },
   *
   *   disableAutoRefresh() {
   *      this.cancelPoll('foo-bar#watch-some-path');
   *   }
   * });
   * ```
   *
   * @method cancelPoll
   * @param { String } token the token for the pollTask to be cleared
   * @public
   */
  cancelPoll(token: Token) {
    cancelPoll(token);
  },

  destroy() {
    runDisposables(this);

    this._super(...arguments);
  },
});
