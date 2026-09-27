import { basename, dirname, extname, join } from "node:path";
import { Transform } from "node:stream";
import nunjucks from "@11ty/nunjucks";
import PluginError from "plugin-error";
import { cloneDeep } from "#lib/object.mjs";

function replaceExtension(filePath, newExt) {
  const dir = dirname(filePath);
  const base = basename(filePath, extname(filePath));
  return join(dir, base + newExt);
}

export const deepClone = cloneDeep;

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

    // In @11ty/nunjucks@4.0.0-alpha.3, renderString always returns a Promise
    // We need to use async/await to properly handle it
    (async () => {
      try {
        const result = await nunjucksEnv.renderString(
          file.contents.toString(),
          data
        );
        file.contents = Buffer.from(result);
        // Replace file extension if inheritExtension is false
        if (!options.inheritExtension) {
          file.path = replaceExtension(filePath, options.ext);
        }
        this.push(file);
        cb();
      } catch (err) {
        this.emit(
          "error",
          new PluginError(PLUGIN_NAME, err, { fileName: filePath })
        );
        cb();
      }
    })();
  }
}

export default function (userOptions) {
  return new NunjucksTransform(userOptions);
}
