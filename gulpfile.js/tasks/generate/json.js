const DefaultRegistry = require("undertaker-registry");
const { marked } = require("marked");
const markdownToJSON = require("gulp-markdown-to-json");
const merge = require("gulp-merge-json");
const projectPath = require("../../lib/projectPath");

class GenerateJsonRegistry extends DefaultRegistry {
  #ownTasks = new Set();
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  ownTasks() {
    return Array.from(this.#ownTasks);
  }

  init({ task, parallel, src, dest }) {
    if (!this.config.generate.json) return;

    function generateJson(sourcePath, destPath, { collection, mergeOptions }) {
      const generateJsonTask = () =>
        src(sourcePath)
          .pipe(markdownToJSON({ renderer: marked }))
          .pipe(
            merge({
              fileName: `${collection}.json`,
              ...mergeOptions,
            })
          )
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
module.exports = GenerateJsonRegistry;
