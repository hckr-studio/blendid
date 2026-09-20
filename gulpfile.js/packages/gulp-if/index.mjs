import { PassThrough, Transform } from "node:stream";
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
  return new PassThrough({ objectMode: true });
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

  // Return a Transform that classifies and routes files
  const result = new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      const useTrue = classifier(file);
      const child = useTrue ? trueChild : (falseChild ?? passthrough());

      let calledBack = false;
      const cleanup = () => {
        child.off("data", onData);
        child.off("end", onEnd);
        child.off("error", onError);
      };

      const onData = (data) => {
        if (calledBack) return;
        calledBack = true;
        cleanup();
        this.push(data);
        callback();
      };

      const onEnd = () => {
        if (calledBack) return;
        calledBack = true;
        cleanup();
        // If child emitted end without data, push the original file
        this.push(file);
        callback();
      };

      const onError = (err) => {
        if (calledBack) return;
        calledBack = true;
        cleanup();
        callback(err);
      };

      child.on("data", onData);
      child.on("end", onEnd);
      child.on("error", onError);

      child.write(file, encoding);
      // Don't end - let the child stream stay open for more files
    }
  });

  // Handle child stream end
  trueChild.on("end", () => result.push(null));
  if (falseChild) {
    falseChild.on("end", () => result.push(null));
  }

  // Error propagation
  trueChild.on("error", (err) => result.emit("error", err));
  if (falseChild) {
    falseChild.on("error", (err) => result.emit("error", err));
  }

  return result;
}
