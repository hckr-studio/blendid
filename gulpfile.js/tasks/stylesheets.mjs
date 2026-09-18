import debug from "gulp-debug";
import postcss from "gulp-postcss";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import getPostCSSPlugins from "#lib/postCSS.mjs";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class StyleSheetsRegistry extends DefaultRegistry {
  constructor(config, pathConfig, mode) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.paths = {
      src: projectPath(
        pathConfig.src,
        pathConfig.stylesheets?.src ?? "",
        "**",
        config.extensions.length > 1
          ? `*.{${config.extensions}}`
          : `*.${config.extensions}`
      ),
      dest: projectPath(pathConfig.dest, pathConfig.stylesheets?.dest ?? "")
    };
    this.mode = mode;
  }

  /**
   * @param {Undertaker} taker
   */
  init(taker) {
    if (!this.config) return;

    const { task, src, dest } = taker;
    const { config, paths, mode } = this;

    function postcssTask() {
      const { plugins: userPlugins, ...postCssConfig } = config.postcss ?? {};
      const plugins = getPostCSSPlugins(config, userPlugins, mode);
      return src(paths.src)
        .pipe(debug({ title: "stylesheets:", logger: logger.debug }))
        .pipe(postcss(plugins, postCssConfig))
        .pipe(debug({ title: "postcss:", logger: logger.debug }))
        .pipe(dest(paths.dest));
    }

    const { alternateTask = () => postcssTask } = config;
    const stylesheetsTask = alternateTask(
      taker,
      this.pathConfig,
      config,
      this.mode
    );

    task("stylesheets", stylesheetsTask);
  }
}
