import { rimraf } from "rimraf";
import { objectTransform } from "through2";

/**
 * Return a stream for deleting the original file
 * @param   {object}          [options]
 * @param   {RegExp|function} [options.exclude]
 * @param   {function}        [options.remove]
 * @returns {function}
 */
export default function (options) {
  const exclude = options?.exclude ?? false;
  const remove = options?.remove ?? rimraf;

  options = options || {};
  return objectTransform(async (file) => {
    //delete the original file
    async function del() {
      if (file.revOrigPath) {
        await remove(file.revOrigPath);
      }
    }

    //don't delete files that haven't been rewritten
    if (file.revOrigPath === file.path) {
      return file;
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
        return file;
      } else {
        //delete the original file
        return del();
      }
    } else {
      //delete the original file
      return del();
    }
  });
}
