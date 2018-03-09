import Ember from 'ember';
import { assert } from '@ember/debug';

const { WeakMap } = Ember;

/**
 * A map of instances/array of disposables. Only exported for
 * testing purposes.
 *
 * @public
 */
let registeredDisposables = new WeakMap();

/**
 * Test use only. Allows for swapping out the WeakMap to a Map, giving
 * us the ability to detect whether disposables have all been called.
 *
 * @private
 * @param {*} mapForTesting A map used to ensure correctness when testing.
 */
export function _setRegisteredDisposables(mapForTesting) {
  registeredDisposables = mapForTesting;
}

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
  assert(
    'Called `registerDisposable` on a destroyed object',
    !obj.isDestroying
  );

  let disposables = getRegisteredDisposables(obj);

  disposables.push(dispose);
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
  }
}

function getRegisteredDisposables(obj) {
  let arr = registeredDisposables.get(obj);

  if (arr === undefined) {
    registeredDisposables.set(obj, (arr = []));
  }

  return arr;
}
