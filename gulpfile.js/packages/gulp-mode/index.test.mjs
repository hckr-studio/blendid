import assert from "node:assert";
import { describe, it } from "node:test";

import gulpMode from "./index.mjs";

describe("gulp-mode", () => {
  describe("gulp-mode test suite with default options", () => {
    it("default options, no NODE_ENV, no CLI argument -> production() == noop, development() == child", () => {
      const env = {};
      const argv = ["node", "/path/to/gulp"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.notStrictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, false);
      const developmentResult = mode.development(child);
      assert.strictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, true);
    });
    it("default options, NODE_ENV=production, no CLI argument -> production() == child, development() == noop", () => {
      const env = { NODE_ENV: "production" };
      const argv = ["node", "/path/to/gulp"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.strictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, true);
      const developmentResult = mode.development(child);
      assert.notStrictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, false);
    });
    it("default options, no NODE_ENV, CLI argument=--production -> production() == child, development() == noop", () => {
      const env = {};
      const argv = ["node", "/path/to/gulp", "--production"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.strictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, true);
      const developmentResult = mode.development(child);
      assert.notStrictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, false);
    });
    it("default options, NODE_ENV=production, CLI argument=--production -> production() == child, development() == noop", () => {
      const env = { NODE_ENV: "production" };
      const argv = ["node", "/path/to/gulp", "--production"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.strictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, true);
      const developmentResult = mode.development(child);
      assert.notStrictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, false);
    });
    it("default options, NODE_ENV=production, CLI argument=--development -> production() == child, development() == child", () => {
      const env = { NODE_ENV: "production" };
      const argv = ["node", "/path/to/gulp", "--development"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.strictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, true);
      const developmentResult = mode.development(child);
      assert.strictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, true);
    });
    it("default options, NODE_ENV=development, CLI argument=--production -> production() == child, development() == child", () => {
      const env = { NODE_ENV: "development" };
      const argv = ["node", "/path/to/gulp", "--production"];
      const child = new Object();
      const mode = gulpMode({}, env, argv);
      const productionResult = mode.production(child);
      assert.strictEqual(productionResult, child);
      const productionBoolean = mode.production();
      assert.strictEqual(productionBoolean, true);
      const developmentResult = mode.development(child);
      assert.strictEqual(developmentResult, child);
      const developmentBoolean = mode.development();
      assert.strictEqual(developmentBoolean, true);
    });
  });

  describe("gulp-mode test suite with custom options", () => {
    it("default options, no NODE_ENV, no CLI argument -> prod() == noop, dev() == noop, demo() == child", () => {
      const env = {};
      const argv = ["node", "/path/to/gulp"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.notStrictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, false);
      const devResult = mode.dev(child);
      assert.notStrictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, false);
      const demoResult = mode.demo(child);
      assert.strictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, true);
    });
    it("default options, NODE_ENV=prod, no CLI argument -> prod() == child, dev() == noop, demo() == noop", () => {
      const env = { NODE_ENV: "prod" };
      const argv = ["node", "/path/to/gulp"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.strictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, true);
      const devResult = mode.dev(child);
      assert.notStrictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, false);
      const demoResult = mode.demo(child);
      assert.notStrictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, false);
    });
    it("default options, no NODE_ENV, CLI argument=--prod -> prod() == child, dev() == noop, demo() == noop", () => {
      const env = {};
      const argv = ["node", "/path/to/gulp", "--prod"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.strictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, true);
      const devResult = mode.dev(child);
      assert.notStrictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, false);
      const demoResult = mode.demo(child);
      assert.notStrictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, false);
    });
    it("default options, NODE_ENV=prod, CLI argument=--prod -> prod() == child, dev() == noop, demo() == noop", () => {
      const env = { NODE_ENV: "prod" };
      const argv = ["node", "/path/to/gulp", "--prod"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.strictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, true);
      const devResult = mode.dev(child);
      assert.notStrictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, false);
      const demoResult = mode.demo(child);
      assert.notStrictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, false);
    });
    it("default options, NODE_ENV=prod, CLI argument=--dev -> prod() == child, dev() == child, demo() == noop", () => {
      const env = { NODE_ENV: "prod" };
      const argv = ["node", "/path/to/gulp", "--dev"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.strictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, true);
      const devResult = mode.dev(child);
      assert.strictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, true);
      const demoResult = mode.demo(child);
      assert.notStrictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, false);
    });
    it("default options, NODE_ENV=dev, CLI argument=--prod -> prod() == child, dev() == child, demo() == noop", () => {
      const env = { NODE_ENV: "dev" };
      const argv = ["node", "/path/to/gulp", "--prod"];
      const options = {
        modes: ["prod", "dev", "demo"],
        default: "demo",
        verbose: true
      };
      const child = new Object();
      const mode = gulpMode(options, env, argv);
      const prodResult = mode.prod(child);
      assert.strictEqual(prodResult, child);
      const prodBoolean = mode.prod();
      assert.strictEqual(prodBoolean, true);
      const devResult = mode.dev(child);
      assert.strictEqual(devResult, child);
      const devBoolean = mode.dev();
      assert.strictEqual(devBoolean, true);
      const demoResult = mode.demo(child);
      assert.notStrictEqual(demoResult, child);
      const demoBoolean = mode.demo();
      assert.strictEqual(demoBoolean, false);
    });
  });
});
