import { describe, it, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import getEnabledTasks from "../getEnabledTasks.mjs";

let ENV = "development";
let taskConfig = {};

describe("getEnabledTasks", () => {
  describe("when env == development", () => {
    beforeEach(() => {
      ENV = "development";
    });

    describe("#assetTasks", () => {
      beforeEach(() => {
        taskConfig = {
          cloudinary: true,
          fonts: true,
          iconFont: true,
          images: true,
          svgSprite: true
        };
      });

      it("returns all tasks when none disabled", () => {
        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.assetTasks, [
          "cloudinary",
          "fonts",
          "iconFont",
          "images"
        ]);
      });

      it("returns only enabled task when some disabled", () => {
        taskConfig["iconFont"] = false;

        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.assetTasks, ["cloudinary", "fonts", "images"]);
      });

      it("returns false when all disabled", () => {
        Object.keys(taskConfig).forEach((key) => {
          taskConfig[key] = false;
        });

        const tasks = getEnabledTasks(taskConfig);
        assert.equal(tasks.assetTasks, null);
      });
    });

    describe("#codeTasks", () => {
      beforeEach(() => {
        taskConfig = {
          html: true,
          stylesheets: true,
          esbuild: true
        };
      });

      it("returns all when none disabled", () => {
        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.codeTasks, ["esbuild", "stylesheets"]);
      });

      it("returns only enabled except esbuild task when some disabled", () => {
        taskConfig["stylesheets"] = false;

        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.codeTasks, ["esbuild"]);
      });

      it("returns false when all disabled", () => {
        Object.keys(taskConfig).forEach((key) => {
          taskConfig[key] = false;
        });

        const tasks = getEnabledTasks(taskConfig);
        assert.equal(tasks.codeTasks, null);
      });
    });
  });

  describe("when env == production", () => {
    beforeEach(() => {
      ENV = "production";
    });

    describe("#assetTasks", () => {
      beforeEach(() => {
        taskConfig = {
          cloudinary: true,
          fonts: true,
          iconFont: true,
          images: true
        };
      });

      it("returns all tasks when none disabled", () => {
        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.assetTasks, [
          "cloudinary",
          "fonts",
          "iconFont",
          "images"
        ]);
      });

      it("returns only enabled task when some disabled", () => {
        taskConfig["iconFont"] = false;

        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.assetTasks, ["cloudinary", "fonts", "images"]);
      });

      it("returns false when all disabled", () => {
        Object.keys(taskConfig).forEach((key) => {
          taskConfig[key] = false;
        });

        const tasks = getEnabledTasks(taskConfig);
        assert.equal(tasks.assetTasks, null);
      });
    });

    describe("#codeTasks", () => {
      beforeEach(() => {
        taskConfig = {
          html: true,
          stylesheets: true,
          esbuild: true
        };
      });

      it("returns all and convert javascripts task when none disabled", () => {
        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.codeTasks, ["esbuild", "stylesheets"]);
      });

      it("returns only enabled and convert javascripts task when some disabled", () => {
        taskConfig["stylesheets"] = false;

        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.codeTasks, ["esbuild"]);
      });

      it("still correctly disable esbuild task when disabled", () => {
        taskConfig["esbuild"] = false;

        const tasks = getEnabledTasks(taskConfig);
        assert.deepEqual(tasks.codeTasks, ["stylesheets"]);
      });

      it("returns false when all disabled", () => {
        Object.keys(taskConfig).forEach((key) => {
          taskConfig[key] = false;
        });

        const tasks = getEnabledTasks(taskConfig);
        assert.equal(tasks.codeTasks, null);
      });
    });
  });
});
