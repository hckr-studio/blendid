import fs from "node:fs";
import DefaultRegistry from "undertaker-registry";
import when from "gulp-if";
import revReplace from "gulp-rev-rewrite";
import inject from "gulp-inject";
import projectPath from "../../lib/projectPath.mjs";
import debug from "gulp-debug";
import logger from "gulplog";

/** @typedef {import("@types/gulp")} Undertaker */

// 4) Update asset references in HTML

export class RevUpdateHtmlRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config.html) return;
    task("update-html", () => {
      const manifestPath = projectPath(
        this.pathConfig.dest,
        "rev-manifest.json"
      );
      const manifest = fs.existsSync(manifestPath)
        ? fs.readFileSync(manifestPath)
        : null;
      const importmap = src(
        projectPath(this.pathConfig.dest, "import-map.importmap"),
        { allowEmpty: true }
      );
      return src(
        projectPath(
          this.pathConfig.dest,
          this.pathConfig.html.dest,
          "**",
          "*.html"
        )
      )
        .pipe(debug({ title: "update-html:", logger: logger.debug }))
        .pipe(revReplace({ manifest }))
        .pipe(
          when(
            this.config.production?.rev?.importmap,
            inject(importmap, {
              quiet: true,
              removeTags: true,
              transform: (_, file) => file.contents.toString()
            })
          )
        )
        .pipe(
          dest(projectPath(this.pathConfig.dest, this.pathConfig.html.dest))
        );
    });
  }
}
