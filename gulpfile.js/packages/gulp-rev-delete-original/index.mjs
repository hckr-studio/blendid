import { rm } from "node:fs/promises";
import { Transform } from "node:stream";

/**
 * Return a stream for deleting the original file
 * @param   {object}          [options]
 * @param   {RegExp|function} [options.exclude]
 * @param   {function}        [options.remove]
 * @returns {function}
 */
export default function (options) {
  const exclude = options?.exclude ?? false;
  const remove = options?.remove ?? rm;

  options = options || {};
  return new Transform({
    objectMode: true,
    transform(file, _, cb) {
      //delete the original file
      async function del() {
        if (!file.revOrigPath) return;
        await remove(file.revOrigPath);
        return file;
      }

      //don't delete files that haven't been rewritten
      if (file.revOrigPath === file.path) {
        cb(null, file);
      }

      //exclude files from being deleted
      if (exclude) {
        let excluded;
        const filter = exclude;

        if (typeof filter === "function") {
          excluded = filter(file);
        } else if (filter instanceof RegExp) {
          excluded = filter.test(file.path);
        }

        if (excluded) {
          cb(null, file);
        } else {
          //delete the original file
          del()
            .then((f) => cb(null, f))
            .catch((ex) => cb(ex));
        }
      } else {
        //delete the original file
        del()
          .then((f) => cb(null, f))
          .catch((ex) => cb(ex));
      }
    }
  });
}
