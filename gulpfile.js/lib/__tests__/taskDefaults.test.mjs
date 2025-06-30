import { expect } from "chai";
import { getTaskDefaults } from "../taskDefaults.mjs";

describe("Task Defaults", () => {
  it("should return correct default configuration", () => {
    const mode = {
      production: () => true,
      development: () => false
    };

    const defaults = getTaskDefaults(mode);

    expect(defaults).to.have.property("esbuild");
    expect(defaults.esbuild.options).to.include({
      bundle: true,
      splitting: true,
      treeShaking: true,
      minify: true
    });
  });
});
