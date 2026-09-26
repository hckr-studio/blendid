import assert from "node:assert";
import { once } from "node:events";
import fs from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import File from "vinyl";
import { passthrough } from "#lib/stream.mjs";
import minify from "./index.mjs";

function toStream(contents) {
  const stream = passthrough();
  stream.write(contents);
  stream.end();
  return stream;
}

const fakeFile = new File({
  path: "test-fixtures/index.html",
  contents: fs.readFileSync(
    resolve(import.meta.dirname, "test-fixtures/index.html")
  )
});

const errorFileContents = "<<div>error in this file</div>";
const errorFile = new File({
  path: "test-fixtures/error.html",
  contents: Buffer.from(errorFileContents)
});

// Helper to collect data from a readable stream
function collectStream(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

describe("gulp-htmlmin", () => {
  describe("file.contents - buffer", () => {
    it("should ignore empty file", async () => {
      const stream = minify();
      const files = [];
      stream.on("data", (file) => files.push(file));
      stream.write(new File({}));
      stream.end();
      await once(stream, "end");
      assert.strictEqual(files.length, 1);
      assert(files[0].isNull());
    });

    it("should minify my HTML files", async () => {
      const expected = fs.readFileSync(
        resolve(import.meta.dirname, "expected/normal.html"),
        "utf8"
      );
      const stream = minify();
      const files = [];
      stream.on("data", (file) => files.push(file));
      stream.write(fakeFile);
      stream.end();
      await once(stream, "end");
      assert.strictEqual(files.length, 1);
      assert(files[0]);
      assert(files[0].isBuffer());
      assert.strictEqual(files[0].contents.toString(), expected);
    });

    it("should collapse whitespace", async () => {
      const expected = fs.readFileSync(
        resolve(import.meta.dirname, "expected/collapse.html"),
        "utf8"
      );
      const stream = minify({ collapseWhitespace: true });
      const files = [];
      stream.on("data", (file) => files.push(file));
      stream.write(fakeFile);
      stream.end();
      await once(stream, "end");
      assert.strictEqual(files.length, 1);
      assert(files[0]);
      assert.strictEqual(files[0].contents.toString(), expected);
    });

    it("should emit a gulp error", async () => {
      const stream = minify();
      stream.write(errorFile);
      const [err] = await once(stream, "error");
      assert(err.message.includes(errorFileContents));
      assert.strictEqual(err.fileName, errorFile.path);
    });

    it("should emit a plugin error with a stack trace", async () => {
      const stream = minify({ showStack: true });
      stream.write(errorFile);
      const [err] = await once(stream, "error");
      assert(err.message.includes(errorFileContents));
      assert.strictEqual(err.fileName, errorFile.path);
      assert(err.showStack);
    });
  });

  describe("file.contents - stream", () => {
    it("should minify my HTML files", async () => {
      const fixture = new File({ contents: toStream("<div   ></div>") });
      const stream = minify();
      const files = [];
      stream.on("data", (file) => files.push(file));
      stream.write(fixture);
      stream.end();
      await once(stream, "end");
      assert.strictEqual(files.length, 1);
      assert(files[0]);
      assert(files[0].isStream());
      const contents = await collectStream(files[0].contents);
      assert.strictEqual(contents.toString(), "<div></div>");
    });

    it("should emit a plugin error", async () => {
      const stream = minify();
      stream.write(new File({ contents: toStream(errorFileContents) }));
      const [err] = await once(stream, "error");
      assert(err.message.includes(errorFileContents));
    });
  });
});
