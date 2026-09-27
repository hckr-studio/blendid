import debug from "gulp-debug";
import gulpEsbuild from "gulp-esbuild";
import { logger } from "#lib/logger.mjs";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class ESBuildRegistry extends Registry {
  constructor(config, pathConfig, mode, verbose) {
    super();
    if (pathConfig.esbuild) {
      logger.warn(
        "`pathConfig.esbuild` is not supported. Use `pathConfig.esm` instead."
      );
    }
    const modulePathConfig = pathConfig.esm;
    this.config = config;
    this.paths = {
      src: projectPath(
        pathConfig.src,
        modulePathConfig?.src ?? "",
        config.extensions.length > 1
          ? `*.{${config.extensions}}`
          : `*.${config.extensions}`
      ),
      dest: projectPath(pathConfig.dest, modulePathConfig?.dest ?? "")
    };
    this.mode = mode;
    this.verbose = verbose;
    if (this.verbose) {
      this.config.options.logLevel = "debug";
    }
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config) return;

    task("esbuild", () =>
      src(this.paths.src)
        .pipe(debug({ title: "esbuild:", logger: logger.debug }))
        .pipe(gulpEsbuild(this.config.options))
        .pipe(dest(this.paths.dest))
    );
  }
}
