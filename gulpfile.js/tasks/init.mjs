import { Readable } from "node:stream";
import { styleText } from "node:util";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

async function* merge(streams) {
  for (const stream of streams) {
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

export class InitRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    task("init", () => {
      const cwd = import.meta.dirname;
      const configStream = src(["../path-config.mjs", "../task-config.mjs"], {
        cwd
      }).pipe(dest(projectPath("config")));

      const srcStream = src(["../../src/**/*", "../../src/**/.gitkeep"], {
        cwd
      }).pipe(dest(projectPath(this.pathConfig.src)));

      logger.info(
        styleText("green", "Generating default Blendid project files")
      );
      logger.info(
        styleText(
          "yellow",
          `
To start the dev server:
`
        ),
        styleText(
          "magenta",
          `
yarn blendid
`
        )
      );

      return Readable.from(merge([configStream, srcStream]));
    });
  }
}
