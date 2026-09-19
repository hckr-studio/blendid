import { Transform } from "node:stream";
import PluginError from "plugin-error";

function plugin(data) {
  // if necessary check for required param(s), e.g. options hash, etc.
  if (!data) {
    throw new PluginError("gulp-data", "No data supplied");
  }

  return new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      let called = false;

      const handle = (err, result) => {
        // extra guard in case
        if (called) return;
        called = true;
        if (err) {
          this.emit("error", new PluginError("gulp-data", { message: err }));
          return callback();
        }
        file.data = Object.assign(file.data ?? {}, result);
        this.push(file);
        callback();
      };

      function local(data) {
        if (data && typeof data.then === "function") {
          data.then(
            (data) => handle(undefined, data),
            (err) => handle(err)
          );
        } else {
          handle(undefined, data);
        }
      }

      let res = null;
      if (typeof data === "function") {
        try {
          res = data(file, handle);
        } catch (e) {
          handle(e);
        }

        if (data.length <= 1) {
          local(res);
        }

        return;
      }

      local(data);
    }
  });
}

export default plugin;
