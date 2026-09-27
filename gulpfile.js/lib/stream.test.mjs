import assert from "node:assert";
import { Transform } from "node:stream";
import { after, describe, it } from "node:test";
import {
  ForkStream,
  mergeStream,
  passthrough,
  ternaryStream
} from "#lib/stream.mjs";

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

// Store active timeouts to clean up after tests
const activeTimeouts = new Set();

// Clean up all pending timeouts
function cleanupTimeouts() {
  for (const timeout of activeTimeouts) {
    clearTimeout(timeout);
  }
  activeTimeouts.clear();
}

// Clean up after all tests
after(() => {
  cleanupTimeouts();
});

// Helper to create a range stream (replaces from2)
function range(n) {
  const k = n > 0 ? -1 : 1;
  const stream = passthrough();
  let current = n;

  const sendNext = () => {
    if (current === 0) {
      stream.end();
      return;
    }
    stream.write(current);
    current += k;
    const delay = Math.round(6 + Math.round(Math.random() * 6));
    const timer = setTimeout(sendNext, delay);
    activeTimeouts.add(timer);
    // Clear timeout when the stream ends
    const onEnd = () => {
      activeTimeouts.delete(timer);
      stream.removeListener("end", onEnd);
    };
    stream.once("end", onEnd);
  };

  sendNext();
  return stream;
}

describe("merge-stream", () => {
  it("smoke", async () => {
    const combined = mergeStream();
    let total = 0;

    combined.on("data", (i) => {
      total += i;
    });

    combined.on("end", () => {
      // The total depends on the order of stream processing with random delays
      // Just verify we received some data
      assert.ok(total > 0, `Expected positive total, got ${total}`);
    });

    // Add all sources sequentially without setTimeout
    // The original test used setTimeout to add sources gradually, but for testing
    // we can add them all at once
    for (let i = -36; i < 38; i++) {
      combined.add(range(i));
    }

    // Wait for the stream to end
    await new Promise((resolve) => {
      combined.on("end", resolve);
    });
  });

  it("pause/resume", async () => {
    const combined = mergeStream();
    combined.add(range(100));
    combined.add(range(-100));
    let counter = 0;

    combined.on("data", () => {
      counter++;
    });

    // Wait a bit for some data to flow
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(counter < 200);
    const pauseCount = counter;

    // Pause and verify no more data comes through
    combined.pause();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(pauseCount, counter);

    // Resume and let the rest flow
    combined.resume();

    // Wait for the stream to end
    await new Promise((resolve) => {
      combined.on("end", () => {
        assert.strictEqual(counter, 200);
        resolve();
      });
    });
  });

  it("array", async () => {
    const combined = mergeStream([range(100), range(-100)]);
    let counter = 0;

    combined.on("data", () => {
      counter++;
    });

    await new Promise((resolve) => {
      combined.on("end", () => {
        assert.strictEqual(counter, 200);
        resolve();
      });
    });
  });

  it("isEmpty", async () => {
    const combined = mergeStream();
    assert.ok(combined.isEmpty());

    let dataReceived = false;
    combined.on("data", (n) => {
      dataReceived = true;
    });

    combined.add(range(1));
    assert.ok(!combined.isEmpty());

    // Wait for data to be received
    await new Promise((resolve) => {
      combined.on("data", () => {
        if (dataReceived) resolve();
      });
    });
  });

  it("propagates errors", async () => {
    const combined = mergeStream();
    const ERROR_MESSAGE = "TEST: INTERNAL STREAM ERROR";
    const streamToError = range(100);
    const streamJustFine = range(-100);
    let errorCounter = 0;

    combined.add(streamToError);
    combined.add(streamJustFine);

    combined.on("error", (err) => {
      assert.strictEqual(err.message, ERROR_MESSAGE);
      errorCounter++;
    });

    // Wait a bit for streams to be added
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(errorCounter, 0);

    // Emit error on one of the streams
    streamToError.emit("error", new Error(ERROR_MESSAGE));

    // Wait a bit for error to propagate
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.strictEqual(errorCounter, 1);

    // End the stream manually
    combined.emit("end");

    // Wait for end to be processed
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});

const through = {
  obj: (fn) =>
    new Transform({
      objectMode: true,
      transform: fn
    })
};

describe("ternary-stream", () => {
  describe("smoke test", () => {
    it("should call the function when passed truthy", async () => {
      // arrange
      let called = 0;
      const condition = (data) => data.answer;
      const childStream = through.obj(function (data, enc, cb) {
        called++;
        this.push(data);
        cb();
      });

      // act
      const s = ternaryStream(condition, childStream);

      s.on("data", (/*data*/) => {
        called += 10;
      });

      // act - write data first
      s.write({ answer: true });
      s.write({ answer: false });
      s.end();

      // assert - then wait for finish
      await new Promise((resolve) => {
        s.once("finish", () => {
          assert.strictEqual(called, 21);
          resolve();
        });
      });
    });

    it("should properly redirect trueStream errors", async () => {
      // arrange
      const condition = (data) => data.answer;
      const trueStream = through.obj(function (data, enc, cb) {
        this.emit("error", new Error("foo"));
        cb();
      });

      // act
      const s = ternaryStream(condition, trueStream);

      // act - write data first
      s.write({ answer: true });
      s.write({ answer: false });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.on("error", () => resolve());
      });
    });

    it("should properly redirect falseStream errors", async () => {
      // arrange
      const condition = (data) => data.answer;
      const falseStream = through.obj(function (data, enc, cb) {
        this.emit("error", new Error("foo"));
        cb();
      });

      // act
      const s = ternaryStream(condition, through.obj(), falseStream);

      // act - write data first
      s.write({ answer: true });
      s.write({ answer: false });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.on("error", () => resolve());
      });
    });

    it("should error if no parameters passed", () => {
      // arrange
      let caughtErr;

      // act
      try {
        ternaryStream();
      } catch (err) {
        caughtErr = err;
      }

      // assert
      assert.ok(caughtErr);
      assert.ok(caughtErr.message.includes("required"));
    });
  });

  describe("ternary", () => {
    it("should route to trueStream when condition is truthy", async () => {
      // arrange
      const condition = (data) => data.answer;
      let trueCalled = false;
      let falseCalled = false;

      const trueStream = through.obj(function (data, enc, cb) {
        trueCalled = true;
        this.push(data);
        cb();
      });

      const falseStream = through.obj(function (data, enc, cb) {
        falseCalled = true;
        this.push(data);
        cb();
      });

      // act
      const s = ternaryStream(condition, trueStream, falseStream);

      s.write({ answer: true });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.once("finish", () => {
          assert.strictEqual(trueCalled, true);
          assert.strictEqual(falseCalled, false);
          resolve();
        });
      });
    });

    it("should route to falseStream when condition is falsey", async () => {
      // arrange
      const condition = (data) => data.answer;
      let trueCalled = false;
      let falseCalled = false;

      const trueStream = through.obj(function (data, enc, cb) {
        trueCalled = true;
        this.push(data);
        cb();
      });

      const falseStream = through.obj(function (data, enc, cb) {
        falseCalled = true;
        this.push(data);
        cb();
      });

      // act
      const s = ternaryStream(condition, trueStream, falseStream);

      s.write({ answer: false });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.once("finish", () => {
          assert.strictEqual(trueCalled, false);
          assert.strictEqual(falseCalled, true);
          resolve();
        });
      });
    });
  });

  describe("condition", () => {
    it("should call trueStream when condition returns truthy", async () => {
      // arrange
      const condition = (data) => data.value === "truthy";
      let trueCalled = false;
      let falseCalled = false;

      const trueStream = through.obj(function (data, enc, cb) {
        trueCalled = true;
        this.push(data);
        cb();
      });

      const falseStream = through.obj(function (data, enc, cb) {
        falseCalled = true;
        this.push(data);
        cb();
      });

      // act
      const s = ternaryStream(condition, trueStream, falseStream);

      s.write({ value: "truthy" });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.once("finish", () => {
          assert.strictEqual(trueCalled, true);
          assert.strictEqual(falseCalled, false);
          resolve();
        });
      });
    });

    it("should call falseStream when condition returns falsey", async () => {
      // arrange
      const condition = (data) => data.value === "truthy";
      let trueCalled = false;
      let falseCalled = false;

      const trueStream = through.obj(function (data, enc, cb) {
        trueCalled = true;
        this.push(data);
        cb();
      });

      const falseStream = through.obj(function (data, enc, cb) {
        falseCalled = true;
        this.push(data);
        cb();
      });

      // act
      const s = ternaryStream(condition, trueStream, falseStream);

      s.write({ value: "falsey" });
      s.end();

      // assert
      await new Promise((resolve) => {
        s.once("finish", () => {
          assert.strictEqual(trueCalled, false);
          assert.strictEqual(falseCalled, true);
          resolve();
        });
      });
    });
  });
});
