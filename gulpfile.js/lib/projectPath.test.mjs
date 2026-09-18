import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
import projectPath from "./projectPath.mjs";

describe("projectPath", () => {
  let originalEnv;

  before(() => {
    // Save the original environment variables
    originalEnv = { ...process.env };

    // Set the INIT_CWD environment variable to a known value
    process.env.INIT_CWD = "/home/user/project";
  });

  after(() => {
    // Restore the original environment variables
    process.env = originalEnv;
  });

  it("returns the absolute path relative to the project root directory", () => {
    const result = projectPath("src", "assets", "image.png");
    assert.equal(result, "/home/user/project/src/assets/image.png");
  });

  it("returns the project root directory path when no arguments are provided", () => {
    const result = projectPath();
    assert.equal(result, "/home/user/project");
  });
});
