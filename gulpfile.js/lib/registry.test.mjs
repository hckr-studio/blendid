import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Registry } from "./registry.mjs";

const noop = () => {};

class TestRegistry extends Registry {}

describe("blendid-registry", () => {
  describe("constructor", () => {
    it("can be constructed with new", () => {
      const reg = new TestRegistry();
      assert.equal(typeof reg.get, "function");
      assert.equal(typeof reg.set, "function");
      assert.equal(typeof reg.tasks, "function");
    });
  });

  describe("init", () => {
    it("is a noop", () => {
      const reg = new TestRegistry();
      assert.equal(typeof reg.init, "function");
    });
  });

  describe("get", () => {
    it("returns a task from the registry", () => {
      const reg = new TestRegistry();
      reg._tasks.set("test", noop);
      assert.equal(reg.get("test"), noop);
    });
  });

  describe("set", () => {
    it("registers a task", () => {
      const reg = new TestRegistry();
      reg.set("test", noop);
      assert.equal(reg._tasks.get("test"), noop);
    });

    it("returns the task (useful for inheriting)", () => {
      const reg = new TestRegistry();
      const task = reg.set("test", noop);
      assert.equal(task, noop);
    });
  });

  describe("tasks", () => {
    it("returns an object of task name->functions", () => {
      const reg = new TestRegistry();
      reg.set("test1", noop);
      reg.set("test2", noop);
      assert.deepEqual(reg.tasks(), { test1: noop, test2: noop });
    });
  });
});
