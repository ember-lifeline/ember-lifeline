import Ember from 'ember';
import getTask from './utils/get-task';
import { IMap, TaskOrName, IDestroyable, Token } from './types';
import { registerDestructor } from '@ember/destroyable';

type Indexable = Record<any, unknown>;

function indexable<T extends object>(input: T): T & Indexable {
  return input as T & Indexable;
}

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

  return !Ember.testing;
}

/**
 * Allows for overriding of the polling behavior to explicitly control
 * whether polling should occur or not.
 *
 * @param { Function } callback
 * @public
 */
export function setShouldPoll(callback: Function): void {
  _shouldPollOverride = callback;
}

export function getQueuedPollTasks(): Map<Token, () => void> {
  let symbol = Symbol.for('LIFELINE_QUEUED_POLL_TASKS') as any;
  let globalObj = getGlobal();
  let queuedPollTasks = globalObj[symbol];

  if (!queuedPollTasks) {
    queuedPollTasks = globalObj[symbol] = new Map();
  }

  return queuedPollTasks as Map<Token, () => void>;
}

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
 * import { pollTask, runTask } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   api: injectService(),
 *
 *   init() {
 *     this._super(...arguments);
 *
 *     let token = pollTask(this, (next) => {
 *       this.get('api').request('get', 'some/path')
 *         .then(() => {
 *           runTask(this, next, 1800);
 *         })
 *     });
 *
 *     this._pollToken = token;
 *   },
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
 * test('foo-bar watches things', async function(assert) {
 *   await render(hbs`{{foo-bar}}`);
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
 * @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
 * @param { TaskOrName } taskOrName a function representing the task, or string
 *                                  specifying a property representing the task,
 *                                  which is run at the provided time specified
 *                                  by timeout
 * @param { Token } token the Token for the pollTask, either a string or number
 * @public
 */
export function pollTask(
  destroyable: IDestroyable,
  taskOrName: TaskOrName,
  token: Token = getNextToken()
): Token {
  let next: Function;
  let task = getTask(destroyable, taskOrName, 'pollTask');
  let tick = () => task.call(destroyable, next);

  let pollers = registeredPollers.get(destroyable);

  if (!pollers) {
    pollers = new Set();
    registeredPollers.set(destroyable, pollers);

    registerDestructor(destroyable, getPollersDisposable(destroyable, pollers));
  }

  pollers.add(token);

  if (shouldPoll()) {
    next = tick;
  } else {
    next = () => {
      getQueuedPollTasks().set(token, tick);
    };
  }

  task.call(destroyable, next);

  return token;
}

/**
 * Clears a previously setup polling task.
 *
 * NOTE: This does not cancel any nested `runTask` calls. You're required to cancel any
 * cancelable behaviors, including any calls to `runTask` using `cancelTask`.
 *
 * Example:
 *
 * ```js
 * import { pollTask, runTask } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   api: injectService(),
 *
 *   enableAutoRefresh() {
 *     this._pollToken = pollTask(this, (next) => {
 *       this.get('api').request('get', 'some/path')
 *         .then(() => {
 *           runTask(this, next, 1800);
 *         })
 *     });
 *   },
 *
 *   disableAutoRefresh() {
 *     cancelPoll(this, this._pollToken);
 *   },
 * });
 * ```
 *
 * @method cancelPoll
 * @param { IDestroyable } destroyable the entangled object that was provided with the original *Task call
 * @param { Token } token the Token for the pollTask to be cleared, either a string or number
 * @public
 */
export function cancelPoll(
  destroyable: IDestroyable,
  token: Token
): void | undefined {
  let pollToken: Token;
  let pollers: Set<Token> = registeredPollers.get(destroyable);
  pollToken = token as Token;

  if (pollers !== undefined) {
    pollers.delete(pollToken);
  }

  getQueuedPollTasks().delete(pollToken);
}

function getGlobal(): Indexable {
  // eslint-disable-next-line node/no-unsupported-features/es-builtins
  if (typeof globalThis !== 'undefined') return indexable(globalThis);
  if (typeof self !== 'undefined') return indexable(self);
  if (typeof window !== 'undefined') return indexable(window);
  if (typeof global !== 'undefined') return indexable(global);

  throw new Error('unable to locate global object');
}

function getPollersDisposable(destroyable: IDestroyable, pollers: Set<Token>) {
  return function () {
    pollers.forEach((token) => {
      cancelPoll(destroyable, token);
    });
  };
}

function getNextToken(): number {
  return token++;
}
