import assert from "node:assert";
import { describe, it } from "node:test";
import { cloneDeep, mergeWith } from "./object.mjs";

function replaceArrays(objValue, srcValue) {
  if (Array.isArray(objValue)) {
    return srcValue;
  }
}

const noop = () => undefined;
const identity = (value) => value;

describe("object", () => {
  describe("mergeWith", () => {
    it("should preserve array type when merging arrays directly", () => {
      const result = mergeWith([1, 2, 3], [4, 5, 6], replaceArrays);
      assert.ok(Array.isArray(result), "Result should be an array");
      assert.deepStrictEqual(
        result,
        [4, 5, 6],
        "Array values should be replaced"
      );
    });

    it("should handle nested arrays in objects", () => {
      const result = mergeWith(
        { arr: [1, 2, 3] },
        { arr: [4, 5, 6] },
        replaceArrays
      );
      assert.ok(
        Array.isArray(result.arr),
        "Nested array should remain an array"
      );
      assert.deepStrictEqual(
        result.arr,
        [4, 5, 6],
        "Nested array values should be replaced"
      );
    });

    it("should handle deeply nested arrays", () => {
      const result = mergeWith(
        { a: { b: { arr: [1, 2, 3] } } },
        { a: { b: { arr: [4, 5, 6] } } },
        replaceArrays
      );
      assert.ok(
        Array.isArray(result.a.b.arr),
        "Deeply nested array should remain an array"
      );
      assert.deepStrictEqual(
        result.a.b.arr,
        [4, 5, 6],
        "Deeply nested array values should be replaced"
      );
    });

    it("should handle arrays with object elements", () => {
      const result = mergeWith(
        { data: [{ x: 1 }, { y: 2 }] },
        { data: [{ x: 10 }, { y: 20 }] },
        replaceArrays
      );
      assert.ok(Array.isArray(result.data), "Array should remain an array");
      assert.deepStrictEqual(
        result.data,
        [{ x: 10 }, { y: 20 }],
        "Array elements should be replaced"
      );
    });

    it("should handle arrays at the same nested level", () => {
      const result = mergeWith(
        { nested: [1, 2, 3] },
        { nested: [4, 5, 6] },
        replaceArrays
      );
      assert.ok(
        Array.isArray(result.nested),
        "Nested array should remain an array"
      );
      assert.deepStrictEqual(
        result.nested,
        [4, 5, 6],
        "Nested array values should be replaced"
      );
    });

    it("should handle arrays added to object from source", () => {
      const result = mergeWith(
        { existing: "value" },
        { arr: [1, 2, 3] },
        replaceArrays
      );
      assert.ok(Array.isArray(result.arr), "New array should be an array");
      assert.deepStrictEqual(
        result.arr,
        [1, 2, 3],
        "New array values should be correct"
      );
    });

    it("should handle empty arrays", () => {
      const result = mergeWith({ arr: [] }, { arr: [1, 2] }, replaceArrays);
      assert.ok(Array.isArray(result.arr), "Array should remain an array");
      assert.deepStrictEqual(
        result.arr,
        [1, 2],
        "Array values should be replaced"
      );
    });

    it("should handle arrays with mixed types", () => {
      const result = mergeWith(
        { arr: [1, "two", { three: 3 }] },
        { arr: [4, "five", { six: 6 }] },
        replaceArrays
      );
      assert.ok(Array.isArray(result.arr), "Array should remain an array");
      assert.deepStrictEqual(
        result.arr,
        [4, "five", { six: 6 }],
        "Array values should be replaced"
      );
    });

    it("should handle merging when customizer returns undefined", () => {
      const actual = mergeWith({ a: { b: [1, 1] } }, { a: { b: [0] } }, noop);
      assert.deepStrictEqual(actual, { a: { b: [0] } });
    });

    it("should merge arrays with identity customizer", () => {
      const result = mergeWith([], [undefined], identity);
      // identity returns first argument, so customizer([], [undefined]) returns []
      assert.deepStrictEqual(result, []);
    });

    it("should clone sources when customizer returns undefined", () => {
      const source1 = { a: { b: { c: 1 } } };
      const source2 = { a: { b: { d: 2 } } };

      mergeWith(mergeWith({}, source1, noop), source2, noop);
      assert.deepStrictEqual(source1.a.b, { c: 1 });
    });

    it("should defer to customizer for non-undefined results", () => {
      const actual = mergeWith(
        { a: { b: [0, 1] } },
        { a: { b: [2] } },
        (a, b) => (Array.isArray(a) ? a.concat(b) : undefined)
      );

      assert.deepStrictEqual(actual, { a: { b: [0, 1, 2] } });
    });

    it("should overwrite primitives with source object clones", () => {
      const actual = mergeWith({ a: 0 }, { a: { b: ["c"] } }, (a, b) =>
        Array.isArray(a) ? a.concat(b) : undefined
      );

      assert.deepStrictEqual(actual, { a: { b: ["c"] } });
    });

    it("should handle array concatenation for each sibling property", () => {
      const array = ["b", "c"];
      const object = { a: ["a"] };
      const source = { a: array, b: array };

      const actual = mergeWith(object, source, (a, b) =>
        Array.isArray(a) ? a.concat(b) : undefined
      );

      assert.deepStrictEqual(actual, { a: ["a", "b", "c"], b: ["b", "c"] });
    });
  });

  describe("cloneDeep", () => {
    it("should clone primitives", () => {
      assert.strictEqual(cloneDeep(null), null);
      assert.strictEqual(cloneDeep(undefined), undefined);
      assert.strictEqual(cloneDeep(0), 0);
      assert.strictEqual(cloneDeep("string"), "string");
      assert.strictEqual(cloneDeep(true), true);
      assert.strictEqual(cloneDeep(false), false);
    });

    it("should clone simple arrays", () => {
      const arr = [1, 2, 3];
      const cloned = cloneDeep(arr);
      assert.deepStrictEqual(cloned, [1, 2, 3]);
      assert.notStrictEqual(cloned, arr);
    });

    it("should clone nested arrays", () => {
      const arr = [
        [1, 2],
        [3, 4]
      ];
      const cloned = cloneDeep(arr);
      assert.deepStrictEqual(cloned, [
        [1, 2],
        [3, 4]
      ]);
      assert.notStrictEqual(cloned, arr);
      assert.notStrictEqual(cloned[0], arr[0]);
    });

    it("should clone simple objects", () => {
      const obj = { a: 1, b: 2 };
      const cloned = cloneDeep(obj);
      assert.deepStrictEqual(cloned, { a: 1, b: 2 });
      assert.notStrictEqual(cloned, obj);
    });

    it("should clone nested objects", () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = cloneDeep(obj);
      assert.deepStrictEqual(cloned, { a: { b: { c: 1 } } });
      assert.notStrictEqual(cloned, obj);
      assert.notStrictEqual(cloned.a, obj.a);
      assert.notStrictEqual(cloned.a.b, obj.a.b);
    });

    it("should clone mixed structures", () => {
      const obj = { arr: [1, { nested: true }], prop: "value" };
      const cloned = cloneDeep(obj);
      assert.deepStrictEqual(cloned, {
        arr: [1, { nested: true }],
        prop: "value"
      });
      assert.notStrictEqual(cloned, obj);
      assert.notStrictEqual(cloned.arr, obj.arr);
      assert.notStrictEqual(cloned.arr[1], obj.arr[1]);
    });

    it("should handle Date objects", () => {
      const date = new Date("2023-01-01");
      const cloned = cloneDeep(date);
      assert.ok(cloned instanceof Date);
      assert.strictEqual(cloned.getTime(), date.getTime());
      assert.notStrictEqual(cloned, date);
    });

    it("should handle RegExp objects", () => {
      const regex = /test/gi;
      const cloned = cloneDeep(regex);
      assert.ok(cloned instanceof RegExp);
      assert.strictEqual(cloned.source, regex.source);
      assert.strictEqual(cloned.flags, regex.flags);
      assert.notStrictEqual(cloned, regex);
    });

    it("should handle Map objects", () => {
      const map = new Map([
        ["key", "value"],
        [1, { nested: true }]
      ]);
      const cloned = cloneDeep(map);
      assert.ok(cloned instanceof Map);
      assert.strictEqual(cloned.get("key"), "value");
      assert.deepStrictEqual(cloned.get(1), { nested: true });
      assert.notStrictEqual(cloned, map);
      assert.notStrictEqual(cloned.get(1), map.get(1));
    });

    it("should handle Set objects", () => {
      const set = new Set([1, 2, { nested: true }]);
      const cloned = cloneDeep(set);
      assert.ok(cloned instanceof Set);
      assert.ok(cloned.has(1));
      assert.ok(cloned.has(2));
      assert.deepStrictEqual(
        [...cloned].find((x) => typeof x === "object"),
        { nested: true }
      );
      assert.notStrictEqual(cloned, set);
    });

    it("should handle circular references", () => {
      const obj = { a: 1 };
      obj.self = obj;
      const cloned = cloneDeep(obj);
      assert.strictEqual(cloned.a, 1);
      assert.notStrictEqual(cloned, obj);
      assert.strictEqual(cloned.self, cloned);
    });

    it("should handle TypedArrays", () => {
      const typedArray = new Uint8Array([1, 2, 3, 4]);
      const cloned = cloneDeep(typedArray);
      assert.ok(cloned instanceof Uint8Array);
      assert.deepStrictEqual(Array.from(cloned), [1, 2, 3, 4]);
      assert.notStrictEqual(cloned, typedArray);
    });

    it("should handle Buffer", () => {
      const buffer = Buffer.from("test");
      const cloned = cloneDeep(buffer);
      assert.ok(Buffer.isBuffer(cloned));
      assert.strictEqual(cloned.toString(), "test");
      assert.notStrictEqual(cloned, buffer);
    });

    it("should handle Error objects", () => {
      const error = new Error("test error");
      error.code = 123;
      const cloned = cloneDeep(error);
      assert.ok(cloned instanceof Error);
      assert.strictEqual(cloned.message, "test error");
      assert.strictEqual(cloned.code, 123);
      assert.notStrictEqual(cloned, error);
    });

    it("should preserve object prototype", () => {
      function CustomClass() {
        this.prop = "value";
      }
      const obj = new CustomClass();
      const cloned = cloneDeep(obj);
      assert.ok(cloned instanceof CustomClass);
      assert.strictEqual(cloned.prop, "value");
      assert.notStrictEqual(cloned, obj);
    });

    it("should clone non-enumerable properties", () => {
      const obj = { a: 1 };
      Object.defineProperty(obj, "b", { value: 2, enumerable: false });
      const cloned = cloneDeep(obj);
      assert.strictEqual(cloned.a, 1);
      assert.strictEqual(cloned.b, 2);
    });

    it("should clone Symbol properties", () => {
      const sym = Symbol("test");
      const obj = { [sym]: "value", a: 1 };
      const cloned = cloneDeep(obj);
      assert.strictEqual(cloned[sym], "value");
      assert.strictEqual(cloned.a, 1);
    });

    it("should handle arrays with holes", () => {
      const arr = [1, , 3];
      const cloned = cloneDeep(arr);
      assert.strictEqual(cloned[0], 1);
      assert.strictEqual(cloned[1], undefined);
      assert.strictEqual(cloned[2], 3);
      assert.notStrictEqual(cloned, arr);
    });
  });
});
