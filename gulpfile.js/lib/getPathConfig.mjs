import fs from "node:fs";
import module from "node:module";
import projectPath from "./projectPath.mjs";

const require = module.createRequire(import.meta.url);

export async function getPathConfig() {
  if (process.env.BLENDID_CONFIG_PATH) {
    const esm = projectPath(process.env.BLENDID_CONFIG_PATH, "path-config.mjs");
    if (fs.existsSync(esm)) {
      const module = await import(esm);
      return module.default;
    }
    return require(
      projectPath(process.env.BLENDID_CONFIG_PATH, "path-config.json")
    );
  }

  const defaultEsm = projectPath("config", "path-config.mjs");
  if (fs.existsSync(defaultEsm)) {
    const module = await import(defaultEsm);
    return module.default;
  }

  const defaultConfigPath = projectPath("config", "path-config.json");
  if (fs.existsSync(defaultConfigPath)) {
    return require(defaultConfigPath);
  }

  const module = await import("../path-config.mjs");
  return module.default;
}
