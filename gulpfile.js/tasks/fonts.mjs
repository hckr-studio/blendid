import changed from "gulp-changed";
import debug from "gulp-debug";
import { logger } from "#lib/logger.mjs";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class FontsRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.paths = {
      src: projectPath(
        pathConfig.src,
        pathConfig.fonts?.src ?? "",
        "**",
        config.extensions.length > 1
          ? `*.{${config.extensions}}`
          : `*.${config.extensions}`
      ),
      dest: projectPath(pathConfig.dest, pathConfig.fonts?.dest ?? "")
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config) return;

    task("fonts", () =>
      src(this.paths.src, { encoding: false })
        .pipe(debug({ title: "fonts:", logger: logger.debug }))
        .pipe(changed(this.paths.dest))
        .pipe(dest(this.paths.dest))
    );
  }
}
