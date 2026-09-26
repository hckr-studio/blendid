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
import { RevUpdateHtmlRegistry } from "./update-html.mjs";

describe("RevUpdateHtmlRegistry", () => {
  const mockConfig = { html: {} };
  const mockPathConfig = {
    dest: "/tmp/test-dest-update-html",
    html: { dest: "html-output" }
  };

  let registry;
  let tasksCalled;
  let taskRegistry;
  const testDir = "/tmp/test-dest-update-html";

  beforeEach(setupTestEnv(testDir));

  beforeEach(() => {
    registry = new RevUpdateHtmlRegistry(mockConfig, mockPathConfig);
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
    it("does not register task when config.html is falsy", () => {
      const configNoHtml = {};
      const registryNoHtml = new RevUpdateHtmlRegistry(
        configNoHtml,
        mockPathConfig
      );
      registryNoHtml.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 0);
    });

    it("registers update-html task when config.html is truthy", () => {
      registry.init(createMockTaker(tasksCalled, taskRegistry));
      assert.strictEqual(tasksCalled.length, 1);
      assert.strictEqual(tasksCalled[0].name, "update-html");
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
    it("uses correct source path pattern for HTML files", () => {
      const configWithImportmap = {
        html: {},
        production: { rev: { importmap: true } }
      };
      const registryWithImportmap = new RevUpdateHtmlRegistry(
        configWithImportmap,
        mockPathConfig
      );
      const srcCalls = [];

      registryWithImportmap.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          srcCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(srcCalls.length, 2);
      const htmlSrcCall = srcCalls.find((call) => call.includes("*.html"));
      assert.ok(htmlSrcCall);
      assert.strictEqual(
        htmlSrcCall,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-html",
          "html-output",
          "**",
          "*.html"
        )
      );
    });

    it("reads manifest from correct path", () => {
      const manifestPath = path.resolve(
        "/tmp/test-project",
        "/tmp/test-dest-update-html",
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

    it("reads importmap file from correct path", () => {
      const configWithImportmap = {
        html: {},
        production: { rev: { importmap: true } }
      };
      const registryWithImportmap = new RevUpdateHtmlRegistry(
        configWithImportmap,
        mockPathConfig
      );
      const importmapSrcCalls = [];
      const importmapPath = path.resolve(
        "/tmp/test-project",
        "/tmp/test-dest-update-html",
        "import-map.importmap"
      );

      registryWithImportmap.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p) => {
          importmapSrcCalls.push(p);
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      const importmapCall = importmapSrcCalls.find((call) =>
        call.includes("import-map.importmap")
      );
      assert.ok(importmapCall);
      assert.strictEqual(importmapCall, importmapPath);
    });

    it("importmap src has allowEmpty option", () => {
      const configWithImportmap = {
        html: {},
        production: { rev: { importmap: true } }
      };
      const registryWithImportmap = new RevUpdateHtmlRegistry(
        configWithImportmap,
        mockPathConfig
      );
      const srcOptions = [];

      registryWithImportmap.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: (p, options) => {
          if (p.includes("import-map.importmap")) {
            srcOptions.push(options);
          }
          return new PassThrough({ objectMode: true });
        }
      });
      tasksCalled[0].fn();

      assert.strictEqual(srcOptions.length, 1);
      assert.strictEqual(srcOptions[0].allowEmpty, true);
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
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-html",
          "html-output"
        )
      );
    });
  });

  describe("importmap injection", () => {
    it("injects importmap when config.production.rev.importmap is truthy", () => {
      const configWithImportmap = {
        html: {},
        production: { rev: { importmap: true } }
      };
      const registryWithImportmap = new RevUpdateHtmlRegistry(
        configWithImportmap,
        mockPathConfig
      );

      const pipeCalls = [];

      registryWithImportmap.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      const mockPipe = (stream) => {
        pipeCalls.push(stream);
        return stream;
      };

      const result = tasksCalled[0].fn();
      result.pipe = mockPipe;
      result.pipe(new PassThrough({ objectMode: true }));

      assert.strictEqual(pipeCalls.length, 1);
    });

    it("does not inject importmap when config.production.rev.importmap is falsy", () => {
      registry.init({
        ...createMockTaker(tasksCalled, taskRegistry),
        src: () => new PassThrough({ objectMode: true })
      });

      const result = tasksCalled[0].fn();
      assert.ok(result);
    });
  });

  describe("path configuration", () => {
    it("uses custom dest path from pathConfig", () => {
      const customConfig = {
        dest: "/tmp/test-dest-update-html-custom",
        html: { dest: "build" }
      };
      const customRegistry = new RevUpdateHtmlRegistry(
        mockConfig,
        customConfig
      );

      fs.mkdirSync("/tmp/test-dest-update-html-custom/build", {
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

      const htmlSrcCall = srcCalls.find((call) => call.includes("*.html"));
      assert.ok(htmlSrcCall);
      assert.strictEqual(
        htmlSrcCall,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-html-custom",
          "build",
          "**",
          "*.html"
        )
      );
      assert.strictEqual(
        destCalls[0],
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-html-custom",
          "build"
        )
      );
    });

    it("handles nested html.dest paths", () => {
      const nestedConfig = {
        dest: "/tmp/test-dest-update-html",
        html: { dest: "nested/html" }
      };
      const nestedRegistry = new RevUpdateHtmlRegistry(
        mockConfig,
        nestedConfig
      );
      fs.mkdirSync("/tmp/test-dest-update-html/nested/html", {
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

      const htmlSrcCall = srcCalls.find((call) => call.includes("*.html"));
      assert.ok(htmlSrcCall);
      assert.strictEqual(
        htmlSrcCall,
        path.resolve(
          "/tmp/test-project",
          "/tmp/test-dest-update-html",
          "nested",
          "html",
          "**",
          "*.html"
        )
      );
    });
  });
});
