import { registerDisposable } from './disposable';
/**
 * Lazy allocates a value in a WeakMap
 *
 * @export
 * @param {WeakMap} weakMap
 * @param {Object} obj
 * @param {Object} Type
 * @param {String} propertyName
 * @param {any} Type
 * @public
 * @returns the value of the newly allocated property
 */

export default function getOrAllocate(weakMap, obj, Type, getDisposable) {
  let value = weakMap.get(obj);

  if (!value) {
    weakMap.set(obj, (value = new Type()));

    registerDisposable(obj, getDisposable(value));
  }

  return value;
}
