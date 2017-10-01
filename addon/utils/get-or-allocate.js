
/**
 * Lazy allocates a property on an object
 *
 * @export
 * @param {Object} obj
 * @param {String} propertyName
 * @param {any} value
 * @public
 * @returns the value of the newly allocated property
 */
export default function getOrAllocate(obj, propertyName, value) {
  if (!obj[propertyName]) {
    obj[propertyName] = value;
  }

  return obj[propertyName];
}
