import assert from "node:assert";
import fs from "node:fs";
import { PassThrough } from "node:stream";
import DefaultRegistry from "undertaker-registry";

const originalInitCwd = process.env.INIT_CWD;

/**
 * Creates a PassThrough stream for simple testing
 * @returns {PassThrough} A pass-through stream in object mode
 */
export function createPassThrough() {
  return new PassThrough({ objectMode: true });
}

/**
 * Creates a mock taker object for testing
 * @param {Array} tasksCalled - Array to track called tasks
 * @param {Array} taskRegistry - Array to track task registry
 * @param {Function} [srcFn] - Optional custom src function
 * @param {Function} [destFn] - Optional custom dest function
 * @returns {Object} Mock taker with task, src, dest methods
 */
export function createMockTaker(tasksCalled, taskRegistry, srcFn, destFn) {
  return {
    task: (name, fn) => {
      tasksCalled.push({ name, fn });
      return taskRegistry;
    },
    src: srcFn || (() => createPassThrough()),
    dest: destFn || (() => createPassThrough())
  };
}

/**
 * Creates beforeEach hook for setting up test environment
 * @param {string} testDir - Test directory path
 * @returns {Function} beforeEach hook function
 */
export function setupTestEnv(testDir) {
  return () => {
    process.env.INIT_CWD = "/tmp/test-project";
    fs.mkdirSync(testDir, { recursive: true });
  };
}

/**
 * Creates afterEach hook for cleaning up test environment
 * @param {string} testDir - Test directory path
 * @returns {Function} afterEach hook function
 */
export function cleanupTestEnv(testDir) {
  return () => {
    process.env.INIT_CWD = originalInitCwd;
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  };
}

/**
 * Asserts basic registry properties
 * @param {Object} registry - The registry instance to test
 * @param {Object} mockConfig - Expected config
 * @param {Object} mockPathConfig - Expected pathConfig
 */
export function assertRegistryBasics(registry, mockConfig, mockPathConfig) {
  assert.ok(registry instanceof DefaultRegistry);
  assert.deepStrictEqual(registry.config, mockConfig);
  assert.deepStrictEqual(registry.pathConfig, mockPathConfig);
}
