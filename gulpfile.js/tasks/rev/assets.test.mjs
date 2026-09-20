import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import DefaultRegistry from "undertaker-registry";
import { RevAssetsRegistry } from "./assets.mjs";
import {
  assertRegistryBasics,
  cleanupTestEnv,
  createMockTaker,
  setupTestEnv
} from "./test-utils.mjs";

describe("RevAssetsRegistry", () => {
  const mockConfig = {};
  const mockPathConfig = {
    dest: "/tmp/test-dest-assets"
  };

  let registry;
  let tasksCalled;
  let taskRegistry;
  const testDir = "/tmp/test-dest-assets";

  beforeEach(setupTestEnv(testDir));

  beforeEach(() => {
    registry = new RevAssetsRegistry(mockConfig, mockPathConfig);
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
    it("always registers rev-assets task", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 1);
      assert.strictEqual(tasksCalled[0].name, "rev-assets");
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
    it("uses correct source path pattern for all files", () => {
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
        path.resolve("/tmp/test-project", "/tmp/test-dest-assets", "**", "*")
      );
    });

    it("source pattern uses **/* to match all files", () => {
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
      assert.ok(srcPath.includes("**"));
      assert.ok(srcPath.includes("*"));
      assert.ok(!srcPath.includes("*.css"));
      assert.ok(!srcPath.includes("*.js"));
    });
  });

  describe("source options - ignore patterns", () => {
    it("ignores CSS, JS, MJS, map, JSON, HTML, and TXT files by default", () => {
      const srcOptions = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(srcOptions.length, 1);
      const options = srcOptions[0];
      assert.ok(Array.isArray(options.ignore));
      assert.strictEqual(options.ignore.length, 1);
      const ignoreString = options.ignore[0];
      assert.ok(ignoreString.includes("{css,js,mjs,map,json,html,txt}"));
    });

    it("includes config.production.rev.exclude patterns in ignore list", () => {
      const configWithExclude = {
        production: {
          rev: {
            exclude: ["vendor/**", "static/ignore-me.png"]
          }
        }
      };
      const registryWithExclude = new RevAssetsRegistry(
        configWithExclude,
        mockPathConfig
      );

      const srcOptions = [];

      registryWithExclude.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.ok(Array.isArray(options.ignore));
      assert.strictEqual(options.ignore.length, 3);
      const customExcludes = options.ignore.slice(1);
      assert.ok(
        customExcludes.some((p) =>
          p.includes(
            path.resolve("/tmp/test-project", "/tmp/test-dest-assets", "vendor")
          )
        )
      );
      assert.ok(
        customExcludes.some((p) =>
          p.includes(
            path.resolve(
              "/tmp/test-project",
              "/tmp/test-dest-assets",
              "static",
              "ignore-me.png"
            )
          )
        )
      );
    });

    it("filters out falsy values from ignore list after mapping", () => {
      const configWithFalsy = {
        production: {
          rev: {
            exclude: ["valid/**"]
          }
        }
      };
      const registryWithFalsy = new RevAssetsRegistry(
        configWithFalsy,
        mockPathConfig
      );

      const srcOptions = [];

      registryWithFalsy.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.ignore.length, 2);
      assert.ok(options.ignore.every((x) => x && x.length > 0));
    });

    it("resolves exclude patterns using projectPath", () => {
      const configWithExclude = {
        production: {
          rev: {
            exclude: ["images/old/*"]
          }
        }
      };
      const registryWithExclude = new RevAssetsRegistry(
        configWithExclude,
        mockPathConfig
      );

      const srcOptions = [];

      registryWithExclude.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const options = srcOptions[0];
      const customExclude = options.ignore[1];
      assert.strictEqual(
        customExclude,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-assets",
          "images/old/*"
        )
      );
    });

    it("sets encoding option to false", () => {
      const srcOptions = [];

      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.encoding, false);
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
        path.resolve("/tmp/test-project", "/tmp/test-dest-assets")
      );
      assert.strictEqual(destCalls[1], ".");
    });
  });

  describe("path configuration", () => {
    it("uses custom dest path from pathConfig", () => {
      const customConfig = { dest: "/tmp/test-dest-assets-custom" };
      const customRegistry = new RevAssetsRegistry(mockConfig, customConfig);

      fs.mkdirSync("/tmp/test-dest-assets-custom", { recursive: true });

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
          "/tmp/test-dest-assets-custom",
          "**",
          "*"
        )
      );
      assert.strictEqual(
        destCalls[0],
        path.resolve("/tmp/test-project", "/tmp/test-dest-assets-custom")
      );
    });

    it("handles nested dest paths", () => {
      const nestedConfig = { dest: "/tmp/test-dest-assets/nested/build" };
      const nestedRegistry = new RevAssetsRegistry(mockConfig, nestedConfig);
      fs.mkdirSync("/tmp/test-dest-assets/nested/build", { recursive: true });

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
          "/tmp/test-dest-assets/nested/build",
          "**",
          "*"
        )
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty config.production", () => {
      const configEmpty = { production: {} };
      const registryEmpty = new RevAssetsRegistry(configEmpty, mockPathConfig);

      const srcOptions = [];

      registryEmpty.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.ignore.length, 1);
    });

    it("handles missing config.production.rev", () => {
      const configNoRev = { production: { other: {} } };
      const registryNoRev = new RevAssetsRegistry(configNoRev, mockPathConfig);

      const srcOptions = [];

      registryNoRev.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.ignore.length, 1);
    });

    it("handles empty config.production.rev.exclude array", () => {
      const configEmptyExclude = {
        production: { rev: { exclude: [] } }
      };
      const registryEmptyExclude = new RevAssetsRegistry(
        configEmptyExclude,
        mockPathConfig
      );

      const srcOptions = [];

      registryEmptyExclude.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.ignore.length, 1);
    });

    it("handles undefined config.production.rev.exclude", () => {
      const configUndefinedExclude = {
        production: { rev: {} }
      };
      const registryUndefinedExclude = new RevAssetsRegistry(
        configUndefinedExclude,
        mockPathConfig
      );

      const srcOptions = [];

      registryUndefinedExclude.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          srcOptions.push(options);
          return new PassThrough({ objectMode: true });
        }
      });

      tasksCalled[0].fn();

      const options = srcOptions[0];
      assert.strictEqual(options.ignore.length, 1);
    });
  });
});
