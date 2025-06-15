import fs from "node:fs";
import module from "node:module";
import mergeWith from "lodash-es/mergeWith.js";
import projectPath from "./projectPath.mjs";
import { getTaskDefaults } from "./taskDefaults.mjs";

const require = module.createRequire(import.meta.url);

async function getTaskConfigInternal() {
  if (process.env.BLENDID_CONFIG_PATH) {
    const esm = projectPath(process.env.BLENDID_CONFIG_PATH, "task-config.mjs");
    if (fs.existsSync(esm)) {
      const module = await import(esm);
      return module.default;
    }
    return require(
      projectPath(process.env.BLENDID_CONFIG_PATH, "task-config.js")
    );
  }

  const defaultEsm = projectPath("config/task-config.mjs");
  if (fs.existsSync(defaultEsm)) {
    const module = await import(defaultEsm);
    return module.default;
  }

  const defaultConfigPath = projectPath("config/task-config.js");
  if (fs.existsSync(defaultConfigPath)) {
    return require(defaultConfigPath);
  }

  const module = await import("../task-config.mjs");
  return module.default;
}

function withDefaults(taskConfig, mode) {
  const config =
    typeof taskConfig === "function" ? taskConfig(mode) : taskConfig;
  const result = Object.assign({}, config);
  const taskDefaults = getTaskDefaults(mode);
  for (const key of Object.keys(taskDefaults)) {
    if (config[key] === false) continue;
    result[key] =
      config[key] === true
        ? taskDefaults[key]
        : mergeWith(taskDefaults[key], config[key] ?? {}, replaceArrays);
  }
  return result;
}

function replaceArrays(objValue, srcValue) {
  if (Array.isArray(objValue)) {
    return srcValue;
  }
}

export async function getTaskConfig(mode) {
  const config = await getTaskConfigInternal();
  return withDefaults(config, mode);
}
