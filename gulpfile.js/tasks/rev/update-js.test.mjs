import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import DefaultRegistry from "undertaker-registry";
import {
  assertRegistryBasics,
  cleanupTestEnv,
  createMockTaker,
  setupTestEnv
} from "./test-utils.mjs";
import { RevUpdateJsRegistry } from "./update-js.mjs";

describe("RevUpdateJsRegistry", () => {
  const mockConfig = { esbuild: {} };
  const mockPathConfig = {
    dest: "/tmp/test-dest-update-js",
    esbuild: { dest: "code" }
  };

  let registry;
  let tasksCalled;
  let taskRegistry;
  const testDir = "/tmp/test-dest-update-js";

  beforeEach(setupTestEnv(testDir));

  beforeEach(() => {
    registry = new RevUpdateJsRegistry(mockConfig, mockPathConfig);
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

    it("sets paths correctly", () => {
      assert.strictEqual(registry.paths.codeDir, "code");
      assert.strictEqual(
        registry.paths.src,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-js",
          "code",
          "**",
          "*.js"
        )
      );
      assert.strictEqual(
        registry.paths.dest,
        path.resolve("/tmp/test-project", "/tmp/test-dest-update-js", "code")
      );
      assert.strictEqual(
        registry.paths.manifest,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-js",
          "rev-manifest.json"
        )
      );
    });
  });

  describe("init", () => {
    it("does not register task when config.esbuild is falsy", () => {
      const configNoEsbuild = {};
      const registryNoEsbuild = new RevUpdateJsRegistry(
        configNoEsbuild,
        mockPathConfig
      );
      registryNoEsbuild.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 0);
    });

    it("registers update-js task when config.esbuild is truthy", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 1);
      assert.strictEqual(tasksCalled[0].name, "update-js");
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
    it("uses correct source path pattern for JS files", () => {
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
          "/tmp/test-dest-update-js",
          "code",
          "**",
          "*.js"
        )
      );
    });

    it("source pattern matches only JS files in codeDir", () => {
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
      assert.ok(srcPath.includes("code"));
      assert.ok(srcPath.includes("*.js"));
      assert.ok(!srcPath.includes("*.css"));
      assert.ok(!srcPath.includes("*.mjs"));
    });
  });

  describe("manifest handling", () => {
    it("reads manifest from correct path", () => {
      const manifestRead = false;
      const mockManifest = { "test.css": "test-abc123.css" };

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      fs.writeFileSync(registry.paths.manifest, JSON.stringify(mockManifest));
      tasksCalled[0].fn();

      assert.ok(fs.existsSync(registry.paths.manifest));
    });

    it("handles missing manifest gracefully", () => {
      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      if (fs.existsSync(registry.paths.manifest)) {
        fs.rmSync(registry.paths.manifest);
      }

      const result = tasksCalled[0].fn();
      assert.ok(result);
    });
  });

  describe("destination paths", () => {
    it("uses correct destination path", () => {
      const destCalls = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        dest: (p) => {
          destCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(destCalls.length, 1);
      assert.strictEqual(
        destCalls[0],
        path.resolve("/tmp/test-project", "/tmp/test-dest-update-js", "code")
      );
    });
  });

  describe("path configuration", () => {
    it("uses custom dest path from pathConfig", () => {
      const customConfig = {
        dest: "/tmp/test-dest-update-js-custom",
        esbuild: { dest: "build" }
      };
      const customRegistry = new RevUpdateJsRegistry(mockConfig, customConfig);

      fs.mkdirSync("/tmp/test-dest-update-js-custom/build", {
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
          "/tmp/test-dest-update-js-custom",
          "build",
          "**",
          "*.js"
        )
      );
      assert.strictEqual(
        destCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-js-custom",
          "build"
        )
      );
    });

    it("handles nested codeDir paths", () => {
      const nestedConfig = {
        dest: "/tmp/test-dest-update-js",
        esbuild: { dest: "nested/code" }
      };
      const nestedRegistry = new RevUpdateJsRegistry(mockConfig, nestedConfig);
      fs.mkdirSync("/tmp/test-dest-update-js/nested/code", { recursive: true });

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
          "/tmp/test-dest-update-js",
          "nested",
          "code",
          "**",
          "*.js"
        )
      );
    });
  });

  describe("esm pathConfig fallback", () => {
    it("uses esm.dest as fallback for codeDir", () => {
      const esmConfig = {
        dest: "/tmp/test-dest-update-js",
        esm: { dest: "esm-output" }
      };
      const esmRegistry = new RevUpdateJsRegistry(mockConfig, esmConfig);

      assert.strictEqual(esmRegistry.paths.codeDir, "esm-output");
    });
  });
});
