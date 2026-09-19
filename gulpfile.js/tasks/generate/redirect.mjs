import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import debug from "gulp-debug";
import htmlmin from "gulp-htmlmin-next";
import logger from "gulplog";
import cloneDeep from "lodash-es/cloneDeep.js";
import DefaultRegistry from "undertaker-registry";
import Vinyl from "vinyl";
import nunjucksRender from "#gulp-nunjucks-render/index.mjs";
import projectPath from "#lib/projectPath.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

async function createFile(item, { host, route }) {
  const [originalUrl, targetUrl] = route(item);
  const path = originalUrl.endsWith("/")
    ? originalUrl + "index.html"
    : originalUrl;
  return new Vinyl({
    path,
    contents: Buffer.from(
      [
        `<!DOCTYPE html>`,
        `<meta charset=utf-8>`,
        `<title>This page has been moved</title>`,
        `<meta name=robots content=noindex>`,
        `<meta http-equiv=refresh content="0;url={{host}}{{targetUrl}}">`,
        `<link rel=canonical href="{{host}}{{targetUrl}}">`,
        `<script>window.location.replace(new URL("{{targetUrl}}", "{{host}}"));</script>`,
        `<p>This page has been moved to <a href="{{host}}{{targetUrl}}">{{host}}{{targetUrl}}</a>`
      ].join("")
    ),
    data: { host, targetUrl }
  });
}

function generateHtmlFile(col) {
  return new Transform({
    objectMode: true,
    transform(item, enc, done) {
      new Response(item.contents)
        .json()
        .then((data) =>
          Promise.all(
            data.map((x) => createFile(x, col).then((x) => this.push(x)))
          )
        )
        .then(() => done());
    }
  });
}

export class GenerateRedirectsRegistry extends DefaultRegistry {
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
    if (!this.config.generate.redirects) return;

    const config = cloneDeep(this.config.html);

    function generateRedirect(sourcePath, destPath, col) {
      function generateRedirectsTask() {
        return src(sourcePath)
          .pipe(debug({ title: "generate-redirect:", logger: logger.debug }))
          .pipe(generateHtmlFile(col))
          .pipe(nunjucksRender(config.nunjucksRender))
          .pipe(this.mode.production(htmlmin(config.htmlmin)))
          .pipe(dest(destPath));
      }

      generateRedirectsTask.displayName = `generate-redirect-${col.collection}`;
      return generateRedirectsTask;
    }

    function* createTasks(collections, pathConfig) {
      const dataPath = projectPath(pathConfig.src, pathConfig.data.src);
      const destPath = projectPath(pathConfig.dest, pathConfig.html.dest);
      for (const col of collections) {
        const mjsFile = path.join(dataPath, `${col.collection}.mjs`);
        const jsonFile = path.join(dataPath, `${col.collection}.json`);
        const sourcePath = fs.existsSync(mjsFile) ? mjsFile : jsonFile;
        yield generateRedirect(sourcePath, destPath, col);
      }
    }

    task(
      "generate-redirect",
      parallel(
        Array.from(createTasks(this.config.generate.redirects, this.pathConfig))
      )
    );
    this.#ownTasks.add("generate-redirect");
  }
}
