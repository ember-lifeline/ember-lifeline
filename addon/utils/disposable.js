import Ember from 'ember';
import { assert } from '@ember/debug';

const { WeakMap } = Ember;

let totalRegisteredDisposables = 0;

/**
 * A map of instances/array of disposables. Only exported for
 * testing purposes.
 *
 * @public
 */
export const registeredDisposables = new WeakMap();

/**
 * Registers a new disposable function to run for an instance. Will
 * handle lazily creating a new array to store the disposables per
 * instance if one does not exist. Will additionally patch an object's
 * `destroy` hook to ensure the destroyables are run/destroyed when
 * the object is destroyed.
 *
 * @public
 * @param {*} obj the instance to store the disposable for
 * @param {*} dispose a function that disposes of instance resources
 * @returns a disposable object, which wraps the passed in `dispose` function
 */
export function registerDisposable(obj, dispose) {
  assert(
    'Called `registerDisposable` where `obj` is not an object',
    typeof obj === 'object'
  );
  assert(
    'Called `registerDisposable` where `dispose` is not a function',
    typeof dispose === 'function'
  );

  let disposables = getRegisteredDisposables(obj);

  disposables.push(dispose);
  totalRegisteredDisposables++;
}

/**
 * Runs all disposables for a given instance.
 *
 * @public
 * @param {*} obj the instance to run the disposables for
 */
export function runDisposables(obj) {
  let disposables = registeredDisposables.get(obj);

  if (disposables === undefined) {
    return;
  }

  registeredDisposables.delete(obj);

  for (let i = 0; i < disposables.length; i++) {
    disposables[i]();
    totalRegisteredDisposables--;
  }
}

/**
  Checks whether all registered disposables have been run or not.

  Run means that each disposable has been executed via the `runDisposables`
  function against an object instance.

  @public
  @returns {boolean} `true` if all disposables are run, `false` otherwise
*/
export function hasRunAllDisposables() {
  return totalRegisteredDisposables === 0;
}

function getRegisteredDisposables(obj) {
  let arr = registeredDisposables.get(obj);

  if (arr === undefined) {
    registeredDisposables.set(obj, (arr = []));
  }

  return arr;
}
