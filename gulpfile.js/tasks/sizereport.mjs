import sizereport from "#gulp-sizereport";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class SizeReportRegistry extends Registry {
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
