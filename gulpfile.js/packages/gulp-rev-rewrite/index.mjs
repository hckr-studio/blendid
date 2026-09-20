import { Buffer } from "node:buffer";
import path from "node:path";
import { Transform } from "node:stream";
import PluginError from "plugin-error";

function relativePath(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

function replace(contents, manifest) {
  let newContents = contents;
  for (const { unreved, reved } of manifest) {
    const regexp = new RegExp(
      String.raw`(?<![\w\-])${RegExp.escape(unreved)}(?![\w.])`,
      "gv"
    );
    newContents = newContents.replace(regexp, () => reved);
  }
  return newContents;
}

export default function plugin({ manifest, ...options } = {}) {
  return new Transform({
    objectMode: true,

    construct(callback) {
      this.revisions = {};
      this.files = [];
      this.options = options;
      callback();
    },

    transform(file, _, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }

      if (file.isStream()) {
        return callback(
          new PluginError("gulp-rev-rewrite", "Streaming not supported")
        );
      }

      // Collect original and revisioned paths directly from the vinyl files in the stream
      if (file.revOrigPath) {
        const originalPath = relativePath(file.revOrigBase, file.revOrigPath);
        const revisionedPath = relativePath(file.base, file.path);
        this.revisions[originalPath] = revisionedPath;
      }

      this.files.push(file);
      callback();
    },

    flush(callback) {
      // Collect original and revisioned paths from a manifest
      if (manifest) {
        Object.assign(this.revisions, JSON.parse(manifest.toString()));
      }

      // Rewrite paths
      for (const file of this.files) {
        const modifiedRenames = Object.entries(this.revisions).map((entry) => {
          const [unreved, reved] = entry;
          const modifiedUnreved = this.options.modifyUnreved
            ? this.options.modifyUnreved(unreved, file)
            : unreved;
          const modifiedReved = this.options.modifyReved
            ? this.options.modifyReved(reved, file)
            : reved;
          return { unreved: modifiedUnreved, reved: modifiedReved };
        });
        const contents = file.contents.toString();
        const newContents = replace(contents, modifiedRenames);

        // Update contents only if they changed
        if (newContents !== contents) {
          file.contents = Buffer.from(newContents);
        }
        this.push(file);
      }
      callback();
    }
  });
}
