import { assert } from '@ember/debug';
import { IMap, IDestroyable } from '../types';

/**
 * A map of instances/array of disposables. Only exported for
 * testing purposes.
 *
 * @public
 */
let registeredDisposables: IMap<Object, any> = new WeakMap();

/**
 * Test use only. Allows for swapping out the WeakMap to a Map, giving
 * us the ability to detect whether disposables have all been called.
 *
 * @private
 * @param {IMap} mapForTesting A map used to ensure correctness when testing.
 */
export function _setRegisteredDisposables(mapForTesting: IMap<Object, any>) {
  registeredDisposables = mapForTesting;
}

/**
 * Registers a new disposable function to run for an instance. Will
 * handle lazily creating a new array to store the disposables per
 * instance if one does not exist. Will additionally patch an object's
 * `destroy` hook to ensure the destroyables are run/destroyed when
 * the object is destroyed.
 *
 * @function registerDisposable
 * @public
 * @param {IDestroyable} obj the instance to store the disposable for
 * @param {Function} dispose a function that disposes of instance resources
 */
export function registerDisposable(
  obj: IDestroyable,
  dispose: Function
): void | undefined {
  assert(
    'Called `registerDisposable` where `obj` is not an object',
    typeof obj === 'object'
  );
  assert(
    'Called `registerDisposable` where `dispose` is not a function',
    typeof dispose === 'function'
  );
  assert(
    'Called `registerDisposable` on a destroyed object',
    !obj.isDestroying
  );

  let disposables: Function[] = getRegisteredDisposables(obj);

  disposables.push(dispose);
}

/**
 * Runs all disposables for a given instance.
 *
 * @function runDisposables
 * @public
 * @param {IDestroyable} obj the instance to run the disposables for
 */
export function runDisposables(obj: IDestroyable): void | undefined {
  let disposables: Function[] = registeredDisposables.get(obj);

  if (disposables === undefined) {
    return;
  }

  registeredDisposables.delete(obj);

  for (let i: number = 0; i < disposables.length; i++) {
    disposables[i]();
  }
}

function getRegisteredDisposables(obj: IDestroyable): Function[] {
  let disposables: Function[] = registeredDisposables.get(obj);

  if (disposables === undefined) {
    registeredDisposables.set(obj, (disposables = []));
  }

  return disposables;
}
