import { PassThrough } from "node:stream";
import { minimatch } from "minimatch";
import PluginError from "plugin-error";
import ternaryStream from "./lib/ternary-stream.mjs";

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

  // For non-boolean conditions, use ternaryStream with a wrapper condition
  function fileClassifier(file) {
    return !!matchFile(file, condition, minimatchOptions);
  }

  // Create a stream that classifies files and routes to appropriate child
  const trueStream = trueChild;
  const falseStream = falseChild ?? passthrough();

  return ternaryStream(fileClassifier, trueStream, falseStream);
}
