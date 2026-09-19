import { PassThrough } from "node:stream";
import { styleText } from "node:util";
import gulplog from "gulplog";

/**
 * Plugin
 *
 * @param {Object} options - plugin options
 * @param {Object} env - process.env
 * @param {Array} argv - process.argv
 * @returns {Object} methods object with mode functions
 */
export default function gulpMode(options, env, argv) {
  options = options ?? {};
  env = env ?? process.env;
  argv = argv ?? process.argv;
  const modes = options.modes ?? ["production", "development"];
  const defaultMode = options.default ?? "development";
  const verbose = options.verbose ?? false;

  if (verbose) {
    gulplog.debug(
      styleText("red", "[gulp-mode]") +
        styleText("cyan", ` NODE_ENV : ${env.NODE_ENV}`)
    );
    gulplog.debug(
      styleText("red", "[gulp-mode]") +
        styleText("cyan", ` CLI arguments : ${argv}`)
    );
  }

  // create plugin methods
  const methods = {};
  for (const targetMode of modes) {
    methods[targetMode] = createMethod(
      env,
      argv,
      modes,
      targetMode,
      targetMode === defaultMode
    );
  }
  return methods;
}

/**
 * Returns whether targetMode matches or not
 *
 * @param {Object} env - process.env
 * @param {Array} argv - process.argv
 * @param {Array} allModes - options.modes
 * @param {string} targetMode - options.mode[i]
 * @param {boolean} isDefaultMode - true if targetMode == options.default
 * @returns {boolean} whether the mode matches
 */
function matchMode(env, argv, allModes, targetMode, isDefaultMode) {
  // with CLI arguments (`gulp --<targetMode>`)
  if (argv.indexOf(`--${targetMode}`) >= 0) {
    return true;
  }
  // with NODE_ENV (`NODE_ENV=<targetMode> gulp`)
  if (env.NODE_ENV === targetMode) {
    return true;
  }
  // default mode (targetMode == defaultMode)
  if (isDefaultMode) {
    let modeNotFound = false; // true if both NODE_ENV and process.argv are not specified.
    if (env.NODE_ENV == null) {
      // without NODE_ENV
      modeNotFound = true;
      for (const mode of allModes) {
        // without CLI arguments.
        modeNotFound = modeNotFound && argv.indexOf(`--${mode}`) < 0;
      }
    }
    return modeNotFound;
  }
  return false;
}

/**
 * Create plugin method for targetMode
 *
 * @param {Object} env - process.env
 * @param {Array} argv - process.argv
 * @param {Array} allModes - options.modes
 * @param {string} targetMode - options.mode[i]
 * @param {boolean} isDefaultMode - true if targetMode == options.default
 * @returns {Function} mode checking function
 */
function createMethod(env, argv, allModes, targetMode, isDefaultMode) {
  return (callback) => {
    if (callback === undefined) {
      return matchMode(env, argv, allModes, targetMode, isDefaultMode);
    }
    return matchMode(env, argv, allModes, targetMode, isDefaultMode)
      ? callback
      : new PassThrough();
  };
}
