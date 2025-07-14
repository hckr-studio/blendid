import fs from "node:fs";
import path from "node:path";
import changed from "gulp-changed";
import debug from "gulp-debug";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import projectPath from "../lib/projectPath.mjs";
import cloudinaryUpload, {
  manifest
} from "../packages/gulp-cloudinary-upload/index.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

function readManifest(path) {
  if (!path) return null;
  return fs.promises
    .readFile(path, "utf-8")
    .then((x) => JSON.parse(x))
    .catch(() => null);
}

export class CloudinaryRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.paths = {
      src: projectPath(pathConfig.src, pathConfig.cloudinary?.src ?? ""),
      dest: projectPath(pathConfig.src, pathConfig.data?.src ?? ""),
      manifest: config.manifest
        ? projectPath(
            pathConfig.src,
            pathConfig.data?.src ?? "",
            config.manifest
          )
        : null
    };
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src, dest, lastRun }) {
    if (!this.config) return;
    const { extensions, force, ...config } = this.config;
    const paths = this.paths;
    const pathConfig = this.pathConfig;

    function getRelativePath(filePath) {
      return path.relative(
        paths.src,
        path.resolve(import.meta.dirname, path.dirname(filePath))
      );
    }

    function getRelativeFilePath(filePath) {
      return path.relative(
        paths.src,
        path.resolve(import.meta.dirname, filePath)
      );
    }

    const cloudinaryTask = () =>
      src(
        path.join(
          paths.src,
          "**",
          extensions.length > 1 ? `*.{${extensions}}` : `*.${extensions}`
        ),
        {
          encoding: false,
          since: lastRun(cloudinaryTask)
        }
      )
        .pipe(debug({ title: "cloudinary:", logger: logger.debug }))
        .pipe(
          changed(paths.dest, {
            async hasChanged(sourceFile, targetPath) {
              if (force) return true;
              const manifest = await readManifest(paths.manifest);
              const imagePath = getRelativeFilePath(sourceFile.path);
              if (!manifest?.[imagePath]) {
                return sourceFile;
              }
            }
          })
        )
        .pipe(
          cloudinaryUpload({
            folderResolver(filePath) {
              const relativePath = getRelativePath(filePath);
              const { dest } = pathConfig.cloudinary;
              if (!(relativePath || dest)) return "";
              return path.join(dest, relativePath);
            },
            keyResolver(filePath) {
              return path.relative(
                paths.src,
                path.resolve(import.meta.dirname, filePath)
              );
            },
            ...config
          })
        )
        .pipe(
          manifest({
            path: paths.manifest,
            merge: true
          })
        )
        .pipe(dest(paths.dest));

    task("cloudinary", cloudinaryTask);
  }
}
