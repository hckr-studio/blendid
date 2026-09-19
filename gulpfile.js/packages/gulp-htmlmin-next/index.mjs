import { Transform } from "node:stream";
import htmlmin from "html-minifier-next";
import PluginError from "plugin-error";

export default function index(options) {
  return new Transform({
    objectMode: true,
    async transform(file, encoding, next) {
      if (file.isNull()) {
        next(null, file);
        return;
      }

      const minify = async (buf, _, cb) => {
        try {
          const result = await htmlmin.minify(buf.toString(), options);
          const contents = Buffer.from(result);
          if (next === cb) {
            file.contents = contents;
            cb(null, file);
            return;
          }
          cb(null, contents);
          next(null, file);
        } catch (err) {
          const opts = Object.assign({}, options, { fileName: file.path });
          const error = new PluginError("gulp-htmlmin", err, opts);
          if (next !== cb) {
            next(error);
            return;
          }
          cb(error);
        }
      };

      if (file.isStream()) {
        file.contents = file.contents.pipe(
          new Transform({
            async transform(buf, enc, cb) {
              await minify(buf, enc, cb);
            }
          })
        );
      } else {
        await minify(file.contents, null, next);
      }
    }
  });
}
