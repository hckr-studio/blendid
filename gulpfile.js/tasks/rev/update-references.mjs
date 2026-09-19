import fs from "node:fs";
import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import revReplace from "#gulp-rev-rewrite";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

// 2) Update asset references with reved filenames in compiled css + js

export class RevUpdateReferencesRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    task("rev-update-references", () => {
      const manifestPath = projectPath(
        this.pathConfig.dest,
        "rev-manifest.json"
      );
      const manifest = fs.existsSync(manifestPath)
        ? fs.readFileSync(manifestPath)
        : null;
      const options =
        typeof this.config.production?.rev === "object"
          ? this.config.production.rev
          : {};

      return src(projectPath(this.pathConfig.dest, "**", "*.{css,js,mjs,map}"))
        .pipe(debug({ title: "update-references:", logger: logger.debug }))
        .pipe(revReplace(Object.assign(options, { manifest })))
        .pipe(dest(projectPath(this.pathConfig.dest)));
    });
  }
}
