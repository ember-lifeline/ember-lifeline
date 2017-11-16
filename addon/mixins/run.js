import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import Ember from 'ember';
import getOrAllocate from '../utils/get-or-allocate';

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
let pollTaskLabels = Object.create(null);
export function pollTaskFor(label) {
  assert(`A pollTask with a label of '${label}' was not found.`, pollTaskLabels[label]);
  assert(`You cannot advance a pollTask (\`${label}\`) when \`next\` has not been called.`, !!queuedPollTasks[label]);

  return run.join(null, queuedPollTasks[label]);
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
    this._pollerLabels = undefined;
  },

  /**
   Runs the provided function at the specified timeout (defaulting to 0).
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
   @param { Function } callbackOrName the callback to run at the provided time
   @param { Number } [timeout=0] the time in the future to run the callback
   @public
   */
  runTask(callbackOrName, timeout = 0) {
    assert(`Called \`runTask\` on destroyed object: ${this}.`, !this.isDestroyed);

    let type = typeof callbackOrName;
    let pendingTimers = getOrAllocate(this, '_pendingTimers', Array);

    let cancelId = run.later(() => {
      let cancelIndex = pendingTimers.indexOf(cancelId);
      pendingTimers.splice(cancelIndex, 1);

      if (type === 'function') {
        callbackOrName.call(this);
      } else if (type === 'string' && this[callbackOrName]) {
        this[callbackOrName]();
      } else {
        throw new Error('You must pass a callback function or method name to `runTask`.');
      }
    }, timeout);

    pendingTimers.push(cancelId);
    return cancelId;
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
   @param { Function } callbackOrName the callback to run at the provided time
   @param { ...* } args arguments to pass to the callback
   @public
   */
  scheduleTask(queueName, callbackOrName, ...args) {
    assert(`Called \`scheduleTask\` without a string as the first argument on ${this}.`, typeof queueName === 'string');
    assert(`Called \`scheduleTask\` while trying to schedule to the \`afterRender\` queue on ${this}.`, queueName !== 'afterRender');
    assert(`Called \`scheduleTask\` on destroyed object: ${this}.`, !this.isDestroyed);

    let callback;
    let type = typeof callbackOrName;
    if (type === 'function') {
      callback = callbackOrName;
    } else if (type === 'string') {
      callback = this[callbackOrName];
    }

    assert('You must pass a callback function or method name to `scheduleTask`.', typeof callback === 'function');

    let cancelId = run.schedule(queueName, this, callback, ...args);

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
   @param { String } methodName the name of the method to debounce
   @param { ...* } debounceArgs arguments to pass to the debounced method
   @param { Number } wait the amount of time to wait before calling the method (in milliseconds)
   @public
   */
  debounceTask(name, ...debounceArgs) {
    assert(`Called \`debounceTask\` without a string as the first argument on ${this}.`, typeof name === 'string');
    assert(`Called \`this.debounceTask('${name}', ...)\` where 'this.${name}' is not a function.`, typeof this[name] === 'function');
    assert(`Called \`debounceTask\` on destroyed object: ${this}.`, !this.isDestroyed);

    let pendingDebounces = getOrAllocate(this, '_pendingDebounces', Object);
    let debounce = pendingDebounces[name];
    let debouncedFn;

    if (!debounce) {
      debouncedFn = (...args) => {
        delete pendingDebounces[name];
        this[name](...args);
      };
    } else {
      debouncedFn = debounce.debouncedFn;
    }

    // cancelId is new, even if the debounced function was already present
    let cancelId = run.debounce(this, debouncedFn, ...debounceArgs);

    pendingDebounces[name] = { debouncedFn, cancelId };
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

  cancelThrottle(cancelId) {
    cancelThrottle(cancelId);
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
   @param { String } functionName the name of the function to debounce
   @param { Number } [timeout=5] the time in the future to run the callback (defaults to 5ms)
   @public
   */
  throttleTask(name, timeout = 0) {
    assert(`Called \`throttleTask\` without a string as the first argument on ${this}.`, typeof name === 'string');
    assert(`Called \`this.throttleTask('${name}', ${timeout})\` where 'this.${name}' is not a function.`, typeof this[name] === 'function');
    assert(`Called \`throttleTask\` on destroyed object: ${this}.`, !this.isDestroyed);

    let pendingThrottles = getOrAllocate(this, '_pendingThrottles', Array);

    let cancelId = run.throttle(this, name, timeout);

    pendingThrottles.push(cancelId);

    return cancelId;
  },

  /**
   Sets up a function that can perform polling logic in a testing safe way.
   The callback is invoked synchronously with an argument (generally called `next`).
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

       this.pollTask((next) => {
         this.get('api').request('get', 'some/path')
           .then(() => {
             this.runTask(next, 1800);
           })
       }, 'foo-bar#watch-some-path');
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

         pollTaskFor('foo-bar#watch-some-path');
         return wait();
       })
       .then(() => {
         assert.equal(serverRequests, 2, 'called again');
       });
   });
   ```

   @method pollTask
   @param { Function | String } callbackOrMethodName the callback or method name to run
   @param { String } [label] the label for the pollTask to be created
   @public
   */
  pollTask(callbackOrMethodName, label) {
    let next, callback;
    let type = typeof callbackOrMethodName;

    if (type === 'function') {
      callback = callbackOrMethodName;
    } else if (type === 'string' && this[callbackOrMethodName]) {
      callback = this[callbackOrMethodName];
    } else {
      throw new Error('You must pass a callback function or method name to `pollTask`.');
    }

    let tick = () => callback.call(this, next);

    if (label) {
      assert(`The label provided to \`pollTask\` must be unique. \`${label}\` has already been registered.`, !pollTaskLabels[label]);
      pollTaskLabels[label] = true;

      getOrAllocate(this, '_pollerLabels', Array).push(label);
    }

    if (shouldPoll()) {
      next = tick;
    } else if (label) {
      next = () => {
        queuedPollTasks[label] = tick;
      };
    } else {
      next = () => {};
    }

    callback.call(this, next);
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
       }, 'foo-bar#watch-some-path');
     },

     disableAutoRefresh() {
        this.cancelPoll('foo-bar#watch-some-path');
     }
   });
   ```

   @method cancelPoll
   @param { String } label the label for the pollTask to be cleared
   @public
   */
  cancelPoll(label) {
    cancelPoll(label);
  },

  willDestroy() {
    this._super(...arguments);

    cancelBoundTasks(this._pendingTimers, cancelTimer);
    cancelBoundTasks(this._pollerLabels, cancelPoll);
    cancelBoundTasks(this._pendingThrottles, cancelThrottle);
    cancelDebounces(this._pendingDebounces);
  }
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

function cancelPoll(label) {
  pollTaskLabels[label] = undefined;
  queuedPollTasks[label] = undefined;
}

function cancelThrottle(cancelId) {
  run.cancel(cancelId);
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
