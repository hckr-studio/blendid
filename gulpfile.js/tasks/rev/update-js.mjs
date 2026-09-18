import fs from "node:fs";
import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import revReplace from "#gulp-rev-rewrite/index.mjs";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class RevUpdateJsRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    const codeDir = (pathConfig.esm ?? pathConfig.esbuild)?.dest ?? "";
    this.paths = {
      codeDir,
      src: projectPath(pathConfig.dest, codeDir, "**", "*.js"),
      dest: projectPath(pathConfig.dest, codeDir),
      manifest: projectPath(pathConfig.dest, "rev-manifest.json")
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config.esbuild) return;
    task("update-js", () => {
      const relativePath = (s) => s.replace(this.paths.codeDir, ".");
      const manifest = fs.existsSync(this.paths.manifest)
        ? fs.readFileSync(this.paths.manifest)
        : null;
      return src(this.paths.src)
        .pipe(debug({ title: "update-js:", logger: logger.debug }))
        .pipe(
          revReplace({
            manifest,
            modifyUnreved: relativePath,
            modifyReved: relativePath
          })
        )
        .pipe(dest(this.paths.dest));
    });
  }
}
