import assert from "node:assert";
import { describe, it } from "node:test";
import File from "vinyl";
import revDel from "./index.mjs";

//TODO: exclude: function vs regex

describe("gulp-rev-delete-original", () => {
  it("should not remove the original file when it has not been rewritten", async () => {
    const file = new File({
      cwd: "/",
      base: "/test/",
      path: "/dist/index.js",
      contents: Buffer.from("")
    });
    file.revOrigPath = "/dist/index.js";

    const stream = revDel({
      remove: (path) => {
        assert(false, "remove should not be called");
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.on("data", () => {});
      stream.write(file);
      stream.end();
    });
  });

  it("should remove the original file when it has been rewritten", async () => {
    let removeWasCalled = false;

    const file = new File({
      cwd: "/",
      base: "/test/",
      path: "/dist/index.abcd.js",
      contents: Buffer.from("")
    });
    file.revOrigPath = "/dist/index.js";

    const stream = revDel({
      remove: async (path) => {
        removeWasCalled = true;
        assert.equal(path, file.revOrigPath);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("data", () => {
        assert(removeWasCalled);
      });
      stream.on("finish", resolve);
      stream.write(file);
      stream.end();
    });
  });

  it("should remove the original file when it has been rewritten and has not been excluded", async () => {
    let removeWasCalled = false;

    const file = new File({
      cwd: "/",
      base: "/test/",
      path: "/dist/index.abcd.js",
      contents: Buffer.from("")
    });
    file.revOrigPath = "/dist/index.js";

    const stream = revDel({
      exclude: () => false,

      remove: async (path) => {
        removeWasCalled = true;
        assert.equal(path, file.revOrigPath);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("data", () => {
        assert(removeWasCalled);
      });
      stream.on("finish", resolve);
      stream.write(file);
      stream.end();
    });
  });

  it("should not remove the original file when it has been rewritten and has been excluded", async () => {
    let removeWasCalled = false;

    const file = new File({
      cwd: "/",
      base: "/test/",
      path: "/dist/index.abcd.js",
      contents: Buffer.from("")
    });
    file.revOrigPath = "/dist/index.js";

    const stream = revDel({
      exclude: () => true,

      remove: async (path) => {
        removeWasCalled = true;
        assert.equal(path, file.revOrigPath);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("data", () => {
        assert(!removeWasCalled);
      });
      stream.on("finish", resolve);
      stream.write(file);
      stream.end();
    });
  });
});
