import debug from "gulp-debug";
import merge from "gulp-merge-json";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import markdownToJSON from "#gulp-markdown-to-json";
import { marked } from "#lib/markdown.mjs";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class GenerateJsonRegistry extends DefaultRegistry {
  #ownTasks = new Set();

  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  ownTasks() {
    return Array.from(this.#ownTasks);
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, parallel, src, dest }) {
    if (!this.config.generate.json) return;

    const defaultOptions = this.config["generate-json"].mergeOption;

    if (Array.isArray(this.config.html?.markedExtensions)) {
      marked.use(this.config.html.markedExtensions);
    }

    function generateJson(
      sourcePath,
      destPath,
      { collection, mergeOptions, ...restOptions }
    ) {
      const fileName = `${collection}.json`;
      const options = mergeOptions ?? defaultOptions;
      const generateJsonTask = () =>
        src(sourcePath)
          .pipe(debug({ title: "generate-json:", logger: logger.debug }))
          .pipe(
            markdownToJSON({
              renderer: marked,
              ...restOptions
            })
          )
          .pipe(merge(Object.assign({ fileName }, options)))
          .pipe(dest(destPath));
      generateJsonTask.displayName = `generate-json-${collection}`;
      return generateJsonTask;
    }

    function* createTasks(collections, pathConfig) {
      const dataPath = projectPath(pathConfig.src, pathConfig.data.src);
      for (const col of collections) {
        const sourcePath = projectPath(
          dataPath,
          col.srcGlob ?? `${col.collection}/**/*.md`
        );
        yield generateJson(sourcePath, dataPath, col);
      }
    }

    task(
      "generate-json",
      parallel(
        Array.from(createTasks(this.config.generate.json, this.pathConfig))
      )
    );
    this.#ownTasks.add("generate-json");
  }
}
