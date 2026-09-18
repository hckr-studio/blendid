import sizereport from "gulp-sizereport";
import DefaultRegistry from "undertaker-registry";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class SizeReportRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src }) {
    task("size-report", () =>
      src(projectPath(this.pathConfig.dest, "**", "*"), {
        encoding: false,
        ignore: "rev-manifest.json"
      }).pipe(sizereport(this.config))
    );
  }
}
