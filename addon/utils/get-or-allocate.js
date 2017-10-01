
export default function getOrAllocate(obj, propertyName, value) {
  if (!obj[propertyName]) {
    obj[propertyName] = value;
  }

  return obj[propertyName];
}
