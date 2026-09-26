import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import Vinyl from "vinyl";
import data from "#gulp-data";
import htmlmin from "#gulp-htmlmin-next";
import gulpif from "#gulp-if";
import inject from "#gulp-inject";
import nunjucksRender from "#gulp-nunjucks-render";
import svgmin from "#gulp-svgmin";
import svgstore from "#gulp-svgstore";
import { cloneDeep } from "#lib/object.mjs";
import projectPath from "#lib/projectPath.mjs";
import {
  createDataFunction,
  createDataFunctionV2,
  getNunjucksRenderOptions,
  getPaths
} from "../html.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

async function createFile(item, route, template) {
  return new Vinyl({
    path: route(item),
    contents: fs.readFileSync(template),
    data: { item }
  });
}

function generateHtmlFile(route, template) {
  return new Transform({
    objectMode: true,
    transform(item, enc, done) {
      new Response(item.contents)
        .json()
        .then((data) =>
          Promise.all(
            data.map((x) =>
              createFile(x, route, template).then((x) => this.push(x))
            )
          )
        )
        .then(() => done());
    }
  });
}

export class GenerateHtmlRegistry extends DefaultRegistry {
  #ownTasks = new Set();

  constructor(config, pathConfig, mode) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.mode = mode;
  }

  ownTasks() {
    return Array.from(this.#ownTasks);
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, parallel, src, dest }) {
    if (!this.config.generate.html) return;

    const config = cloneDeep(this.config.html);
    const taskConfig = this.config;
    const pathConfig = this.pathConfig;
    const mode = this.mode;

    function generateHtml(
      sourcePath,
      destPath,
      { template, route, collection }
    ) {
      const paths = getPaths(taskConfig, pathConfig);
      const templatePath = projectPath(
        pathConfig.src,
        pathConfig.html.src,
        template
      );

      // opt-in new data layout
      const dataFunction =
        config.dataFunction ??
        (config.data
          ? createDataFunctionV2(config.data.collections, pathConfig, paths)
          : createDataFunction(config.collections, pathConfig, paths));

      const nunjucksRenderOptions = getNunjucksRenderOptions(
        config,
        pathConfig
      );

      const svgs = src(paths.spritesSrc)
        .pipe(
          svgmin((file) => {
            const prefix = path.basename(
              file.relative,
              path.extname(file.relative)
            );
            return {
              plugins: [
                "preset-default",
                { prefixIDs: { prefix } },
                {
                  cleanupIDs: {
                    prefix: prefix + "-",
                    minify: true,
                    force: true
                  }
                },
                "removeXMLNS"
              ]
            };
          })
        )
        .pipe(svgstore(taskConfig.svgSprite.svgstore));

      function generateHtmlTask() {
        return src(sourcePath)
          .pipe(debug({ title: "generate-html:", logger: logger.debug }))
          .pipe(generateHtmlFile(route, templatePath))
          .pipe(data(dataFunction))
          .pipe(nunjucksRender(nunjucksRenderOptions))
          .pipe(
            gulpif(
              Boolean(taskConfig.svgSprite),
              inject(svgs, {
                quiet: true,
                removeTags: true,
                transform: (_, file) => file.contents.toString()
              })
            )
          )
          .pipe(mode.production(htmlmin(config.htmlmin)))
          .pipe(dest(destPath));
      }

      generateHtmlTask.displayName = `generate-html-${collection}`;
      return generateHtmlTask;
    }

    function* createTasks(collections, pathConfig) {
      const dataPath = projectPath(pathConfig.src, pathConfig.data.src);
      const destPath = projectPath(pathConfig.dest, pathConfig.html.dest);
      for (const col of collections) {
        const mjsFile = projectPath(dataPath, `${col.collection}.mjs`);
        const jsonFile = projectPath(dataPath, `${col.collection}.json`);
        const sourcePath = fs.existsSync(mjsFile) ? mjsFile : jsonFile;
        yield generateHtml(sourcePath, destPath, col);
      }
    }

    task(
      "generate-html",
      parallel(
        Array.from(createTasks(this.config.generate.html, this.pathConfig))
      )
    );
    this.#ownTasks.add("generate-html");
  }
}
