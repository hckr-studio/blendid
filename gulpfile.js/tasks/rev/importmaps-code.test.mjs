import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import DefaultRegistry from "undertaker-registry";
import { RevImportmapsCodeRegistry } from "./importmaps-code.mjs";
import {
  assertRegistryBasics,
  cleanupTestEnv,
  createMockTaker,
  setupTestEnv
} from "./test-utils.mjs";

describe("RevImportmapsCodeRegistry", () => {
  const mockConfig = {};
  const mockPathConfig = {
    dest: "/tmp/test-dest-importmaps-code"
  };

  let registry;
  let tasksCalled;
  let taskRegistry;
  const testDir = "/tmp/test-dest-importmaps-code";

  beforeEach(setupTestEnv(testDir));

  beforeEach(() => {
    registry = new RevImportmapsCodeRegistry(mockConfig, mockPathConfig);
    tasksCalled = [];
    taskRegistry = [];
  });

  afterEach(cleanupTestEnv(testDir));

  describe("constructor", () => {
    it("extends DefaultRegistry", () => {
      assert.ok(registry instanceof DefaultRegistry);
    });

    it("sets config and pathConfig", () => {
      assertRegistryBasics(registry, mockConfig, mockPathConfig);
    });
  });

  describe("init", () => {
    it("always registers rev-importmaps-code task", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 1);
      assert.strictEqual(tasksCalled[0].name, "rev-importmaps-code");
      assert.strictEqual(typeof tasksCalled[0].fn, "function");
    });

    it("task returns a stream", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      const result = tasksCalled[0].fn();
      assert.ok(result);
      assert.ok(typeof result.pipe === "function");
    });
  });

  describe("source paths", () => {
    it("uses correct source path pattern for JS and MJS files", () => {
      const srcCalls = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          srcCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(srcCalls.length, 1);
      assert.strictEqual(
        srcCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-importmaps-code",
          "**",
          "*.{js,mjs}"
        )
      );
    });

    it("source pattern matches only JS and MJS files", () => {
      const srcCalls = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          srcCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const srcPath = srcCalls[0];
      assert.ok(srcPath.includes("*.{js,mjs}"));
      assert.ok(!srcPath.includes("*.css"));
      assert.ok(!srcPath.includes("*.html"));
    });
  });

  describe("destination paths", () => {
    it("uses correct destination paths", () => {
      const destCalls = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        dest: (p) => {
          destCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(destCalls.length, 2);
      assert.strictEqual(
        destCalls[0],
        path.resolve("/tmp/test-project", "/tmp/test-dest-importmaps-code")
      );
      assert.strictEqual(destCalls[1], ".");
    });
  });

  describe("path configuration", () => {
    it("uses custom dest path from pathConfig", () => {
      const customConfig = { dest: "/tmp/test-dest-importmaps-code-custom" };
      const customRegistry = new RevImportmapsCodeRegistry(
        mockConfig,
        customConfig
      );

      fs.mkdirSync("/tmp/test-dest-importmaps-code-custom", {
        recursive: true
      });

      const srcCalls = [];
      const destCalls = [];

      customRegistry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          srcCalls.push(p);
          return new PassThrough({ objectMode: true });
        },
        dest: (p) => {
          destCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      assert.strictEqual(
        srcCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-importmaps-code-custom",
          "**",
          "*.{js,mjs}"
        )
      );
      assert.strictEqual(
        destCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-importmaps-code-custom"
        )
      );
    });

    it("handles nested dest paths", () => {
      const nestedConfig = {
        dest: "/tmp/test-dest-importmaps-code/nested/build"
      };
      const nestedRegistry = new RevImportmapsCodeRegistry(
        mockConfig,
        nestedConfig
      );
      fs.mkdirSync("/tmp/test-dest-importmaps-code/nested/build", {
        recursive: true
      });

      const srcCalls = [];

      nestedRegistry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          srcCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      assert.strictEqual(
        srcCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-importmaps-code/nested/build",
          "**",
          "*.{js,mjs}"
        )
      );
    });
  });
});
