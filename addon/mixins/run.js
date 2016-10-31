import Ember from 'ember';
import Mixin from 'ember-metal/mixin';
import run from 'ember-runloop';
import { assert } from 'ember-metal/utils';

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

let queuedPollTasks = {};
let pollTaskLabels = {};
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

    this._pendingTimers = [];
    this._pendingDebounces = {};
    this._pollerLabels = [];
  },

  /**
   Runs the provided function at the specified timeout (defaulting to 0).
   The timer is properly canceled if the object is destroyed before it is invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'web-client/mixins/context-bound-tasks';

   export default Component.extend(ContextBoundTasksMixin, {
     didInsertElement() {
       this.runTask(() => {
         console.log('This runs after 5 seconds if this component is still displayed');
       }, 5000)
     }
   });
   ```

   @method runTask
   @param { Function } callback the callback to run at the provided time
   @param { Number } [timeout=0] the time in the future to run the callback
   @public
   */
  runTask(callbackOrName, timeout = 0) {
    assert(`Called \`runTask\` on destroyed object: ${this}.`, !this.isDestroyed);
    let type = typeof callbackOrName;

    let cancelId = run.later(() => {
      let cancelIndex = this._pendingTimers.indexOf(cancelId);
      this._pendingTimers.splice(cancelIndex, 1);

      if (type === 'function') {
        callbackOrName.call(this);
      } else if (type === 'string' && this[callbackOrName]) {
        this[callbackOrName]();
      } else {
        throw new Error('You must pass a callback function or method name to `runTask`.');
      }
    }, timeout);

    this._pendingTimers.push(cancelId);
    return cancelId;
  },

  /**
   Runs the function with the provided name after the timeout has expired on the last
   invocation. The timer is properly canceled if the object is destroyed before it is
   invoked.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'web-client/mixins/context-bound-tasks';

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

    let debounce = this._pendingDebounces[name];
    let debouncedFn;

    if (!debounce) {
      debouncedFn = (...args) => {
        delete this._pendingDebounces[name];
        this[name](...args);
      };
    } else {
      debouncedFn = debounce.debouncedFn;
    }

    // cancelId is new, even if the debounced function was already present
    let cancelId = run.debounce(this, debouncedFn, ...debounceArgs);

    this._pendingDebounces[name] = { debouncedFn, cancelId };
  },

  /**
   Runs the function with the provided name immediately, and only once in the time window
   specified by the timeout argument.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundTasksMixin from 'web-client/mixins/context-bound-tasks';

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

    run.throttle(this, name, timeout);
  },

  /**
   Sets up a function that can perform polling logic in a testing safe way.
   The callback is invoked synchronusly with an argument (generally called `next`).
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
   import { pollTaskFor } from 'web-client/mixins/context-bound-tasks';

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

      this._pollerLabels.push(label);
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

  willDestroy() {
    this._super(...arguments);

    cancelTimers(this._pendingTimers);
    cancelDebounces(this._pendingDebounces);
    clearPollers(this._pollerLabels);
  }
});

function clearPollers(labels) {
  if (!labels.length) {
    return;
  }

  for (let i = 0; i < labels.length; i++) {
    let label = labels[i];
    pollTaskLabels[label] = undefined;
    queuedPollTasks[label] = undefined;
  }
}

function cancelTimers(timers) {
  if (!timers.length) {
    return;
  }

  for (let i = 0; i < timers.length; i++) {
    let cancelId = timers[i];

    run.cancel(cancelId);
  }
}

function cancelDebounces(obj) {
  let debounceNames = Object.keys(obj);

  if (!debounceNames.length) {
    return;
  }

  for (let i = 0; i < debounceNames.length; i++) {
    let taskName = debounceNames[i];
    let { cancelId } = obj[taskName];

    run.cancel(cancelId);
  }
}
