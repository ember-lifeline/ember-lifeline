import { assert, deprecate } from '@ember/debug';
import { IDestroyable } from '../types';
import { registerDestructor } from 'ember-destroyable-polyfill';
import { Destructor } from 'ember-destroyable-polyfill/-internal/destructors';

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

  deprecate(
    'ember-lifeline registerDisposable is deprecated. Please import registerDestructor from @ember/destroyable',
    false,
    {
      id: 'ember-lifeline-deprecated-register-disposable',
      until: '7.0.0',
    }
  );

  registerDestructor(obj, <Destructor<IDestroyable>>dispose);
}

/**
 * Runs all disposables for a given instance.
 *
 * @function runDisposables
 * @public
 * @param {IDestroyable} obj the instance to run the disposables for
 */
export function runDisposables(): void | undefined {
  deprecate(
    'ember-lifeline runDisposables is deprecated. Explicitly invoking disposables is no longer required.',
    false,
    {
      id: 'ember-lifeline-deprecated-run-disposable',
      until: '7.0.0',
    }
  );
}
