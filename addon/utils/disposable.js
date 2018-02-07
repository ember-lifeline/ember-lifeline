import Ember from 'ember';
import { assert } from '@ember/debug';

const { WeakMap } = Ember;

export const DESTROY_PATCHED = `__LIFELINE_DESTROY_PATCHED_${Math.floor(
  Math.random() * new Date()
)}`;

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
  assert(
    'Called `registerDisposable` without implementing `destroy` that calls `runDisposables`',
    !!obj[DESTROY_PATCHED]
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
