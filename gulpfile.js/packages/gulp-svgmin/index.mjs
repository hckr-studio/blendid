import { Transform } from "node:stream";
import PluginError from "plugin-error";
import { loadConfig, optimize } from "svgo";
import { cloneDeep } from "#lib/object.mjs";

// To prevent multiple scans of the disk for a svgo.config.js file, keep its
// data in module scope. Using Map for better iteration and cache management.
const configCache = new Map();

/**
 * Clear the SVGO config cache. Useful for testing or when config files change.
 */
export function clearConfigCache() {
  configCache.clear();
}

// Load the config from svgo.config.js.
async function loadConfigFromCache(configFile, cwd) {
  if (configFile !== null) {
    // Look for the config in the specified file. loadConfig() will
    // require() the file, which caches it for us.
    return loadConfig(configFile, cwd);
  }

  // Since no configFile was given, let loadConfig() find a file for us.

  // If the config file is not in our module cache, look for it on disk.
  if (!configCache.has(cwd)) {
    // Any usage of loadConfig() with the same cwd will return the same
    // file's config. Store the resulting config in our module cache.
    const loadedConfig = await loadConfig(null, cwd);
    configCache.set(cwd, loadedConfig);
  }

  return configCache.get(cwd);
}

export async function getSvgoConfig(options = null, doDeepClone = false) {
  // Construct the svgo config from the given options.
  let config = Object.assign({}, options);

  // Get the options that are for this gulp plugin and not for svgo.
  const pluginOptions = {
    full: Boolean(config.full),
    configFile: config.configFile ?? null,
    cwd: config.cwd ?? process.cwd()
  };
  delete config.full;
  delete config.configFile;
  delete config.cwd;

  // If the options.full flag is specified, then the given options are
  // considered to be the full svgo config.
  if (pluginOptions.full) {
    return config;
  }

  const loadedConfig = await loadConfigFromCache(
    pluginOptions.configFile,
    pluginOptions.cwd
  );

  // Merge the given config with the config loaded from file. (If no
  // config file was found, svgo's loadConfig() returns null.)
  if (loadedConfig) {
    // Since gulp-svgmin allows a function to modify config per-file, we
    // want to prevent that function from making modifications to the
    // returned config object that would bleed into subsequent usages of
    // the config object.
    const baseConfig = doDeepClone ? cloneDeep(loadedConfig) : loadedConfig;
    config = Object.assign({}, baseConfig, config);
  }

  return config;
}

const PLUGIN_NAME = "gulp-svgmin";

export default function svgmin(options) {
  const optionsFunction = typeof options === "function";

  const stream = new Transform({
    objectMode: true,
    transform(file, encoding, cb) {
      if (file.isStream()) {
        return cb(new PluginError(PLUGIN_NAME, "Streaming not supported"));
      }

      if (file.isBuffer()) {
        getSvgoConfig(
          optionsFunction ? options(file) : options,
          optionsFunction
        )
          .then((config) => {
            const result = optimize(String(file.contents), config);

            // Ignore svgo meta data and return the SVG string.
            if (typeof result.data === "string") {
              file.contents = Buffer.from(result.data);
              return cb(null, file);
            }

            // Otherwise, throw an error, even if it is undefined.
            throw result.error;
          })
          .catch((error) => cb(new PluginError(PLUGIN_NAME, error)));

        return;
      }

      // Handle all other cases, like file.isNull(), file.isDirectory().
      return cb(null, file);
    }
  });

  return stream;
}
