import assert from "node:assert";
import { Transform } from "node:stream";
import { describe, it } from "node:test";
import ternaryStream from "./ternaryStream.mjs";

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
