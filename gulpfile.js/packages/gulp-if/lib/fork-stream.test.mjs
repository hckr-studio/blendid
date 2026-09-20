import assert from "node:assert";
import { describe, it } from "node:test";
import { ForkStream } from "./fork-stream.mjs";

describe("fork-stream", () => {
  it("should split objects into their correct streams", async () => {
    const fork = new ForkStream({
      classifier: function classify(e, done) {
        return done(null, e >= 5);
      }
    });

    const expectedA = [5, 7, 9];
    const expectedB = [1, 4, 3, 1];

    const actualA = [];
    const actualB = [];

    fork.a.on("data", (e) => {
      actualA.push(e);
    });

    fork.b.on("data", (e) => {
      actualB.push(e);
    });

    [1, 5, 7, 4, 9, 3, 1].forEach((n) => {
      fork.write(n);
    });

    fork.end();

    await new Promise((resolve) => {
      fork.on("finish", () => {
        assert.deepStrictEqual(actualA, expectedA);
        assert.deepStrictEqual(actualB, expectedB);
        resolve();
      });
    });
  });

  it("should respect backpressure", async () => {
    const fork = new ForkStream({
      highWaterMark: 2,
      classifier: function classify(e, done) {
        return done(null, e >= 5);
      }
    });

    const expected = [5, 7];
    const actual = [];

    fork.a.on("data", (e) => {
      actual.push(e);
    });

    [1, 5, 7, 4, 9, 3, 1].forEach((n) => {
      fork.write(n);
    });

    fork.end();

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        assert.deepStrictEqual(actual, expected);
        resolve();
      }, 10);

      fork.on("finish", () => {
        clearTimeout(timeout);
        throw new Error("should not finish");
      });
    });
  });

  it("should end the outputs when the input finishes", async () => {
    const fork = new ForkStream();

    let count = 0;

    // start "flowing" mode
    fork.a.resume();
    fork.b.resume();

    fork.end();

    await new Promise((resolve) => {
      // Wait for both streams to end
      const onEnd = () => {
        if (++count === 2) {
          resolve();
        }
      };
      fork.a.on("end", onEnd);
      fork.b.on("end", onEnd);
    });
  });
});
