import path from "node:path";
import { Transform } from "node:stream";
import modifyFilename from "modify-filename";
import PluginError from "plugin-error";
import revHash from "rev-hash";
import { revPath } from "rev-path";
import sortKeys from "sort-keys";
import Vinyl from "vinyl";
import { vinylFile } from "vinyl-file";

function relativePath(base, filePath) {
  filePath = filePath.replace(/\\/g, "/");
  base = base.replace(/\\/g, "/");

  if (!filePath.startsWith(base)) {
    return filePath;
  }

  const newPath = filePath.slice(base.length);

  if (newPath[0] === "/") {
    return newPath.slice(1);
  }

  return newPath;
}

function transformFilename(file) {
  // Save the old path for later
  file.revOrigPath = file.path;
  file.revOrigBase = file.base;
  file.revHash = revHash(file.contents);

  file.path = modifyFilename(file.path, (filename, extension) => {
    const extIndex = filename.lastIndexOf(".");

    filename =
      extIndex === -1
        ? revPath(filename, file.revHash)
        : revPath(filename.slice(0, extIndex), file.revHash) +
          filename.slice(extIndex);

    return filename + extension;
  });
}

async function getManifestFile(options) {
  try {
    return await vinylFile(options.path, options);
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Vinyl(options);
    }
    throw error;
  }
}

const plugin = () => {
  const sourcemaps = [];
  const pathMap = {};

  return new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      if (file.isNull()) {
        callback(null, file);
        return;
      }

      if (file.isStream()) {
        callback(new PluginError("gulp-rev", "Streaming not supported"));
        return;
      }

      // This is a sourcemap, hold until the end
      if (path.extname(file.path) === ".map") {
        sourcemaps.push(file);
        callback();
        return;
      }

      const oldPath = file.path;
      transformFilename(file);
      pathMap[oldPath] = file.revHash;

      callback(null, file);
    },
    flush(callback) {
      for (const file of sourcemaps) {
        let reverseFilename;

        // Attempt to parse the sourcemap's JSON to get the reverse filename
        try {
          reverseFilename = JSON.parse(file.contents.toString()).file;
        } catch (_) {}

        if (!reverseFilename) {
          reverseFilename = path.relative(
            path.dirname(file.path),
            path.basename(file.path, ".map")
          );
        }

        if (pathMap[reverseFilename]) {
          // Save the old path for later
          file.revOrigPath = file.path;
          file.revOrigBase = file.base;

          const hash = pathMap[reverseFilename];
          file.path = revPath(file.path.replace(/\.map$/, ""), hash) + ".map";
        } else {
          transformFilename(file);
        }

        this.push(file);
      }

      callback();
    }
  });
};

async function createManifest(manifest, transform, options) {
  const manifestFile = await getManifestFile(options);

  if (options.merge && !manifestFile.isNull()) {
    let oldManifest = {};

    try {
      oldManifest = options.transformer.parse(manifestFile.contents.toString());
    } catch (_) {}

    manifest = Object.assign(oldManifest, manifest);
  }

  manifestFile.contents = Buffer.from(transform(manifest));
  return manifestFile;
}

plugin.manifest = (path_, options) => {
  if (typeof path_ === "string") {
    path_ = { path: path_ };
  }

  options = {
    path: "rev-manifest.json",
    merge: false,
    transformer: JSON,
    ...options,
    ...path_
  };

  const manifest = {};

  return new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      // Ignore all non-rev'd files
      if (!file.path || !file.revOrigPath) {
        callback();
        return;
      }

      const revisionedFile = relativePath(
        path.resolve(file.cwd, file.base),
        path.resolve(file.cwd, file.path)
      );
      const originalFile = path
        .join(path.dirname(revisionedFile), path.basename(file.revOrigPath))
        .replace(/\\/g, "/");

      manifest[originalFile] = revisionedFile;
      callback();
    },
    flush(callback) {
      // No need to write a manifest file if there's nothing to manifest
      if (Object.keys(manifest).length === 0) {
        callback();
        return;
      }

      const push = (file) => this.push(file);
      const transformRevManifest = (manifest) =>
        options.transformer.stringify(sortKeys(manifest), undefined, 2);
      const toRootRelativePaths = ([key, val]) => [`/${key}`, `/${val}`];
      const transformImportmap = (manifest) =>
        options.transformer.stringify(
          {
            imports: sortKeys(
              Object.fromEntries(
                Object.entries(manifest).map(toRootRelativePaths)
              )
            )
          },
          undefined,
          2
        );

      const transformations = [
        createManifest(manifest, transformRevManifest, options).then((x) =>
          push(x)
        )
      ];

      if (options.importmap) {
        const importmapPath = path.join(
          path.dirname(options.path),
          "import-map.importmap"
        );
        transformations.unshift(
          createManifest(
            manifest,
            transformImportmap,
            Object.assign({}, options, { path: importmapPath })
          ).then((x) => push(x))
        );
      }
      (async () => {
        try {
          await Promise.all(transformations);
          callback();
        } catch (error) {
          callback(error);
        }
      })();
    }
  });
};

export default plugin;
