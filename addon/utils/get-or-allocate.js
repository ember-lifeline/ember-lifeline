
/**
 * Lazy allocates a property on an object
 *
 * @export
 * @param {Object} obj
 * @param {String} propertyName
 * @param {any} Type
 * @public
 * @returns the value of the newly allocated property
 */
export default function getOrAllocate(obj, propertyName, Type) {
  if (!obj[propertyName]) {
    obj[propertyName] = new Type();
  }

  return obj[propertyName];
}
