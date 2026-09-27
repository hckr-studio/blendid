import debug from "gulp-debug";
import { logger } from "#lib/logger.mjs";
import projectPath from "#lib/projectPath.mjs";
import { Registry } from "#lib/registry.mjs";

/** @typedef {import("@types/nunjucks").Environment} Environment */
/** @typedef {import("@types/gulp")} Undertaker */

export class CloudflareRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.paths = {
      src: projectPath(
        pathConfig.src,
        pathConfig.cloudflare?.src ?? "",
        "**",
        "*"
      ),
      dest: projectPath(pathConfig.dest, pathConfig.cloudflare?.dest ?? "")
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config) return;
    task("cloudflare-pages", () =>
      src(
        this.paths.src,
        Object.assign({ dot: true, encoding: false }, this.config.srcOptions)
      )
        .pipe(debug({ title: "static:", logger: logger.debug }))
        .pipe(dest(this.paths.dest))
    );
  }
}
