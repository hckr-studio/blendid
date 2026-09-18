import changed from "gulp-changed";
import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class StaticRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.paths = {
      src: projectPath(pathConfig.src, pathConfig.static?.src ?? "", "**", "*"),
      dest: projectPath(pathConfig.dest, pathConfig.static?.dest ?? "")
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config) return;

    task("static", () =>
      src(
        this.paths.src,
        Object.assign({ dot: true, encoding: false }, this.config.srcOptions)
      )
        .pipe(debug({ title: "static:", logger: logger.debug }))
        .pipe(changed(this.paths.dest))
        .pipe(dest(this.paths.dest))
    );
  }
}
