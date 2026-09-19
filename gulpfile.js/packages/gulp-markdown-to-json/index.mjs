import { Buffer } from "node:buffer";
import { basename, extname, sep } from "node:path";
import { Transform } from "node:stream";
import { isText } from "istextorbinary";
import PluginError from "plugin-error";
import Vinyl from "vinyl";
import frontmatter from "./lib/front-matter.mjs";

const NAME = "gulp-markdown-to-json";

/**
 * Expands a flat object with dot-notation keys into a nested object.
 * @param {Object} obj - Flat object with dot-separated keys
 * @returns {Object} Nested object structure
 * @private
 */
function expand(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(".");
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part]) target[part] = {};
      target = target[part];
    }
    target[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Sorts an object's keys alphabetically and returns a new sorted object.
 * @param {Object} obj - Object to sort
 * @returns {Object} New object with sorted keys
 * @private
 */
function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});
}

/**
 * Extracts title text from first <h1> found in rendered markup
 * @param {String} markup
 * @param {Boolean} strip - removes the first <h1> from the body when true
 * @returns {{title: String, body?: String}|String}
 * @private
 */
function extractTitle(markup, strip) {
  const matches = /<h1[^>]*>([^<]*)<\/h1>/.exec(markup);
  if (!matches) return markup;
  const result = { title: matches[1] };
  if (strip) result.body = markup.replace(matches[0], "").trim();
  return result;
}

/**
 * Tests if file content is text
 * @param {Vinyl} file - Vinyl file object
 * @returns {Promise<Vinyl>}
 * @private
 */
async function isBinary(file) {
  try {
    if (isText(basename(file.path), file.contents)) file.isText = true;
    return file;
  } catch {
    file.isText = false;
    return file;
  }
}

/**
 * Tests if file content is valid JSON
 * @param {Vinyl} file
 * @returns {boolean}
 * @private
 */
function isJSON(file) {
  try {
    JSON.parse(file.contents.toString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Consolidates JSON output into a nested and sorted object whose hierarchy matches the input directory structure
 * @param {Array} files - JSON output as Vinyl file objects
 * @param {MarkdownToJSONConfig} config
 * @returns {Promise<Vinyl>}
 * @private
 */
async function consolidateFiles(files, config) {
  const data = {};
  for (const file of files) {
    let path = file.relative.split(".").shift().split(sep);
    if (path.length >= 2 && config.flattenIndex) {
      const relPath = path.splice(-2, 2);
      path =
        relPath[0] === relPath[1] || relPath[1] === "index"
          ? path.concat(relPath[0])
          : path.concat(relPath);
    }
    data[path.join(".")] = JSON.parse(file.contents.toString());
  }
  const sortedData = sortObject(data);
  const tree = expand(sortedData);
  const json = JSON.stringify(tree);
  return new Vinyl({
    base: "/",
    cwd: "/",
    path: `/${config.name || "content.json"}`,
    contents: Buffer.from(json)
  });
}

/**
 * Parse text files for YAML and Markdown, render to HTML and wrap in JSON
 * @param {Vinyl} file - Vinyl file object
 * @param {MarkdownToJSONConfig} config
 * @returns {Promise<Vinyl>}
 * @private
 */
async function processFile(file, config) {
  if (extname(file.path) === ".json") {
    if (!isJSON(file)) file.isInvalid = true;
    return file;
  }
  const jsonFile = file.clone();
  try {
    const parsed = frontmatter(file.contents.toString());
    const data = parsed.attributes;
    data.body = config.renderer.call(config.context, parsed.body);
    if (!data.title) {
      const extracted = extractTitle(data.body, config.stripTitle);
      if (typeof extracted === "object") Object.assign(data, extracted);
    }
    data.updatedAt = file.stat.mtime.toISOString();
    const transformedData = config.transform?.(data, file) ?? data;
    jsonFile.extname = ".json";
    jsonFile.contents = Buffer.from(JSON.stringify(transformedData));
    return jsonFile;
  } catch {
    jsonFile.isInvalid = true;
    return jsonFile;
  }
}

/**
 * @typedef {Object} MarkdownToJSONConfig
 * @property {Function} renderer - takes a string of Markdown and returns HTML
 * @property {Object} [context] - call the renderer with the specified context for `this`
 * @property {Boolean} [flattenIndex] - unwrap files named `index` or the same as parent dirs
 * @property {Boolean} [stripTitle] - strips the first `<h1>` element found
 * @property {Function} [transform] - modify the data for each file before outputting
 * @property {String} [name] - output filename for consolidated JSON
 */

/**
 * Transform stream that converts Markdown files to JSON
 */
class MarkdownToJSONStream extends Transform {
  /**
   * @param {MarkdownToJSONConfig} config
   */
  constructor(config) {
    super({ objectMode: true });
    if (!config.renderer || typeof config.renderer !== "function") {
      throw new PluginError(NAME, "Markdown renderer function required");
    }
    this.config = config;
  }

  async _transform(input, enc, callback) {
    try {
      const isBuffered = Array.isArray(input);
      const queue = isBuffered
        ? input.map((file) => isBinary(file))
        : [isBinary(input)];

      const files = await Promise.all(queue);
      const textFiles = files.filter((file) => file.isText);
      const processedFiles = await Promise.all(
        textFiles.map((file) => processFile(file, this.config))
      );

      const invalidFiles = processedFiles.filter((file) => file.isInvalid);
      const validFiles = processedFiles.filter((file) => !file.isInvalid);

      for (const file of invalidFiles) {
        this.emit(
          "error",
          new PluginError(NAME, `${basename(file.basename)} is not valid JSON`)
        );
      }

      if (isBuffered) {
        const consolidatedFile = await consolidateFiles(
          validFiles,
          this.config
        );
        this.push(consolidatedFile);
      } else {
        for (const file of validFiles) {
          this.push(file);
        }
      }

      callback();
    } catch (err) {
      callback(new PluginError(NAME, err));
    }
  }
}

/**
 * Parses input Markdown files with given render method(s) and frontmatter with front-matter/js-yaml
 *
 * @param {(Function|MarkdownToJSONConfig)} configArg - Markdown function or configuration object
 * @param {String} [name] - optional output name
 * @param {Function} [dataTransform] - optional transform function
 * @returns {MarkdownToJSONStream}
 */
export default function markdownToJSON(configArg, name, dataTransform) {
  let config;
  if (typeof configArg === "function") {
    config = { renderer: configArg };
    if (typeof name === "string") config.name = name;
    if (typeof name === "function") config.transform = name;
    if (typeof dataTransform === "function") config.transform = dataTransform;
  } else {
    config = configArg;
  }
  return new MarkdownToJSONStream(config);
}
