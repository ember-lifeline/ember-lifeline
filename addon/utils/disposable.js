import { assert } from '@ember/debug';
import { WILL_DESTROY_PATCHED } from '../utils/flags';

export let registeredDisposables = new WeakMap();

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
