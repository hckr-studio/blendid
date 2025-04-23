/*
  gulpfile.js
  ===========
  Rather than manage one giant configuration file responsible
  for creating multiple tasks, each task has been broken out into
  its own file in gulpfile.js/tasks.
*/

import gulp from "gulp";
import logger from "gulplog";
import gulp_mode from "gulp-mode";
import getEnabledTasks from "./lib/getEnabledTasks.mjs";
import { getPathConfig } from "./lib/getPathConfig.mjs";
import { getTaskConfig } from "./lib/getTaskConfig.mjs";
import { CleanRegistry } from "./tasks/clean.mjs";
import { CloudflareRegistry } from "./tasks/cloudflare.mjs";
import { CloudinaryRegistry } from "./tasks/cloudinary.mjs";
import { ESBuildRegistry } from "./tasks/esbuild.mjs";
import { FontsRegistry } from "./tasks/fonts.mjs";
import { GenerateRegistry } from "./tasks/generate.mjs";
import { HtmlRegistry } from "./tasks/html.mjs";
import { ImagesRegistry } from "./tasks/images.mjs";
import { ImportWPRegistry } from "./tasks/import-wp.mjs";
import { InitRegistry } from "./tasks/init.mjs";
import { InitConfigRegistry } from "./tasks/init-config.mjs";
import { SizeReportRegistry } from "./tasks/sizereport.mjs";
import { StaticRegistry } from "./tasks/static.mjs";
import { StyleSheetsRegistry } from "./tasks/stylesheets.mjs";
import { ViteRegistry } from "./tasks/vite.mjs";
import { WatchRegistry } from "./tasks/watch.mjs";
import { RevRegistry } from "./tasks/rev.mjs";
import projectPath from "./lib/projectPath.mjs";

const verbose = new Set(process.argv).has("-LLLL");
const mode = gulp_mode({ verbose });
const pathConfig = await getPathConfig(verbose);
logger.info("Building sources", projectPath(pathConfig.src));

const taskConfig = await getTaskConfig(mode, verbose);

gulp.registry(new CleanRegistry(taskConfig.clean, pathConfig, mode, verbose));
gulp.registry(
  new CloudflareRegistry(taskConfig.cloudflare, pathConfig, mode, verbose)
);
gulp.registry(
  new CloudinaryRegistry(taskConfig.cloudinary, pathConfig, mode, verbose)
);
gulp.registry(
  new ESBuildRegistry(taskConfig.esbuild, pathConfig, mode, verbose)
);
gulp.registry(new FontsRegistry(taskConfig.fonts, pathConfig, mode, verbose));
gulp.registry(new GenerateRegistry(taskConfig, pathConfig, mode, verbose));
gulp.registry(new HtmlRegistry(taskConfig, pathConfig, mode, verbose));
gulp.registry(new ImagesRegistry(taskConfig.images, pathConfig, mode, verbose));
gulp.registry(new ImportWPRegistry(taskConfig, pathConfig, mode, verbose));
gulp.registry(new InitRegistry(taskConfig, pathConfig, mode, verbose));
gulp.registry(new InitConfigRegistry(taskConfig, pathConfig, mode, verbose));
gulp.registry(new StaticRegistry(taskConfig.static, pathConfig, mode, verbose));
gulp.registry(
  new StyleSheetsRegistry(taskConfig.stylesheets, pathConfig, mode, verbose)
);

// Register user provided registries
if (Array.isArray(taskConfig.registries)) {
  for (const registry of taskConfig.registries) {
    registry.mode = mode;
    registry.verbose = verbose;
    gulp.registry(registry);
  }
}

function devTasks() {
  process.env.NODE_ENV = "development";
  gulp.registry(new ViteRegistry(taskConfig.vite, pathConfig, mode));
  gulp.registry(new WatchRegistry(taskConfig, pathConfig, mode));

  const { assetTasks, codeTasks } = getEnabledTasks(taskConfig);
  const html = taskConfig.html ? "html" : null;
  const cloudflarePages = taskConfig.cloudflare ? "cloudflare-pages" : null;
  const generate = taskConfig.generate ? "generate" : null;
  const staticFiles = taskConfig.static ? "static" : null;
  const { prebuild, postbuild, code, assets, posthtml } =
    taskConfig.additionalTasks.development;

  if (assets) assetTasks.push(...assets);
  if (code) codeTasks.push(...code);

  return [
    "clean",
    cloudflarePages,
    prebuild && gulp.series(prebuild),
    generate,
    assetTasks && gulp.parallel(assetTasks),
    codeTasks && gulp.parallel(codeTasks),
    html,
    posthtml && gulp.series(posthtml),
    staticFiles,
    postbuild && gulp.series(postbuild),
    "watch"
  ].filter(Boolean);
}

function prodTasks() {
  process.env.NODE_ENV = "production";
  gulp.registry(
    new SizeReportRegistry(taskConfig.sizeReport, pathConfig, mode)
  );
  gulp.registry(new RevRegistry(taskConfig, pathConfig, mode));

  const { assetTasks, codeTasks } = getEnabledTasks(taskConfig);
  const rev = taskConfig.production.rev ? "rev" : null;
  const html = taskConfig.html ? "html" : null;
  const cloudflarePages = taskConfig.cloudflare ? "cloudflare-pages" : null;
  const generate = taskConfig.generate ? "generate" : null;
  const staticFiles = taskConfig.static ? "static" : null;
  const { prebuild, postbuild, code, assets, posthtml } =
    taskConfig.additionalTasks.production;

  if (assets) assetTasks.push(...assets);
  if (code) codeTasks.push(...code);

  return [
    "clean",
    cloudflarePages,
    prebuild && gulp.series(prebuild),
    generate,
    assetTasks && gulp.parallel(assetTasks),
    codeTasks && gulp.parallel(codeTasks),
    html,
    posthtml && gulp.series(posthtml),
    rev,
    staticFiles,
    postbuild && gulp.series(postbuild),
    "size-report"
  ].filter(Boolean);
}

export const build = gulp.series(prodTasks());
export const dev = gulp.series(devTasks());
export default dev;
