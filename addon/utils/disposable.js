import { assert } from '@ember/debug';
import getOrAllocate from '../utils/get-or-allocate';

export function registerDisposable(obj, dispose) {
  assert(
    'Called `registerDisposable` where `dispose` is not a function',
    typeof dispose === 'function'
  );

  let disposables = getOrAllocate(obj, '_registeredDisposables', Array);
  let disposable = _toDisposable(dispose);

  disposables.push(disposable);

  _setupWillDestroy(obj);

  return disposable;
}

export function runDisposables(disposables) {
  assert(
    'Called `runDisposables` where `disposables` is not an array of disposables',
    !!disposables
  );

  for (let i = 0, l = disposables.length; i < l; i++) {
    let disposable = disposables.pop();

    disposable.dispose();
  }
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

  if (!obj.willDestroy.patched && obj._registeredDisposables) {
    let originalWillDestroy = obj.willDestroy;

    obj.willDestroy = function() {
      runDisposables(obj._registeredDisposables);

      originalWillDestroy.apply(obj, arguments);
    };
    obj.willDestroy.patched = true;
  }
}
