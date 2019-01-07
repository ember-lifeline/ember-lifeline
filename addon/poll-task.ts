import Ember from 'ember';
import { join } from '@ember/runloop';
import { assert } from '@ember/debug';
import { deprecate } from '@ember/application/deprecations';
import getTask from './utils/get-task';
import { registerDisposable } from './utils/disposable';
import { IMap, TaskOrName, IDestroyable } from './interfaces';

type Token = string | number;

/**
 * A map of instances/poller functions that allows us to
 * store poller tokens per instance.
 *
 * @private
 *
 */
let registeredPollers: IMap<IDestroyable, Set<Token>> = new WeakMap<
  IDestroyable,
  any
>();

/**
 * Test use only. Allows for swapping out the WeakMap to a Map, giving
 * us the ability to detect whether the pollers set is empty.
 *
 * @private
 * @param {*} mapForTesting A map used to ensure correctness when testing.
 */
export function _setRegisteredPollers(
  mapForTesting: IMap<IDestroyable, Set<Token>>
): void | undefined {
  registeredPollers = mapForTesting;
}

let token: number = 0;
let _shouldPollOverride: Function | undefined;
function shouldPoll() {
  if (_shouldPollOverride) {
    return _shouldPollOverride();
  }

  // eslint-disable-next-line ember-suave/no-direct-property-access
  return !Ember.testing;
}

export function setShouldPoll(callback: Function): void {
  _shouldPollOverride = callback;
}

let queuedPollTasks: {
  [k: string]: () => void;
} = Object.create(null);
export function pollTaskFor(token: Token): void | undefined {
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!queuedPollTasks[token]
  );

  return join(null, queuedPollTasks[token]);
}

/**
   Sets up a function that can perform polling logic in a testing safe way.
   The task is invoked synchronously with an argument (generally called `next`).
   In normal development/production when `next` is invoked, it will trigger the
   task again (recursively). However, when in test mode the recursive polling
   functionality is disabled, and usage of the `pollTaskFor` helper is required.

   Example:

   ```js
  import { pollTask, runTask, runDisposables } from 'ember-lifeline';

  export default Component.extend({
     api: injectService(),

     init() {
       this._super(...arguments);

       let token = pollTask(this, (next) => {
         this.get('api').request('get', 'some/path')
           .then(() => {
             runTask(this, next, 1800);
           })
       });

       this._pollToken = token;
     },

     willDestroy() {
       this._super(...arguments);

       runDisposables(this);
     }
   });
   ```

   Test Example:

   ```js
   import wait from 'ember-test-helpers/wait';
   import { pollTaskFor } from 'ember-lifeline';

   //...snip...

   test('foo-bar watches things', async function(assert) {
     await render(hbs`{{foo-bar}}`);

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
   @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
   @param { Function | String } taskOrName a function representing the task, or string
                                           specifying a property representing the task,
                                           which is run at the provided time specified
                                           by timeout
   @param { Token } token the Token for the pollTask, either a String or Number
   @public
   */
export function pollTask(
  destroyable: IDestroyable,
  taskOrName: TaskOrName,
  token: Token = getNextToken()
): Token {
  let next;
  let task = getTask(destroyable, taskOrName, 'pollTask');
  let tick = () => task.call(destroyable, next);

  let pollers = registeredPollers.get(destroyable);

  if (!pollers) {
    pollers = new Set();
    registeredPollers.set(destroyable, pollers);

    registerDisposable(destroyable, getPollersDisposable(destroyable, pollers));
  }

  pollers.add(token);

  if (shouldPoll()) {
    next = tick;
  } else {
    next = () => {
      queuedPollTasks[token] = tick;
    };
  }

  task.call(destroyable, next);

  return token;
}

/**
   Clears a previously setup polling task.

   Example:

   ```js
  import { pollTask, runTask, runDisposables } from 'ember-lifeline';

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
     },

     willDestroy() {
       this._super(...arguments);

       runDisposables(this);
     }
   });
   ```

   @method cancelPoll
   @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
   @param { Token } _token the Token for the pollTask to be cleared, either a String or Number
   @public
   */
export function cancelPoll(_token: Token);
export function cancelPoll(destroyable: IDestroyable, _token: Token);
export function cancelPoll(
  destroyable: IDestroyable | Token,
  _token?: Token
): void | undefined {
  let token: Token;
  if (typeof destroyable === 'number' || typeof destroyable === 'string') {
    deprecate(
      'ember-lifeline cancelPoll called without an object. New syntax is cancelPoll(destroyable, cancelId) and avoids a memory leak.',
      true,
      {
        id: 'ember-lifeline-cancel-poll-without-object',
        until: '4.0.0',
      }
    );
    token = destroyable;
  } else {
    let pollers: Set<Token> = registeredPollers.get(destroyable);
    token = _token as Token;

    if (pollers !== undefined) {
      pollers.delete(token);
    }
  }
  delete queuedPollTasks[token];
}

function getPollersDisposable(
  destroyable: IDestroyable,
  pollers: Set<Token>
): Function {
  return function() {
    pollers.forEach(token => {
      cancelPoll(destroyable, token);
    });
  };
}

function getNextToken(): number {
  return token++;
}
