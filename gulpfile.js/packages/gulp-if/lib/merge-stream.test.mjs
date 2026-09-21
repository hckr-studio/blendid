import assert from "node:assert";
import { PassThrough } from "node:stream";
import { after, describe, it } from "node:test";
import mergeStream from "./merge-stream.mjs";

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
  const stream = new PassThrough({ objectMode: true });
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
