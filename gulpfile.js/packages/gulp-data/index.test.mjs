import assert from "node:assert";
import { Transform } from "node:stream";
import { describe, test } from "node:test";
import File from "vinyl";
import data from "./index.mjs";

function streamToPromise(stream, file) {
  return new Promise((resolve, reject) => {
    let result = null;
    stream
      .on("error", (err) => {
        reject(err);
      })
      .on("data", (newFile) => {
        result = newFile;
      })
      .on("end", () => {
        resolve(result);
      });
    stream.end(file);
  });
}

describe("gulp-data", () => {
  test("should handle exceptions with the callback present", async () => {
    try {
      await streamToPromise(
        data(() => {
          throw new Error("potato");
        }),
        new File({ contents: Buffer.from("") })
      );
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err);
      assert.ok(err.message);
    }
  });

  test("should handle exceptions without the callback present", async () => {
    try {
      await streamToPromise(
        data(() => {
          throw new Error("potato");
        }),
        new File({ contents: Buffer.from("") })
      );
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err);
      assert.ok(err.message);
    }
  });

  test("should produce errors when data handler has error", async () => {
    try {
      await streamToPromise(
        data((file, cb) => {
          cb({ type: "test-error" });
        }),
        new File({ contents: Buffer.from("") })
      );
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err);
      assert.ok(err.message);
      assert.ok(err.message.type);
      assert.equal(err.message.type, "test-error");
    }
  });

  test("should produce errors when promises are rejected", async () => {
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject({ type: "test-error" });
      }, 20);
    });

    try {
      await streamToPromise(
        data(promise),
        new File({ contents: Buffer.from("") })
      );
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err);
      assert.ok(err.message);
      assert.ok(err.message.type);
      assert.equal(err.message.type, "test-error");
    }
  });

  test("should work with returned values", async () => {
    const result = await streamToPromise(
      data(() => ({ message: "Hello" })),
      new File({ contents: Buffer.from("") })
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, "Hello");
  });

  test("should support empty files", async () => {
    const result = await streamToPromise(
      data(() => ({ message: "Hello" })),
      new File()
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, "Hello");
  });

  test("should support streams", async () => {
    const result = await streamToPromise(
      data(() => ({ message: "Hello" })),
      new File({ contents: new Transform() })
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, "Hello");
  });

  test("should work with promises that resolve", async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: "Hello" });
      }, 20);
    });

    const result = await streamToPromise(
      data(promise),
      new File({ contents: Buffer.from("") })
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, "Hello");
  });

  test("should work with mapped promises", async () => {
    const result = await streamToPromise(
      data((file) => {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            resolve({ message: file.path });
          }, 20);
        });
        return promise;
      }),
      new File({
        path: "test/fixtures/hello.txt",
        contents: Buffer.from("")
      })
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, result.path);
  });

  test("should produce expected file data property", async () => {
    const result = await streamToPromise(
      data((file, cb) => {
        cb(undefined, {
          message: "Hello"
        });
      }),
      new File({ contents: Buffer.from("") })
    );
    assert.ok(result);
    assert.ok(result.data);
    assert.equal(result.data.message, "Hello");
  });
});
