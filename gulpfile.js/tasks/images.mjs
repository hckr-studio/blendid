import changed from "gulp-changed";
import debug from "gulp-debug";
import { logger } from "#lib/logger.mjs";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class ImagesRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.paths = {
      src: projectPath(
        pathConfig.src,
        pathConfig.images?.src ?? "",
        "**",
        `*.{${config.extensions}}`
      ),
      dest: projectPath(pathConfig.dest, pathConfig.images?.dest ?? "")
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config) return;

    task("images", () =>
      src(this.paths.src, { encoding: false })
        .pipe(debug({ title: "images:", logger: logger.debug }))
        .pipe(changed(this.paths.dest))
        .pipe(dest(this.paths.dest))
    );
  }
}
