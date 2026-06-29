import fs from "node:fs";
import path from "node:path";
import gulp from "gulp";
import data from "gulp-data";
import debug from "gulp-debug";
import htmlmin from "gulp-htmlmin-next";
import inject from "gulp-inject";
import nunjucksRender from "gulp-nunjucks-render";
import svgmin from "gulp-svgmin";
import svgstore from "gulp-svgstore";
import logger from "gulplog";
import cloneDeep from "lodash-es/cloneDeep.js";
import nunjucksMarkdown from "nunjucks-markdown";
import through2 from "through2";
import DefaultRegistry from "undertaker-registry";
import { marked } from "../lib/markdown.mjs";
import projectPath from "../lib/projectPath.mjs";

/** @typedef {import("@types/nunjucks").Environment} Environment */
/** @typedef {import("@types/gulp")} Undertaker */

export function dataFile(pathConfig, name) {
  const dataFolder = projectPath(pathConfig.src, pathConfig.data.src);
  const mjsFile = path.join(dataFolder, `${name}.mjs`);
  const jsonFile = path.join(dataFolder, `${name}.json`);
  return fs.existsSync(mjsFile) ? mjsFile : jsonFile;
}

export function readData(pathConfig) {
  return (name) => loadDataFile(dataFile(pathConfig, name));
}

export async function loadDataFile(dataFile) {
  if (!fs.existsSync(dataFile)) return null;
  const isJSON = path.extname(dataFile) === ".json";
  const dataModule = await import(
    `${dataFile}?${Date.now()}`, // prevent caching
    isJSON ? { with: { type: "json" } } : undefined
  );
  return dataModule.default;
}

export function createDataFunction(collections, pathConfig, paths) {
  return async () => {
    const data = (await loadDataFile(paths.dataPath)) ?? {};
    if (!(Array.isArray(collections) && pathConfig.data)) {
      return data;
    }
    const colsData = await Promise.all(collections.map(readData(pathConfig)));
    return collections.reduce(
      (acc, key, i) => Object.assign(acc, { [key]: colsData[i] }),
      data
    );
  };
}

export function createDataFunctionV2(cols, pathConfig, paths) {
  async function innerRead() {
    const data = (await loadDataFile(paths.dataPath)) ?? {};
    const colNames = Array.isArray(cols) ? cols : [];
    const colsData = await Promise.all(colNames.map(readData(pathConfig)));
    const collections = Object.fromEntries(
      colNames.map((key, i) => [key, colsData[i]])
    );
    return { data, collections };
  }
  let cache;
  return async (file) => {
    if (!cache) {
      cache = await innerRead();
    }
    const { data, collections } = cache;
    const htmlFile = file.relative.replace(".njk", ".html");
    const page = {
      url: htmlFile.replace("index.html", "/").replace("//", "/"),
      fileSlug: file.stem,
      date: file.stat?.mtime,
      inputPath: path.join(pathConfig.src, pathConfig.html.src, file.relative),
      outputPath: path.join(pathConfig.dest, pathConfig.html.dest, htmlFile),
      outputFileExtension: "html",
      templateSyntax: "nunjucks",
      rawInput: file.contents.toString("utf8"),
      lang: data?.meta?.lang
    };
    return Object.assign({ collections, page }, data);
  };
}

export function getPaths(taskConfig, pathConfig) {
  return {
    ignore: taskConfig.html.excludeFolders?.map((x) => `**/${x}/*`),
    src: projectPath(
      pathConfig.src,
      pathConfig.html.src,
      "**",
      taskConfig.html ? `*.{${taskConfig.html.extensions}}` : "*.html"
    ),
    spritesSrc: projectPath(pathConfig.src, pathConfig.icons.src, "*.svg"),
    dataPath: pathConfig.data
      ? projectPath(
          pathConfig.src,
          pathConfig.data.src,
          taskConfig.html?.dataFile ?? ""
        )
      : null,
    dest: projectPath(pathConfig.dest, pathConfig.html.dest)
  };
}

export function getNunjucksRenderOptions(config, pathConfig) {
  const {
    manageEnv,
    filters = {},
    globals = {},
    path: customPath,
    ...nunjucksRenderOptions
  } = config.nunjucksRender;
  nunjucksRenderOptions.path = customPath ?? [
    projectPath(pathConfig.src, pathConfig.html.src)
  ];
  /**
   * @param {Environment} env
   */
  nunjucksRenderOptions.manageEnv = (env) => {
    if (Array.isArray(config.markedExtensions)) {
      marked.use(...config.markedExtensions);
    }
    nunjucksMarkdown.register(env, marked.parse);
    for (const key of Object.keys(globals)) {
      env.addGlobal(key, globals[key]);
    }
    for (const filter of Object.keys(filters)) {
      env.addFilter(filter, filters[filter]);
    }
    if (typeof manageEnv === "function") {
      manageEnv(env);
    }
  };
  return nunjucksRenderOptions;
}

export class HtmlRegistry extends DefaultRegistry {
  constructor(config, pathConfig, mode) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.paths = getPaths(config, pathConfig);
    this.mode = mode;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest }) {
    if (!this.config.html) return;

    const config = cloneDeep(this.config.html);

    const htmlTask = () => {
      const pathConfig = this.pathConfig;
      // opt-in new data layout
      const dataFunction =
        config.dataFunction ??
        (config.data
          ? createDataFunctionV2(
              config.data.collections,
              pathConfig,
              this.paths
            )
          : createDataFunction(config.collections, pathConfig, this.paths));
      const nunjucksRenderOptions = getNunjucksRenderOptions(
        config,
        pathConfig
      );

      const svgs = this.config.svgSprite
        ? src(this.paths.spritesSrc)
            .pipe(
              svgmin((file) => {
                const prefix = path.basename(
                  file.relative,
                  path.extname(file.relative)
                );
                return {
                  plugins: [
                    "preset-default",
                    {
                      name: "prefixIDs",
                      params: { prefix }
                    },
                    {
                      name: "cleanupIDs",
                      params: {
                        prefix: `${prefix}-`,
                        minify: true,
                        force: true
                      }
                    },
                    "removeXMLNS"
                  ]
                };
              })
            )
            .pipe(debug({ title: "svgmin", logger: logger.debug }))
            .pipe(svgstore(this.config.svgSprite?.svgstore))
            .pipe(debug({ title: "svgstore", logger: logger.debug }))
        : null;

      return src(this.paths.src, { ignore: this.paths.ignore })
        .pipe(debug({ title: "html:", logger: logger.debug }))
        .pipe(data(dataFunction))
        .pipe(debug({ title: "html+data:", logger: logger.debug }))
        .pipe(nunjucksRender(nunjucksRenderOptions))
        .pipe(debug({ title: "html+njk:", logger: logger.debug }))
        .pipe(
          this.config.svgSprite
            ? inject(svgs, {
                quiet: true,
                removeTags: true,
                transform(_, file) {
                  return file.contents.toString();
                }
              })
            : through2.obj()
        )
        .pipe(
          this.config.svgSprite
            ? debug({ title: "injectsvg", logger: logger.debug })
            : through2.obj()
        )
        .pipe(this.mode.production(htmlmin(config.htmlmin)))
        .pipe(
          this.mode.production(
            debug({ title: "htmlmin:", logger: logger.debug })
          )
        )
        .pipe(dest(this.paths.dest));
    };
    const { alternateTask = () => htmlTask } = this.config;
    const finalTask = alternateTask(gulp, this.pathConfig, this.config);

    task("html", finalTask);
  }
}
