import Ember from 'ember';
import { assert } from '@ember/debug';
import { WILL_DESTROY_PATCHED } from '../utils/flags';

const { WeakMap } = Ember;

/**
 * A map of instances/array of disposables. Only exported for
 * testing purposes.
 *
 * @public
 */
export let registeredDisposables = new WeakMap();

/**
 * Registers a new disposable function to run for an instance. Will
 * handle lazily creating a new array to store the disposables per
 * instance if one does not exist. Will additionally patch an object's
 * `willDestroy` hook to ensure the destroyables are run/destroyed when
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
  let disposable = _toDisposable(dispose);

  disposables.push(disposable);

  _setupWillDestroy(obj);

  return disposable;
}

/**
 * Runs all disposables for a given instance.
 *
 * @public
 * @param {*} obj the instance to run the disposables for
 */
export function runDisposables(obj) {
  let disposables = registeredDisposables.get(obj);

  if (!disposables) {
    return;
  }

  for (let i = 0, l = disposables.length; i < l; i++) {
    let disposable = disposables.pop();

    disposable.dispose();
  }
}

function getRegisteredDisposables(obj) {
  let arr = registeredDisposables.get(obj);

  if (!arr) {
    registeredDisposables.set(obj, (arr = []));
  }

  return arr;
}

function _toDisposable(doDispose) {
  return {
    dispose() {
      if (!this.disposed) {
        this.disposed = true;
        doDispose();
      }
    },
    disposed: false,
  };
}

function _setupWillDestroy(obj) {
  if (!obj.willDestroy) {
    return;
  }

  if (!obj[WILL_DESTROY_PATCHED]) {
    let originalWillDestroy = obj.willDestroy;

    obj.willDestroy = function() {
      runDisposables(obj);

      originalWillDestroy.apply(obj, arguments);
    };
    obj[WILL_DESTROY_PATCHED] = true;
  }
}
