import { assert } from '@ember/debug';
import { cancel, debounce } from '@ember/runloop';
import { IDestroyable, IMap, EmberRunTimer } from './types';
import { registerDisposable } from './utils/disposable';

interface PendingDebounce {
  debouncedTask: Function;
  cancelId: EmberRunTimer;
}

/**
 * A map of instances/debounce functions that allows us to
 * store pending debounces per instance.
 *
 * @private
 */
const registeredDebounces: IMap<
  IDestroyable,
  Map<string, PendingDebounce>
> = new WeakMap<IDestroyable, any>();

/**
 * Runs the function with the provided name after the timeout has expired on the last
 * invocation. The timer is properly canceled if the object is destroyed before it is
 * invoked.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { debounceTask, runDisposables } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   logMe() {
 *     console.log('This will only run once every 300ms.');
 *   },
 *
 *   click() {
 *     debounceTask(this, 'logMe', 300);
 *   },
 *
 *   willDestroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function debounceTask
 * @param { IDestroyable } destroyable the instance to register the task for
 * @param { String } name the name of the task to debounce
 * @param { ...* } debounceArgs arguments to pass to the debounced method
 * @param { Number } spacing the amount of time to wait before calling the method (in milliseconds)
 * @param { Boolean } [immediate] Trigger the function on the leading instead of the trailing edge of the wait interval. Defaults to false.
 * @public
 */
export function debounceTask(
  destroyable: IDestroyable,
  name: string,
  ...debounceArgs: any[]
): void | undefined {
  assert(
    `Called \`debounceTask\` without a string as the first argument on ${destroyable}.`,
    typeof name === 'string'
  );
  assert(
    `Called \`destroyable.debounceTask('${name}', ...)\` where 'destroyable.${name}' is not a function.`,
    typeof destroyable[name] === 'function'
  );

  if (destroyable.isDestroying) {
    return;
  }

  const lastArgument = debounceArgs[debounceArgs.length - 1];
  const spacing =
    typeof lastArgument === 'boolean'
      ? debounceArgs[debounceArgs.length - 2]
      : lastArgument;

  assert(
    `Called \`debounceTask\` with incorrect \`spacing\` argument. Expected Number and received \`${spacing}\``,
    typeof spacing === 'number'
  );

  let pendingDebounces = registeredDebounces.get(destroyable);
  if (!pendingDebounces) {
    pendingDebounces = new Map();
    registeredDebounces.set(destroyable, pendingDebounces);
    registerDisposable(destroyable, getDebouncesDisposable(pendingDebounces));
  }

  let debouncedTask: Function;

  if (!pendingDebounces.has(name)) {
    debouncedTask = (...args: any[]) => {
      pendingDebounces.delete(name);
      destroyable[name](...args);
    };
  } else {
    debouncedTask = pendingDebounces.get(name)!.debouncedTask;
  }

  // cancelId is new, even if the debounced function was already present
  let cancelId = debounce(
    destroyable as any,
    debouncedTask as any,
    ...debounceArgs
  );

  pendingDebounces.set(name, { debouncedTask, cancelId });
}

/**
 * Cancel a previously debounced task.
 *
 * Example:
 *
 * ```js
 * import Component from 'ember-component';
 * import { debounceTask, cancelDebounce } from 'ember-lifeline';
 *
 * export default Component.extend({
 *   logMe() {
 *     console.log('This will only run once every 300ms.');
 *   },
 *
 *   click() {
 *     debounceTask(this, 'logMe', 300);
 *   },
 *
 *   disable() {
 *      cancelDebounce(this, 'logMe');
 *   },
 *
 *   willDestroy() {
 *     this._super(...arguments);
 *
 *     runDisposables(this);
 *   }
 * });
 * ```
 *
 * @function cancelDebounce
 * @param { IDestroyable } destroyable the instance to register the task for
 * @param { String } methodName the name of the debounced method to cancel
 * @public
 */
export function cancelDebounce(
  destroyable: IDestroyable,
  name: string
): void | undefined {
  if (!registeredDebounces.has(destroyable)) {
    return;
  }
  const pendingDebounces = registeredDebounces.get(destroyable);

  if (!pendingDebounces.has(name)) {
    return;
  }
  const { cancelId } = pendingDebounces.get(name)!;

  pendingDebounces.delete(name);
  cancel(cancelId);
}

function getDebouncesDisposable(
  debounces: Map<string, PendingDebounce>
): Function {
  return function() {
    if (debounces.size === 0) {
      return;
    }

    debounces.forEach(p => cancel(p.cancelId));
  };
}
