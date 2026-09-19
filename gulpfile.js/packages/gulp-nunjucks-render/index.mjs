import { basename, dirname, extname, join } from "node:path";
import { Transform } from "node:stream";
import nunjucks from "nunjucks";
import PluginError from "plugin-error";

function replaceExtension(filePath, newExt) {
  const dir = dirname(filePath);
  const base = basename(filePath, extname(filePath));
  return join(dir, base + newExt);
}

function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value);
  }
  if (typeof value === "function") {
    return value;
  }
  // Handle Temporal objects - check for any Temporal type
  if (typeof Temporal !== "undefined") {
    if (
      value instanceof Temporal.PlainDate ||
      value instanceof Temporal.PlainTime ||
      value instanceof Temporal.PlainDateTime ||
      value instanceof Temporal.ZonedDateTime ||
      value instanceof Temporal.PlainMonthDay ||
      value instanceof Temporal.PlainYearMonth ||
      value instanceof Temporal.Duration ||
      value instanceof Temporal.Instant
    ) {
      return Temporal[value.constructor.name].from(value);
    }
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const result = {};
  for (const key in value) {
    if (Object.hasOwn(value, key)) {
      result[key] = deepClone(value[key]);
    }
  }
  return result;
}

function deepMerge(a, b) {
  if (a == null || b == null) return b != null ? deepClone(b) : deepClone(a);
  const result = deepClone(a);
  for (const key in b) {
    if (Object.hasOwn(b, key)) {
      const val = b[key];
      if (
        result[key] != null &&
        typeof result[key] === "object" &&
        typeof val === "object" &&
        !Array.isArray(val)
      ) {
        result[key] = deepMerge(result[key], val);
      } else {
        result[key] = deepClone(val);
      }
    }
  }
  return result;
}

function defaultsDeep(target, source) {
  const result = deepClone(source);
  for (const key in target) {
    if (Object.hasOwn(target, key)) {
      const val = target[key];
      if (
        result[key] != null &&
        typeof result[key] === "object" &&
        typeof val === "object" &&
        !Array.isArray(val)
      ) {
        result[key] = deepMerge(result[key], deepClone(val));
      } else if (val !== undefined) {
        result[key] = deepClone(val);
      }
    }
  }
  return result;
}

const PLUGIN_NAME = "gulp-nunjucks";
const DEFAULT_OPTIONS = {
  path: ".",
  ext: ".html",
  data: {},
  inheritExtension: false,
  envOptions: {
    watch: false
  },
  manageEnv: null
};

class NunjucksTransform extends Transform {
  constructor(userOptions) {
    super({ objectMode: true });
    const options = defaultsDeep(userOptions ?? {}, DEFAULT_OPTIONS);

    nunjucks.configure(options.envOptions);

    if (!options.loaders) {
      options.loaders = new nunjucks.FileSystemLoader(options.path);
    }

    this.nunjucksEnv = new nunjucks.Environment(
      options.loaders,
      options.envOptions
    );

    if (typeof options.manageEnv === "function") {
      options.manageEnv.call(null, this.nunjucksEnv);
    }

    this.options = options;
  }

  _transform(file, enc, cb) {
    const { nunjucksEnv, options } = this;
    let data = deepClone(options.data);

    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.data) {
      data = deepMerge(file.data, data);
    }

    if (file.isStream()) {
      this.emit(
        "error",
        new PluginError(PLUGIN_NAME, "Streaming not supported")
      );
      return cb();
    }

    const filePath = file.path;

    try {
      nunjucksEnv.renderString(
        file.contents.toString(),
        data,
        (err, result) => {
          if (err) {
            this.emit(
              "error",
              new PluginError(PLUGIN_NAME, err, { fileName: filePath })
            );
            return cb();
          }
          file.contents = Buffer.from(result);
          // Replace file extension if inheritExtension is false
          if (!options.inheritExtension) {
            file.path = replaceExtension(filePath, options.ext);
          }
          this.push(file);
          cb();
        }
      );
    } catch (err) {
      this.emit(
        "error",
        new PluginError(PLUGIN_NAME, err, { fileName: filePath })
      );
      cb();
    }
  }
}

export default function (userOptions) {
  return new NunjucksTransform(userOptions);
}

export { deepClone };
