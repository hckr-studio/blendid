import path from "node:path";
import { Transform } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import PluginError from "plugin-error";
import Vinyl from "vinyl";
import { vinylFile } from "vinyl-file";

export default function (options) {
  if (!process.env.CLOUDINARY_URL) {
    if (!options.config) {
      throw new PluginError(
        "gulp-cloudinary-upload",
        "Missing cloudinary config",
        { showProperties: false }
      );
    }

    cloudinary.config(options.config);
  }

  if (typeof options.keyResolver !== "function") {
    options.keyResolver = (x) => path.basename(x);
  }

  return new Transform({
    objectMode: true,
    transform(file, enc, cb) {
      const uploadParams = Object.assign({ overwrite: false }, options.params, {
        public_id: path.basename(file.path, path.extname(file.path))
      });

      const manifestKey = options.keyResolver(file.path);
      if (typeof options.folderResolver === "function") {
        uploadParams.folder = options.folderResolver(file.path);
      }
      if (typeof options.getMetadata === "function") {
        uploadParams.metadata = Object.entries(options.getMetadata(file))
          .map(([k, v]) => `${k}=${v}`)
          .join("|");
      }

      if (file.isNull()) {
        cb(null, file);
        return;
      }

      if (file.isBuffer()) {
        cloudinary.uploader
          .upload_stream(uploadParams, (error, result) => {
            if (error) {
              return cb(
                new PluginError("gulp-cloudinary-upload", error.message)
              );
            }

            file.cloudinary = Object.assign(result, {
              original_filename: path.basename(
                file.path,
                path.extname(file.path)
              ),
              manifest_key: manifestKey
            });
            return cb(null, file);
          })
          .end(file.contents);
      }

      if (file.isStream()) {
        file.contents.pipe(
          cloudinary.uploader.upload_stream(uploadParams, (error, result) => {
            if (error) {
              return cb(
                new PluginError("gulp-cloudinary-upload", error.message)
              );
            }

            file.cloudinary = Object.assign(result, {
              original_filename: path.basename(
                file.path,
                path.extname(file.path)
              ),
              manifest_key: manifestKey
            });
            return cb(null, file);
          })
        );
      }
    }
  });
}

function getManifestFile(options) {
  return vinylFile(options.path, options).catch((error) => {
    if (error.code === "ENOENT") {
      return new Vinyl(options);
    }

    throw error;
  });
}

export function manifest(options) {
  options = Object.assign(
    {
      path: "cloudinary-manifest.json",
      merge: false
    },
    options
  );
  options.base = path.dirname(options.path);

  let manifest = {};

  return new Transform({
    objectMode: true,
    transform(file, enc, cb) {
      if (!file.cloudinary) {
        return cb();
      }

      const key = file.cloudinary.manifest_key;
      delete file.cloudinary.manifest_key;
      manifest[key] = file.cloudinary;
      cb();
    },
    flush(cb) {
      if (Object.keys(manifest).length === 0) {
        cb();
        return;
      }

      getManifestFile(options)
        .then((manifestFile) => {
          if (options.merge && !manifestFile.isNull()) {
            let oldManifest = {};

            try {
              oldManifest = JSON.parse(manifestFile.contents.toString());
            } catch (_) {}

            manifest = Object.assign(oldManifest, manifest);
          }

          manifestFile.contents = Buffer.from(
            JSON.stringify(manifest, null, 2)
          );
          this.push(manifestFile);
          cb();
        })
        .catch(cb);
    }
  });
}
