import assert from "node:assert";
import net from "node:net";
import { PassThrough, Transform, Writable } from "node:stream";
import { describe, it } from "node:test";
import duplexify from "./duplexify.mjs";

const HELLO_WORLD = Buffer.from("hello world", "utf-8");

// Helper to collect stream data
const collectStream = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

describe("duplexify", () => {
  it("passthrough", async () => {
    const pt = new PassThrough();
    const dup = duplexify(pt, pt);

    dup.end("hello world");

    const data = await collectStream(dup);
    assert.strictEqual(data.toString(), "hello world", "same in as out");
  });

  it("passthrough + double end", async () => {
    const pt = new PassThrough();
    const dup = duplexify(pt, pt);

    dup.end("hello world");
    dup.end();

    const data = await collectStream(dup);
    assert.strictEqual(data.toString(), "hello world", "same in as out");
  });

  it("async passthrough + end", async () => {
    const pt = new PassThrough();
    const dup = duplexify(pt, pt);

    dup.write("hello ");
    dup.write("world");
    dup.end();

    const data = await collectStream(dup);
    assert.strictEqual(data.toString(), "hello world", "same in as out");
  });

  it("duplex", async () => {
    const readExpected = ["read-a", "read-b", "read-c"];
    const writeExpected = ["write-a", "write-b", "write-c"];

    const readable = new PassThrough({ objectMode: true });
    const writable = new PassThrough({ objectMode: true });

    const dup = duplexify.obj(writable, readable);

    readExpected.forEach((data) => {
      readable.write(data);
    });
    readable.end();

    const writeResults = [];
    writable.on("data", (data) => {
      writeResults.push(data);
    });

    writeExpected.forEach((data) => {
      dup.write(data);
    });
    dup.end();

    const data = [];
    for await (const chunk of dup) {
      data.push(chunk);
    }

    // Check read data
    assert.strictEqual(data.length, 3);
    assert.strictEqual(data[0], "read-a");
    assert.strictEqual(data[1], "read-b");
    assert.strictEqual(data[2], "read-c");

    // Check write data
    assert.strictEqual(writeResults.length, 3);
    assert.strictEqual(writeResults[0], "write-a");
    assert.strictEqual(writeResults[1], "write-b");
    assert.strictEqual(writeResults[2], "write-c");
  });

  it("async", async () => {
    const dup = duplexify();
    const pt = new PassThrough();

    const dataPromise = collectStream(dup);

    dup.write("i");
    dup.write(" was ");
    dup.end("async");

    setTimeout(() => {
      dup.setWritable(pt);
      setTimeout(() => {
        dup.setReadable(pt);
      }, 50);
    }, 50);

    const data = await dataPromise;
    assert.strictEqual(data.toString(), "i was async", "same in as out");
  });

  it("destroy", async () => {
    let writeDestroyed = false;
    const write = new PassThrough();
    const originalDestroy = write.destroy.bind(write);
    write.destroy = () => {
      writeDestroyed = true;
      originalDestroy();
    };

    let readDestroyed = false;
    const read = new PassThrough();
    const originalReadDestroy = read.destroy.bind(read);
    read.destroy = () => {
      readDestroyed = true;
      originalReadDestroy();
    };

    const dup = duplexify(write, read);

    dup.destroy();
    dup.destroy(); // should only work once
    dup.end();

    // Wait for async destroy to complete
    await new Promise((resolve) => dup.on("close", resolve));

    assert.ok(writeDestroyed, "write destroyed");
    assert.ok(readDestroyed, "read destroyed");
  });

  it("destroy both", async () => {
    let writeDestroyed = false;
    const write = new PassThrough();
    const originalDestroy = write.destroy.bind(write);
    write.destroy = () => {
      writeDestroyed = true;
      originalDestroy();
    };

    let readDestroyed = false;
    const read = new PassThrough();
    const originalReadDestroy = read.destroy.bind(read);
    read.destroy = () => {
      readDestroyed = true;
      originalReadDestroy();
    };

    const dup = duplexify(write, read);

    dup.destroy();
    dup.destroy(); // should only work once

    // Wait for async destroy to complete
    await new Promise((resolve) => dup.on("close", resolve));

    assert.ok(writeDestroyed, "write destroyed");
    assert.ok(readDestroyed, "read destroyed");
  });

  it("bubble read errors", async () => {
    let errorReceived = false;
    let closeReceived = false;

    const write = new PassThrough();
    const read = new PassThrough();
    const dup = duplexify(write, read);

    dup.on("error", (err) => {
      assert.strictEqual(err.message, "read-error", "received read error");
      errorReceived = true;
    });
    dup.on("close", () => {
      closeReceived = true;
    });

    read.emit("error", new Error("read-error"));
    write.emit("error", new Error("write-error")); // only emit first error

    // Wait for error to propagate
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(errorReceived, "error received");
    assert.ok(closeReceived, "close emitted");
  });

  it("bubble write errors", async () => {
    let errorReceived = false;
    let closeReceived = false;

    const write = new PassThrough();
    const read = new PassThrough();
    const dup = duplexify(write, read);

    dup.on("error", (err) => {
      assert.strictEqual(err.message, "write-error", "received write error");
      errorReceived = true;
    });
    dup.on("close", () => {
      closeReceived = true;
    });

    write.emit("error", new Error("write-error"));
    read.emit("error", new Error("read-error")); // only emit first error

    // Wait for error to propagate
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(errorReceived, "error received");
    assert.ok(closeReceived, "close emitted");
  });

  it("bubble errors from write()", async () => {
    let errored = false;
    let closeEmitted = false;
    let errorEmitted = false;

    const dup = duplexify(
      new Writable({
        write(chunk, enc, next) {
          next(new Error("write-error"));
        }
      })
    );

    dup.on("error", (err) => {
      errored = true;
      errorEmitted = true;
      assert.strictEqual(err.message, "write-error", "received write error");
    });
    dup.on("close", () => {
      closeEmitted = true;
      assert.ok(errored, "error was emitted before close");
    });

    dup.end("123");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(errorEmitted, "error emitted");
    assert.ok(closeEmitted, "close emitted");
  });

  it("destroy while waiting for drain", async () => {
    let errored = false;
    let closeEmitted = false;
    let errorEmitted = false;

    const dup = duplexify(
      new Writable({
        highWaterMark: 0,
        write() {}
      })
    );

    dup.on("error", (err) => {
      errored = true;
      errorEmitted = true;
      assert.strictEqual(
        err.message,
        "destroy-error",
        "received destroy error"
      );
    });
    dup.on("close", () => {
      closeEmitted = true;
      assert.ok(errored, "error was emitted before close");
    });

    dup.write("123");
    dup.destroy(new Error("destroy-error"));

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(errorEmitted, "error emitted");
    assert.ok(closeEmitted, "close emitted");
  });

  it("reset writable / readable", async () => {
    const passthrough = new PassThrough({ objectMode: true });
    const upper = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        callback(null, chunk.toString().toUpperCase());
      }
    });
    const dup = duplexify(passthrough, passthrough);

    const results = [];
    dup.on("data", (data) => {
      results.push(data.toString());
    });

    dup.write("hello");

    await new Promise((resolve) => {
      dup.once("data", () => {
        assert.strictEqual(results[0], "hello");
        dup.setWritable(upper);
        dup.setReadable(upper);
        dup.write("hello");
        dup.write("hi");
        dup.end();
        resolve();
      });
    });

    // Wait for all data to be received
    await new Promise((resolve) => {
      const check = () => {
        if (results.length >= 3) {
          dup.removeListener("data", check);
          resolve();
        }
      };
      dup.on("data", check);
      check();
    });

    // Check all results
    assert.strictEqual(results[0], "hello");
    assert.strictEqual(results[1], "HELLO");
    assert.strictEqual(results[2], "HI");
  });

  it("cork", async () => {
    const passthrough = new PassThrough();
    const dup = duplexify(passthrough, passthrough);
    let ok = false;

    await new Promise((resolve) => {
      dup.on("prefinish", () => {
        dup.cork();
        setTimeout(() => {
          ok = true;
          dup.uncork();
        }, 10);
      });

      dup.on("finish", () => {
        assert.ok(ok, "cork/uncork worked");
        resolve();
      });

      dup.end();
    });
  });

  it("prefinish not twice", async () => {
    const passthrough = new PassThrough();
    const dup = duplexify(passthrough, passthrough);
    let prefinished = false;

    dup.on("prefinish", () => {
      assert.ok(!prefinished, "only prefinish once");
      prefinished = true;
    });

    await new Promise((resolve) => {
      dup.on("finish", resolve);
      dup.end();
    });
  });

  it("close", async () => {
    const passthrough = new PassThrough();
    const dup = duplexify(passthrough, passthrough);

    await new Promise((resolve) => {
      dup.on("close", () => {
        assert.ok(true, "should forward close");
        resolve();
      });
      passthrough.emit("close");
    });
  });

  it("works with node native streams (net)", async () => {
    const server = net.createServer((socket) => {
      const dup = duplexify(socket, socket);

      dup.once("data", (chunk) => {
        assert.ok(
          Buffer.compare(chunk, HELLO_WORLD) === 0,
          "chunk should equal HELLO_WORLD"
        );
        server.close();
        socket.end();
      });
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error("Test timeout"));
      }, 5000);

      server.listen(0, () => {
        clearTimeout(timeout);
        const socket = net.connect(server.address().port);
        const dup = duplexify(socket, socket);

        dup.write(HELLO_WORLD);
        dup.on("finish", () => {
          socket.end();
        });

        server.on("close", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    });
  });
});
