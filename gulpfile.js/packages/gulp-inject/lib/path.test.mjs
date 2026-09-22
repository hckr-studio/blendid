import assert from "node:assert";
import path from "node:path";
import { describe, test } from "node:test";
import Vinyl from "vinyl";
import getFilepath from "./path.mjs";

describe("getFilepath", () => {
  describe("(relative=false)", () => {
    test("returns the path relative to the source file's cwd", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source);
      assert.strictEqual(filepath, "dir/file.js");
    });

    test("returns the unixified path relative to the source file's cwd", () => {
      const source = new Vinyl({
        cwd: "C:\\a\\folder",
        path: "C:\\a\\folder\\dir\\file.js",
        base: "C:\\a\\folder\\dir"
      });

      const filepath = getFilepath(source);
      assert.strictEqual(filepath, "dir/file.js");
    });
  });

  describe("(relative=true)", () => {
    test("returns the path relative to the target file's directory", () => {
      const target = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir1", "index.html"),
        base: path.join(import.meta.dirname, "dir1")
      });
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir2", "file.js"),
        base: path.join(import.meta.dirname, "dir2")
      });

      const filepath = getFilepath(source, target, { relative: true });
      assert.strictEqual(filepath, "../dir2/file.js");
    });

    test("returns the unixified path relative to the source file's cwd", () => {
      const target = new Vinyl({
        cwd: "C:\\a\\folder",
        path: "C:\\a\\folder\\dir1\\index.html",
        base: "C:\\a\\folder\\dir1"
      });
      const source = new Vinyl({
        cwd: "C:\\a\\folder",
        path: "C:\\a\\folder\\dir2\\file.js",
        base: "C:\\a\\folder\\dir2"
      });

      const filepath = getFilepath(source, target, { relative: true });
      assert.strictEqual(filepath, "../dir2/file.js");
    });
  });

  describe("(ignorePath)", () => {
    test("removes the provided `ignorePath` from the beginning of the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { ignorePath: "dir" });
      assert.strictEqual(filepath, "file.js");
    });

    test("removes the provided `ignorePath` even if it both begins and ends in a `/` from the beginning of the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { ignorePath: "/dir/" });
      assert.strictEqual(filepath, "file.js");
    });

    test("removes the provided `ignorePath`s from the beginning of the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, {
        ignorePath: ["dir", "dir2"]
      });
      assert.strictEqual(filepath, "file.js");
    });

    test("removes the provided `ignorePath` unixified from the beginning of the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "deep", "file.js"),
        base: path.join(import.meta.dirname, "dir", "deep")
      });

      const filepath = getFilepath(source, null, {
        ignorePath: ["\\dir\\deep"]
      });
      assert.strictEqual(filepath, "file.js");
    });

    test("removes the provided `ignorePath` unixified from the beginning of a unixified path", () => {
      const source = new Vinyl({
        cwd: "C:\\a\\folder",
        path: "C:\\a\\folder\\dir\\deep\\file.js",
        base: "C:\\a\\folder\\dir\\deep"
      });

      const filepath = getFilepath(source, null, {
        ignorePath: ["\\dir\\deep"]
      });
      assert.strictEqual(filepath, "file.js");
    });

    test("removes the provided `ignorePath` from the beginning of a unixified path", () => {
      const source = new Vinyl({
        cwd: "C:\\a\\folder",
        path: "C:\\a\\folder\\dir\\deep\\file.js",
        base: "C:\\a\\folder\\dir\\deep"
      });

      const filepath = getFilepath(source, null, { ignorePath: ["dir/deep"] });
      assert.strictEqual(filepath, "file.js");
    });
  });

  describe("(addRootSlash=true)", () => {
    test("prepends the path with a `/`", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { addRootSlash: true });
      assert.strictEqual(filepath, "/dir/file.js");
    });
  });

  describe("(addPrefix)", () => {
    test("prepends the prefix and a `/` to the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { addPrefix: "hello" });
      assert.strictEqual(filepath, "hello/dir/file.js");
    });

    test("keeps any leading `/` from the prefix", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { addPrefix: "/hello" });
      assert.strictEqual(filepath, "/hello/dir/file.js");
    });
  });

  describe("(addSuffix)", () => {
    test("appends the suffix to the path", () => {
      const source = new Vinyl({
        cwd: import.meta.dirname,
        path: path.join(import.meta.dirname, "dir", "file.js"),
        base: path.join(import.meta.dirname, "dir")
      });

      const filepath = getFilepath(source, null, { addSuffix: "?hello" });
      assert.strictEqual(filepath, "dir/file.js?hello");
    });
  });
});
