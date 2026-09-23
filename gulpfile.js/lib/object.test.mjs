import assert from "node:assert";
import { describe, it } from "node:test";
import { mergeWith } from "./object.mjs";

function replaceArrays(objValue, srcValue) {
  if (Array.isArray(objValue)) {
    return srcValue;
  }
}

const noop = () => undefined;
const identity = (value) => value;

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
    assert.ok(Array.isArray(result.arr), "Nested array should remain an array");
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

  describe("mergeWith customizer behavior", () => {
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
});
