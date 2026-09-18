import DefaultRegistry from "undertaker-registry";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

function getTaskPathFor(taskName, pathConfig) {
  switch (taskName) {
    case "iconFont":
      return pathConfig.icons;
    case "svgSprite":
      return pathConfig.icons;
    case "generate":
      return pathConfig.data;
    case "esbuild":
      return pathConfig.esm;
    default:
      return pathConfig[taskName];
  }
}

export class WatchRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, series, watch }) {
    task(
      "watch",
      series("vite", (done) => {
        const watchableTasks = [
          "fonts",
          "iconFont",
          "images",
          "cloudinary",
          "svgSprite",
          "generate",
          "html",
          "stylesheets",
          "esbuild",
          "static"
        ].concat(this.config.watch?.tasks);

        watchableTasks.forEach((taskName) => {
          const taskConfig = this.config[taskName];
          const taskPath = getTaskPathFor(taskName, this.pathConfig);

          if (taskConfig && taskPath) {
            const srcPath = projectPath(this.pathConfig.src, taskPath.src);
            const globPattern = `**/*${
              taskConfig.extensions ? `.{${taskConfig.extensions}}` : ""
            }`;
            const exclude = taskConfig.exclude ? `${taskConfig.exclude}` : null;
            const extraWatch = taskConfig.watch ?? "";
            watch(
              [globPattern, extraWatch],
              { cwd: srcPath, ignored: exclude },
              task(taskName)
            );
          }
        });
        watch(
          ["**/*.{json,mjs}"],
          { cwd: projectPath(this.pathConfig.src, this.pathConfig.data.src) },
          task("html")
        );
        done();
      })
    );
  }
}
