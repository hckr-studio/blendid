import { styleText } from "node:util";
import { logger } from "#lib/logger.mjs";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class InitConfigRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    task("init-config", () => {
      const cwd = import.meta.dirname;
      const configStream = src(["../path-config.json", "../task-config.mjs"], {
        cwd
      }).pipe(dest(projectPath("config")));

      logger.info(
        styleText(
          "green",
          "Adding default path-config.json and task-config.mjs files to ./config/"
        )
      );

      return configStream;
    });
  }
}
