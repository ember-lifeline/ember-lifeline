import { assert } from '@ember/debug';

export let registeredDisposables = new WeakMap();

let registeredTimers = new WeakMap();

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

export function runDisposables(disposables) {
  if (!disposables) {
    return;
  }

  for (let i = 0, l = disposables.length; i < l; i++) {
    let disposable = disposables.pop();

    disposable.dispose();
  }
}

function getRegisteredDisposables(obj) {
  let disposables = registeredDisposables.get(obj);

  if (!disposables) {
    registeredDisposables.set(obj, (disposables = []));
  }

  return disposables;
}

export function getPendingTimers(obj) {
  let timers = registeredTimers.get(obj);

  if (!timers) {
    registeredTimers.set(obj, (timers = []));
  }

  return timers;
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

  if (!obj.willDestroy.patched && registeredDisposables.get(obj)) {
    let originalWillDestroy = obj.willDestroy;

    obj.willDestroy = function() {
      runDisposables(registeredDisposables.get(obj));

      originalWillDestroy.apply(obj, arguments);
    };
    obj.willDestroy.patched = true;
  }
}
