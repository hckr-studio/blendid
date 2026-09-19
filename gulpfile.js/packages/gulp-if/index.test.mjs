import assert from "node:assert";
import { Transform } from "node:stream";
import { describe, it } from "node:test";
import Vinyl from "vinyl";
import gulpif from "./index.mjs";

function createTransform(objMode, transformFn) {
  return new Transform({
    objectMode: objMode !== false,
    transform(chunk, encoding, callback) {
      try {
        const result = transformFn.call(this, chunk, encoding, (err, data) => {
          if (err) return callback(err);
          callback(null, data);
        });
        if (result !== undefined) {
          callback(null, result);
        }
      } catch (err) {
        callback(err);
      }
    }
  });
}

const tempFile = "temp.txt";
const tempFileContent = "A test generated this file and it is safe to delete";

describe("gulp-if", () => {
  describe("smoke test", () => {
    it("should pass file structure through", () => {
      const condition = false;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });

      const s = gulpif(
        condition,
        createTransform(true, function (data, enc, cb) {
          called++;
          this.push(data);
          cb();
        })
      );

      return new Promise((resolve, reject) => {
        s.on("data", (actualFile) => {
          assert.ok(actualFile, "File should exist");
          assert.ok(actualFile.path, "File path should exist");
          assert.ok(actualFile.contents, "File contents should exist");
          assert.strictEqual(actualFile.path, tempFile);
          assert.strictEqual(String(actualFile.contents), tempFileContent);
          assert.strictEqual(
            called,
            0,
            "Transform should not have been called"
          );
          resolve();
        });

        s.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });

    it("should error if no parameters passed", () => {
      let caughtErr;
      try {
        gulpif();
      } catch (err) {
        caughtErr = err;
      }
      assert.ok(caughtErr, "Error should be thrown");
      assert.ok(
        caughtErr.message.includes("required"),
        "Error message should mention required"
      );
    });
  });

  describe("when given a function", () => {
    it("should call the function when bool function satisfies", () => {
      const filter = (file) => file.path % 2 === 0;
      const collect = [];

      const stream = createTransform(true, function (file, enc, cb) {
        const num = file.path;
        assert.strictEqual(num % 2, 0, "Path should be even");
        collect.push(num);
        this.push(file);
        cb();
      });

      const s = gulpif(filter, stream);
      const n = 5;

      return new Promise((resolve, reject) => {
        s.once("finish", () => {
          assert.strictEqual(collect.length, 3);
          assert.strictEqual(collect.indexOf(4), 0);
          assert.strictEqual(collect.indexOf(2), 1);
          assert.strictEqual(collect.indexOf(0), 2);
          resolve();
        });

        s.on("error", reject);
        for (let i = n; i > 0; i--) {
          s.write({ path: i - 1 });
        }
        s.end();
      });
    });

    it("should call the function when passed truthy", () => {
      const condition = () => true;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });
      const changedContent = "changed_content";

      const s = gulpif(
        condition,
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file, fakeFile);
          called++;
          file.contents = Buffer.from(changedContent);
          this.push(file);
          cb();
        })
      );

      const verifyStream = createTransform(true, function (data, enc, cb) {
        assert.strictEqual(data, fakeFile);
        assert.strictEqual(data.contents.toString(), changedContent);
        called++;
        this.push(data);
        cb();
      });

      s.pipe(verifyStream);

      return new Promise((resolve, reject) => {
        verifyStream.once("finish", () => {
          assert.strictEqual(called, 2);
          resolve();
        });
        verifyStream.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });

    it("should not call the function when passed falsey", () => {
      const condition = () => false;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });

      const s = gulpif(
        condition,
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file, fakeFile);
          called++;
          this.push(file);
          cb();
        })
      );

      return new Promise((resolve, reject) => {
        s.once("finish", () => {
          assert.strictEqual(called, 0);
          resolve();
        });
        s.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });
  });

  describe("when given a boolean", () => {
    it("should call the function when passed truthy", () => {
      const condition = true;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });

      const s = gulpif(
        condition,
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file === fakeFile, true);
          called++;
          this.push(file);
          cb();
        })
      );

      return new Promise((resolve, reject) => {
        s.once("finish", () => {
          assert.strictEqual(called, 1);
          resolve();
        });
        s.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });

    it("should not call the function when passed falsey", () => {
      const condition = false;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });

      const s = gulpif(
        condition,
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file === fakeFile, true);
          called++;
          this.push(file);
          cb();
        })
      );

      return new Promise((resolve, reject) => {
        s.once("finish", () => {
          assert.strictEqual(called, 0);
          resolve();
        });
        s.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });

    it("should call the false function when passed truthy", () => {
      const condition = false;
      let called = 0;
      const fakeFile = new Vinyl({
        path: tempFile,
        contents: Buffer.from(tempFileContent)
      });

      const s = gulpif(
        condition,
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file === fakeFile, true);
          called += 10;
          this.push(file);
          cb();
        }),
        createTransform(true, function (file, enc, cb) {
          assert.strictEqual(file === fakeFile, true);
          called++;
          this.push(file);
          cb();
        })
      );

      return new Promise((resolve, reject) => {
        s.once("finish", () => {
          assert.strictEqual(called, 1);
          resolve();
        });
        s.on("error", reject);
        s.write(fakeFile);
        s.end();
      });
    });
  });
});
