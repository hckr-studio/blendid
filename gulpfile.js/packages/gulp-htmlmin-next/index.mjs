import { Transform } from "node:stream";
import htmlmin from "html-minifier";
import PluginError from "plugin-error";

export default function index(options) {
  return new Transform({
    objectMode: true,
    transform(file, encoding, next) {
      if (file.isNull()) {
        next(null, file);
        return;
      }

      const minify = (buf, _, cb) => {
        try {
          const contents = Buffer.from(htmlmin.minify(buf.toString(), options));
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
            transform(buf, enc, cb) {
              minify(buf, enc, cb);
            }
          })
        );
      } else {
        minify(file.contents, null, next);
      }
    }
  });
}
