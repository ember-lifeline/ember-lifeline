import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import Ember from 'ember';
import getOrAllocate from '../utils/get-or-allocate';
import getNextToken from '../utils/get-next-token';
import { runTask, getTask } from '../utils/run';
import { runDisposables } from '../utils/disposable';

let _shouldPollOverride;
function shouldPoll() {
  if (_shouldPollOverride) {
    return _shouldPollOverride();
  }

  // eslint-disable-next-line ember-suave/no-direct-property-access
  return !Ember.testing;
}

export function setShouldPoll(callback) {
  _shouldPollOverride = callback;
}

let queuedPollTasks = Object.create(null);
let pollTaskTokens = Object.create(null);
export function pollTaskFor(token) {
  assert(
    `A pollTask with a token of '${token}' was not found.`,
    pollTaskTokens[token]
  );
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!queuedPollTasks[token]
  );

  return run.join(null, queuedPollTasks[token]);
}

/**
 ContextBoundTasksMixin provides a mechanism to run tasks (ala `setTimeout` or
 `Ember.run.later`) with automatic cancellation when the host object is
 destroyed.

 These capabilities are very commonly needed, so this mixin is by default
 included into all `Ember.View`, `Ember.Component`, and `Ember.Service` instances.

 @class ContextBoundTasksMixin
 @public
 */
export default Mixin.create({
  init() {
    this._super(...arguments);

    this._pendingTimers = undefined;
    this._pendingDebounces = undefined;
    this._pendingThrottles = undefined;
    this._pollerTokens = undefined;
  },

  /**
   Runs the provided task function at the specified timeout (defaulting to 0).
   The timer is properly canceled if the object is destroyed before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     didInsertElement() {
       this.runTask(() => {
         console.log('This runs after 5 seconds if this component is still displayed');
       }, 5000)
     }
   });
   ```

   @method runTask
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @param { Number } [timeout=0] the time in the future to run the task
   @public
   */
  runTask(taskOrName, timeout = 0) {
    return runTask(this, taskOrName, timeout);
  },

  /**
   Cancel a previously scheduled task.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     didInsertElement() {
       this._cancelId = this.runTask(() => {
         console.log('This runs after 5 seconds if this component is still displayed');
       }, 5000)
     },

     disable() {
        this.cancelTask(this._cancelId);
     }
   });
   ```

   @method cancelTask
   @param { Number } cancelId the id returned from the runTask or scheduleTask call
   @public
   */
  cancelTask(cancelId) {
    cancelTimer(cancelId);
  },

  /**
   Adds the provided function to the named queue to be executed at the end of the RunLoop.
   The timer is properly canceled if the object is destroyed before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'web-client/mixins/context-bound-tasks';

   export default Component.extend(ContextBoundTasksMixin, {
     init() {
       this._super(...arguments);
       this.scheduleTask('actions', () => {
         console.log('This runs at the end of the run loop (via the actions queue) if this component is still displayed');
       })
     }
   });
   ```

   @method scheduleTask
   @param { String } queueName the queue to schedule the task into
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @param { ...* } args arguments to pass to the task
   @public
   */
  scheduleTask(queueName, taskOrName, ...args) {
    assert(
      `Called \`scheduleTask\` without a string as the first argument on ${this}.`,
      typeof queueName === 'string'
    );
    assert(
      `Called \`scheduleTask\` while trying to schedule to the \`afterRender\` queue on ${this}.`,
      queueName !== 'afterRender'
    );
    assert(
      `Called \`scheduleTask\` on destroyed object: ${this}.`,
      !this.isDestroyed
    );

    let task = getTask(this, taskOrName, 'scheduleTask');

    let cancelId = run.schedule(queueName, this, task, ...args);

    let pendingTimers = getOrAllocate(this, '_pendingTimers', Array);
    pendingTimers.push(cancelId);

    return cancelId;
  },

  /**
   Runs the function with the provided name after the timeout has expired on the last
   invocation. The timer is properly canceled if the object is destroyed before it is
   invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     logMe() {
       console.log('This will only run once every 300ms.');
     },

     click() {
       this.debounceTask('logMe', 300);
     }
   });
   ```

   @method debounceTask
   @param { String } name the name of the task to debounce
   @param { ...* } debounceArgs arguments to pass to the debounced method
   @param { Number } wait the amount of time to wait before calling the method (in milliseconds)
   @public
   */
  debounceTask(name, ...debounceArgs) {
    assert(
      `Called \`debounceTask\` without a string as the first argument on ${this}.`,
      typeof name === 'string'
    );
    assert(
      `Called \`this.debounceTask('${name}', ...)\` where 'this.${name}' is not a function.`,
      typeof this[name] === 'function'
    );
    assert(
      `Called \`debounceTask\` on destroyed object: ${this}.`,
      !this.isDestroyed
    );

    let pendingDebounces = getOrAllocate(this, '_pendingDebounces', Object);
    let debounce = pendingDebounces[name];
    let debouncedTask;

    if (!debounce) {
      debouncedTask = (...args) => {
        delete pendingDebounces[name];
        this[name](...args);
      };
    } else {
      debouncedTask = debounce.debouncedTask;
    }

    // cancelId is new, even if the debounced function was already present
    let cancelId = run.debounce(this, debouncedTask, ...debounceArgs);

    pendingDebounces[name] = { debouncedTask, cancelId };
  },

  /**
   Cancel a previously debounced task.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     logMe() {
       console.log('This will only run once every 300ms.');
     },

     click() {
       this.debounceTask('logMe', 300);
     },

     disable() {
        this.cancelDebounce('logMe');
     }
   });
   ```

   @method cancelDebounce
   @param { String } methodName the name of the debounced method to cancel
   @public
   */
  cancelDebounce(name) {
    cancelDebounce(this._pendingDebounces, name);
  },

  /**
   Runs the function with the provided name immediately, and only once in the time window
   specified by the timeout argument.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     logMe() {
       console.log('This will run once immediately, then only once every 300ms.');
     },

     click() {
       this.throttleTask('logMe', 300);
     }
   });
   ```

   @method throttleTask
   @param { String } name the name of the task to throttle
   @param { Number } [timeout=5] the time in the future to run the task (defaults to 5ms)
   @public
   */
  throttleTask(name, timeout = 0) {
    assert(
      `Called \`throttleTask\` without a string as the first argument on ${this}.`,
      typeof name === 'string'
    );
    assert(
      `Called \`this.throttleTask('${name}', ${timeout})\` where 'this.${name}' is not a function.`,
      typeof this[name] === 'function'
    );
    assert(
      `Called \`throttleTask\` on destroyed object: ${this}.`,
      !this.isDestroyed
    );

    let pendingThrottles = getOrAllocate(this, '_pendingThrottles', Array);

    let cancelId = run.throttle(this, name, timeout);

    pendingThrottles.push(cancelId);

    return cancelId;
  },

  /**
   Cancel a previously throttled task.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'ember-lifeline/mixins/run';

   export default Component.extend(ContextBoundTasksMixin, {
     logMe() {
       console.log('This will only run once every 300ms.');
     },

     click() {
       this.throttleTask('logMe', 300);
     },

     disable() {
        this.cancelThrottle('logMe');
     }
   });
   ```

   @method cancelThrottle
   @param { Number } cancelId the id returned from the throttleTask call
   @public
   */
  cancelThrottle(cancelId) {
    cancelTimer(cancelId);
  },

  /**
   Sets up a function that can perform polling logic in a testing safe way.
   The task is invoked synchronously with an argument (generally called `next`).
   In normal development/production when `next` is invoked, it will trigger the
   task again (recursively). However, when in test mode the recursive polling
   functionality is disabled, and usage of the `pollTaskFor` helper is required.

   Example:

   ```js
   // app/components/foo-bar.js
   export default Component.extend({
     api: injectService(),

     init() {
       this._super(...arguments);

       let token = this.pollTask((next) => {
         this.get('api').request('get', 'some/path')
           .then(() => {
             this.runTask(next, 1800);
           })
       });

       this._pollToken = token;
     }
   });
   ```

   Test Example:

   ```js
   import wait from 'ember-test-helpers/wait';
   import { pollTaskFor } from 'ember-lifeline/mixins/run';

   //...snip...

   test('foo-bar watches things', function(assert) {
     this.render(hbs`{{foo-bar}}`);

     return wait()
       .then(() => {
         assert.equal(serverRequests, 1, 'called initially');

         pollTaskFor(this._pollToken);
         return wait();
       })
       .then(() => {
         assert.equal(serverRequests, 2, 'called again');
       });
   });
   ```

   @method pollTask
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @public
   */
  pollTask(taskOrName, token = getNextToken()) {
    let next;
    let task = getTask(this, taskOrName, 'pollTask');
    let tick = () => task.call(this, next);

    pollTaskTokens[token] = true;

    getOrAllocate(this, '_pollerTokens', Array).push(token);

    if (shouldPoll()) {
      next = tick;
    } else {
      next = () => {
        queuedPollTasks[token] = tick;
      };
    }

    task.call(this, next);

    return token;
  },

  /**
   Clears a previously setup polling task.

   Example:

   ```js
   // app/components/foo-bar.js
   export default Component.extend({
     api: injectService(),

     enableAutoRefresh() {
       this.pollTask((next) => {
         this.get('api').request('get', 'some/path')
           .then(() => {
             this.runTask(next, 1800);
           })
       });
     },

     disableAutoRefresh() {
        this.cancelPoll('foo-bar#watch-some-path');
     }
   });
   ```

   @method cancelPoll
   @param { String } token the token for the pollTask to be cleared
   @public
   */
  cancelPoll(token) {
    cancelPoll(token);
  },

  destroy() {
    this._super(...arguments);

    runDisposables(this);

    cancelBoundTasks(this._pendingTimers, cancelTimer);
    cancelBoundTasks(this._pollerTokens, cancelPoll);
    cancelBoundTasks(this._pendingThrottles, cancelTimer);
    cancelDebounces(this._pendingDebounces);
  },
});

export function cancelBoundTasks(tasks, cancelFn) {
  if (!tasks || !tasks.length) {
    return;
  }

  for (let i = 0; i < tasks.length; i++) {
    cancelFn(tasks[i]);
  }
}

function cancelTimer(cancelId) {
  run.cancel(cancelId);
}

function cancelPoll(token) {
  delete pollTaskTokens[token];
  delete queuedPollTasks[token];
}

function cancelDebounce(pendingDebounces, name) {
  let { cancelId } = pendingDebounces[name];
  run.cancel(cancelId);
}

function cancelDebounces(pendingDebounces) {
  let debounceNames = pendingDebounces && Object.keys(pendingDebounces);

  if (!debounceNames || !debounceNames.length) {
    return;
  }

  for (let i = 0; i < debounceNames.length; i++) {
    cancelDebounce(pendingDebounces, debounceNames[i]);
  }
}
