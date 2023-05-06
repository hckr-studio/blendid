import DefaultRegistry from "undertaker-registry";
import revdel from "gulp-rev-delete-original";
import rev from "../../packages/gulp-rev/index.js";
import projectPath from "../../lib/projectPath.mjs";
// 3) Rev and compress CSS and JS files (this is done after assets, so that if a
//    referenced asset hash changes, the parent hash will change as well

export class RevImportmapsCodeRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  init({ task, src, dest }) {
    task("rev-importmaps-code", () =>
      src([projectPath(this.pathConfig.dest, "**", "*.{js,mjs}")])
        .pipe(rev())
        .pipe(dest(projectPath(this.pathConfig.dest)))
        .pipe(revdel())
        .pipe(
          rev.manifest(projectPath(this.pathConfig.dest, "rev-manifest.json"), {
            merge: true,
            importmap: this.config.production?.rev?.importmap,
          })
        )
        .pipe(dest("."))
    );
  }
}
