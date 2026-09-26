export function cloneDeep(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);
  if (value instanceof Map) {
    const cloned = new Map();
    seen.set(value, cloned);
    for (const [key, val] of value) {
      cloned.set(cloneDeep(key, seen), cloneDeep(val, seen));
    }
    return cloned;
  }
  if (value instanceof Set) {
    const cloned = new Set();
    seen.set(value, cloned);
    for (const val of value) {
      cloned.add(cloneDeep(val, seen));
    }
    return cloned;
  }
  if (Array.isArray(value)) {
    const cloned = new Array(value.length);
    seen.set(value, cloned);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = cloneDeep(value[i], seen);
    }
    return cloned;
  }
  if (value?.buffer instanceof ArrayBuffer) {
    return new value.constructor(value.buffer, value.byteOffset, value.length);
  }
  if (value instanceof Error) {
    const cloned = Object.create(Object.getPrototypeOf(value));
    cloned.message = value.message;
    cloned.name = value.name;
    cloned.stack = value.stack;
    seen.set(value, cloned);
    const names = Object.getOwnPropertyNames(value);
    for (let i = 0; i < names.length; i++) {
      const key = names[i];
      cloned[key] = cloneDeep(value[key], seen);
    }
    return cloned;
  }

  const cloned = Object.create(Object.getPrototypeOf(value));
  seen.set(value, cloned);

  const names = Object.getOwnPropertyNames(value);
  const symbols = Object.getOwnPropertySymbols(value);
  for (const key of names.concat(symbols)) {
    cloned[key] = cloneDeep(value[key], seen);
  }

  return cloned;
}

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
