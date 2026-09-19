import { Transform } from "node:stream";
import { minimatch } from "minimatch";
import PluginError from "plugin-error";

function matchFile(file, condition, options) {
  if (!file) {
    throw new PluginError("gulp-if", "vinyl file required");
  }

  if (typeof condition === "boolean") {
    return condition;
  }

  if (typeof condition === "function") {
    return !!condition(file);
  }

  if (typeof condition === "string" && condition.match(/^\*\.[a-z.]+$/)) {
    const newCond = `${condition.substring(1).replace(/\./g, "\\.")}$`;
    condition = new RegExp(newCond);
  }

  if (typeof condition === "object" && typeof condition.test === "function") {
    const proto = Object.getPrototypeOf(condition);
    if (Object.hasOwn(proto, "source")) {
      return condition.test(file.relative);
    }
  }

  if (typeof condition === "string") {
    return minimatch(file.relative, condition, options);
  }

  if (Array.isArray(condition)) {
    if (!condition.length) {
      throw new PluginError("gulp-if", "empty glob array");
    }
    let ret = false;
    for (let i = 0; i < condition.length; i++) {
      const step = condition[i];
      if (step[0] === "!") {
        if (minimatch(file.relative, step.slice(1), options)) {
          return false;
        }
      } else if (minimatch(file.relative, step, options)) {
        ret = true;
      }
    }
    return ret;
  }

  if (typeof condition === "object") {
    if (
      Object.hasOwn(condition, "isFile") ||
      Object.hasOwn(condition, "isDirectory")
    ) {
      if (!Object.hasOwn(file, "stat")) {
        return false;
      }
      if (Object.hasOwn(condition, "isFile")) {
        return condition.isFile === file.stat.isFile();
      }
      if (Object.hasOwn(condition, "isDirectory")) {
        return condition.isDirectory === file.stat.isDirectory();
      }
    }
  }

  return Boolean(condition);
}

function passthrough() {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      callback(null, chunk);
    }
  });
}

export default function gulpIf(
  condition,
  trueChild,
  falseChild,
  minimatchOptions
) {
  if (!trueChild) {
    throw new PluginError("gulp-if", "child action is required");
  }

  if (typeof condition === "boolean") {
    return condition ? trueChild : (falseChild ?? passthrough());
  }

  function classifier(file) {
    return !!matchFile(file, condition, minimatchOptions);
  }

  // For non-boolean conditions, return a Transform that applies the condition
  // and passes through to the appropriate child stream
  // This is a simplified implementation that uses the child streams' transforms
  // by piping files through them internally
  const stream = new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      const useTrue = classifier(file);
      const targetStream = useTrue ? trueChild : falseChild || null;

      if (targetStream && typeof targetStream._transform === "function") {
        // Use the child stream's transform method directly
        targetStream._transform.call(
          targetStream,
          file,
          encoding,
          (err, result) => {
            if (err) return callback(err);
            callback(null, result || file);
          }
        );
      } else if (falseChild && !useTrue) {
        // No direct transform access, just pass through
        callback(null, file);
      } else {
        // Pass through
        callback(null, file);
      }
    }
  });

  return stream;
}
