export function mergeWith(object, source, customizer) {
  if (Array.isArray(object) && Array.isArray(source)) {
    const customResult = customizer(object, source);
    if (customResult !== undefined) {
      return customResult;
    }
    return Array.from(source);
  }

  const result = Object.assign({}, object);
  for (const key of Object.keys(source)) {
    const srcValue = source[key];
    const objValue = result[key];

    const customResult = customizer(objValue, srcValue);
    if (customResult !== undefined) {
      result[key] = customResult;
    } else if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      result[key] = mergeWith(objValue, srcValue, customizer);
    } else if (
      objValue !== null &&
      typeof objValue === "object" &&
      srcValue !== null &&
      typeof srcValue === "object"
    ) {
      result[key] = mergeWith(objValue, srcValue, customizer);
    } else if (srcValue !== undefined) {
      result[key] = srcValue;
    }
  }
  return result;
}
