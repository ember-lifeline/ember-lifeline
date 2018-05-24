import Ember from 'ember';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import { deprecate } from '@ember/application/deprecations';
import getTask from './utils/get-task';
import { registerDisposable } from './utils/disposable';

const { WeakMap } = Ember;

/**
 * A map of instances/poller functions that allows us to
 * store poller tokens per instance.
 *
 * @private
 *
 */
let registeredPollers = new WeakMap();

/**
 * Test use only. Allows for swapping out the WeakMap to a Map, giving
 * us the ability to detect whether the pollers set is empty.
 *
 * @private
 * @param {*} mapForTesting A map used to ensure correctness when testing.
 */
export function _setRegisteredPollers(mapForTesting) {
  registeredPollers = mapForTesting;
}

let token = 0;
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

let queuedPollTasks: {
  [k: string]: () => void
} = Object.create(null);
export function pollTaskFor(token) {
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!queuedPollTasks[token]
  );

  return run.join(null, queuedPollTasks[token]);
}

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
   import { pollTaskFor } from 'ember-lifeline';

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
export function pollTask(obj, taskOrName, token = getNextToken()) {
  let next;
  let task = getTask(obj, taskOrName, 'pollTask');
  let tick = () => task.call(obj, next);

  let pollers = registeredPollers.get(obj);

  if (!pollers) {
    pollers = new Set();
    registeredPollers.set(obj, pollers);

    registerDisposable(obj, getPollersDisposable(obj, pollers));
  }

  pollers.add(token);

  if (shouldPoll()) {
    next = tick;
  } else {
    next = () => {
      queuedPollTasks[token] = tick;
    };
  }

  task.call(obj, next);

  return token;
}

/**
   Clears a previously setup polling task.

   Example:

   ```js
   // app/components/foo-bar.js
   export default Component.extend({
     api: injectService(),

     enableAutoRefresh() {
       this._pollToken = pollTask(this, (next) => {
         this.get('api').request('get', 'some/path')
           .then(() => {
             runTask(this, next, 1800);
           })
       });
     },

     disableAutoRefresh() {
        cancelPoll(this, this._pollToken);
     }
   });
   ```

   @method cancelPoll
   @param { String } token the token for the pollTask to be cleared
   @public
   */
export function cancelPoll(token: number);
export function cancelPoll(obj: Object, token: number);
export function cancelPoll(obj: Object | number, token?: number) {
  let tok: number;
  if (typeof obj === 'number') {
    deprecate(
      'ember-lifeline cancelPoll called without an object. New syntax is cancelPoll(obj, cancelId) and avoids a memory leak.',
      true,
      {
        id: 'ember-lifeline-cancel-poll-without-object',
        until: '4.0.0',
      }
    );
    tok = obj;
  } else {
    let pollers = registeredPollers.get(obj);
    pollers.delete(token);
    tok = token as number; // token is mandatory if obj is an Object
  }
  delete queuedPollTasks[tok];
}

function getPollersDisposable(obj, pollers) {
  return function() {
    pollers.forEach(token => {
      cancelPoll(obj, token);
    });
  };
}

function getNextToken() {
  return token++;
}
