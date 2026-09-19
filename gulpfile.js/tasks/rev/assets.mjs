import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import rev from "#gulp-rev";
import revdel from "#gulp-rev-delete-original";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class RevAssetsRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    // 1) Add md5 hashes to assets referenced by CSS and JS files
    task("rev-assets", () => {
      // Ignore files that may reference assets. We'll rev them next.
      const ignore = [
        `${projectPath(this.pathConfig.dest, "**", "*.{css,js,mjs,map,json,html,txt}")}`
      ]
        .concat(
          (this.config.production?.rev?.exclude ?? []).map((x) =>
            projectPath(this.pathConfig.dest, x)
          )
        )
        .filter(Boolean);

      return src(projectPath(this.pathConfig.dest, "**", "*"), {
        ignore,
        encoding: false
      })
        .pipe(debug({ title: "rev-assets:", logger: logger.debug }))
        .pipe(rev())
        .pipe(dest(projectPath(this.pathConfig.dest)))
        .pipe(revdel())
        .pipe(
          rev.manifest(projectPath(this.pathConfig.dest, "rev-manifest.json"), {
            merge: true
          })
        )
        .pipe(dest("."));
    });
  }
}
