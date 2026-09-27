import { deleteAsync } from "del";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class CleanRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task }) {
    task("clean", () => {
      const patterns = this.config?.patterns
        ? this.config.patterns
        : projectPath(this.pathConfig.dest);
      return deleteAsync(patterns, { force: true });
    });
  }
}
