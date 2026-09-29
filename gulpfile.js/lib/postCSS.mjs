import postcssGamutMapping from "@csstools/postcss-gamut-mapping";
import cssnano from "cssnano";
import atImport from "postcss-import";
import presetEnv from "postcss-preset-env";
import functions from "#postcss-functions";

function getPresetEnvConfig(config) {
  return Object.assign({ autoprefixer: config.autoprefixer }, config.presetEnv);
}

function getPostCSSPlugins(config, userPlugins, mode) {
  const plugins = [
    atImport(config.atImport),
    postcssGamutMapping(),
    presetEnv(getPresetEnvConfig(config)),
    functions(config)
  ]
    .concat(userPlugins)
    .filter(Boolean);

  if (mode.production()) {
    plugins.push(cssnano(config.cssnano));
  }
  return plugins;
}

export default getPostCSSPlugins;
