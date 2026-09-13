import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getTaskDefaults } from "../taskDefaults.mjs";

describe("Task Defaults", () => {
  it("should return correct default configuration", () => {
    const mode = {
      production: () => true,
      development: () => false
    };

    const defaults = getTaskDefaults(mode);

    assert.ok(defaults.esbuild);
    assert.ok(defaults.esbuild.options);
    assert.equal(defaults.esbuild.options.bundle, true);
    assert.equal(defaults.esbuild.options.splitting, true);
    assert.equal(defaults.esbuild.options.treeShaking, true);
    assert.equal(defaults.esbuild.options.minify, true);
  });
});
