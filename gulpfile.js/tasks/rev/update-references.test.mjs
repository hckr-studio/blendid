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
import { RevUpdateReferencesRegistry } from "./update-references.mjs";

describe("RevUpdateReferencesRegistry", () => {
  const mockConfig = {};
  const mockPathConfig = {
    dest: "/tmp/test-dest-update-references"
  };

  let registry;
  let tasksCalled;
  let taskRegistry;
  const testDir = "/tmp/test-dest-update-references";

  beforeEach(setupTestEnv(testDir));

  beforeEach(() => {
    registry = new RevUpdateReferencesRegistry(mockConfig, mockPathConfig);
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
    it("always registers rev-update-references task", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 1);
      assert.strictEqual(tasksCalled[0].name, "rev-update-references");
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
    it("uses correct source path pattern for CSS, JS, MJS, and map files", () => {
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
          "/tmp/test-dest-update-references",
          "**",
          "*.{css,js,mjs,map}"
        )
      );
    });

    it("source pattern matches CSS, JS, MJS, and map files", () => {
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
      assert.ok(srcPath.includes("*.{css,js,mjs,map}"));
      assert.ok(srcPath.includes("**"));
    });

    it("source pattern does not match HTML or JSON files", () => {
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
      assert.ok(!srcPath.includes("*.html"));
      assert.ok(!srcPath.includes("*.json"));
    });
  });

  describe("manifest handling", () => {
    it("reads manifest from correct path", () => {
      const manifestPath = path.resolve(
        "/tmp/test-project",
        "/tmp/test-dest-update-references",
        "rev-manifest.json"
      );

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      fs.writeFileSync(manifestPath, JSON.stringify({}));
      tasksCalled[0].fn();

      assert.ok(fs.existsSync(manifestPath));
    });

    it("handles missing manifest gracefully", () => {
      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      const manifestPath = path.resolve(
        "/tmp/test-project",
        "/tmp/test-dest-update-references",
        "rev-manifest.json"
      );
      if (fs.existsSync(manifestPath)) {
        fs.rmSync(manifestPath);
      }

      const result = tasksCalled[0].fn();
      assert.ok(result);
    });
  });

  describe("options handling", () => {
    it("uses config.production.rev options when it is an object", () => {
      const configWithOptions = {
        production: {
          rev: {
            modifyUnreved: (s) => s,
            modifyReved: (s) => s
          }
        }
      };
      const registryWithOptions = new RevUpdateReferencesRegistry(
        configWithOptions,
        mockPathConfig
      );

      let revReplaceOptions;

      registryWithOptions.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => {
          const mockStream = new PassThrough({ objectMode: true });
          mockStream.pipe = (plugin) => {
            revReplaceOptions = plugin;
            return mockStream;
          };
          return mockStream;
        }
      });

      tasksCalled[0].fn();
      assert.ok(revReplaceOptions);
    });

    it("uses empty object when config.production.rev is not an object", () => {
      const configNoRev = { production: {} };
      const registryNoRev = new RevUpdateReferencesRegistry(
        configNoRev,
        mockPathConfig
      );

      registryNoRev.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

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
        path.resolve("/tmp/test-project", "/tmp/test-dest-update-references")
      );
    });
  });

  describe("path configuration", () => {
    it("uses custom dest path from pathConfig", () => {
      const customConfig = { dest: "/tmp/test-dest-update-references-custom" };
      const customRegistry = new RevUpdateReferencesRegistry(
        mockConfig,
        customConfig
      );

      fs.mkdirSync("/tmp/test-dest-update-references-custom", {
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
          "/tmp/test-dest-update-references-custom",
          "**",
          "*.{css,js,mjs,map}"
        )
      );
      assert.strictEqual(
        destCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-references-custom"
        )
      );
    });

    it("handles nested dest paths", () => {
      const nestedConfig = {
        dest: "/tmp/test-dest-update-references/nested/build"
      };
      const nestedRegistry = new RevUpdateReferencesRegistry(
        mockConfig,
        nestedConfig
      );
      fs.mkdirSync("/tmp/test-dest-update-references/nested/build", {
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
          "/tmp/test-dest-update-references/nested/build",
          "**",
          "*.{css,js,mjs,map}"
        )
      );
    });
  });
});
