import { Transform } from "node:stream";
import { styleText } from "node:util";
import logger from "gulplog";
import PluginError from "plugin-error";
import getFilepath from "./lib/path.mjs";
import tags from "./lib/tags.mjs";
import { extname, transform } from "./lib/transform.mjs";

const magenta = (text) => styleText("magenta", text.toString());
const cyan = (text) => styleText("cyan", text.toString());
const noop = () => {};

function streamToArray(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(chunks));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * Constants
 */
const PLUGIN_NAME = "gulp-inject";
const DEFAULT_NAME_FOR_TAGS = "inject";
const LEADING_WHITESPACE_REGEXP = /^\s*/;

const inject = (sources, opt) => {
  if (!sources) {
    throw error("Missing sources stream!");
  }
  if (!opt) {
    opt = {};
  }

  if (opt.sort) {
    throw error("sort option is deprecated! Use `sort-stream` module instead!");
  }
  if (opt.templateString) {
    throw error(
      "`templateString` option is deprecated! Create a virtual `vinyl` file instead!"
    );
  }
  if (opt.transform && typeof opt.transform !== "function") {
    throw error("transform option must be a function");
  }
  if (typeof opt.read !== "undefined") {
    throw error(
      "There is no `read` option. Did you mean to provide it for `gulp.src` perhaps?"
    );
  }

  opt.quiet = bool(opt, "quiet", false);
  opt.relative = bool(opt, "relative", false);
  opt.addRootSlash = bool(opt, "addRootSlash", !opt.relative);
  opt.transform = defaults(opt, "transform", transform);
  opt.tags = tags();
  opt.name = defaults(opt, "name", DEFAULT_NAME_FOR_TAGS);
  transform.selfClosingTag = bool(opt, "selfClosingTag", false);

  if (typeof sources.on === "function" && typeof sources.pipe === "function") {
    return handleVinylStream(sources, opt);
  }

  throw error(
    "passing target file as a string is deprecated! Pass a vinyl file stream (i.e. use `gulp.src`)!"
  );
};

function defaults(options, prop, defaultValue) {
  return options[prop] ?? defaultValue;
}

function bool(options, prop, defaultVal) {
  return typeof options[prop] === "undefined"
    ? defaultVal
    : Boolean(options[prop]);
}

function handleVinylStream(sources, opt) {
  const collected = streamToArray(sources);

  return new Transform({
    objectMode: true,
    transform(target, enc, cb) {
      if (target.isStream()) {
        return cb(error("Streams not supported for target templates!"));
      }
      collected
        .then((collection) => {
          target.contents = getNewContent(target, collection, opt);
          this.push(target);
          cb();
        })
        .catch((error_) => {
          cb(error_);
        });
    }
  });
}

function getNewContent(target, collection, opt) {
  const loggerFunc = opt.quiet
    ? noop
    : (filesCount) => {
        if (filesCount) {
          const pluralState = filesCount > 1 ? "s" : "";
          log(
            `${cyan(filesCount)} file${pluralState} into ${magenta(target.relative)}.`
          );
        } else {
          log(`Nothing to inject into ${magenta(target.relative)}.`);
        }
      };
  let content = String(target.contents);
  const targetExt = extname(target.path);
  const files = prepareFiles(collection, targetExt, opt, target);
  const filesPerTags = Object.groupBy(files, (item) => item.tagKey);
  const startAndEndTags = Object.keys(filesPerTags);
  const matches = [];
  let injectedFilesCount = 0;

  for (const tagKey of startAndEndTags) {
    const filesForTag = filesPerTags[tagKey];
    const startTag = filesForTag[0].startTag;
    const endTag = filesForTag[0].endTag;
    const tagsToInject = getTagsToInject(filesForTag, target, opt);
    content = injectContent(content, {
      startTag: startTag,
      endTag: endTag,
      tagsToInject: tagsToInject,
      removeTags: opt.removeTags,
      empty: opt.empty,
      willInject(filesToInject) {
        injectedFilesCount += filesToInject.length;
      },
      onMatch(match) {
        matches.push(match[0]);
      }
    });
  }

  loggerFunc(injectedFilesCount);

  if (opt.empty) {
    const ext = "{{ANY}}";
    const startTag = getTagRegExp(
      opt.tags.start(targetExt, ext, opt.starttag),
      ext,
      opt
    );
    const endTag = getTagRegExp(
      opt.tags.end(targetExt, ext, opt.endtag),
      ext,
      opt
    );

    content = injectContent(content, {
      startTag: startTag,
      endTag: endTag,
      tagsToInject: [],
      removeTags: opt.removeTags,
      empty: opt.empty,
      shouldAbort: (match) => matches.includes(match[0])
    });
  }

  return Buffer.from(content);
}

function injectContent(content, opt) {
  const startTag = opt.startTag;
  const endTag = opt.endTag;
  let startMatch;
  let endMatch;

  while ((startMatch = startTag.exec(content)) !== null) {
    if (typeof opt.onMatch === "function") {
      opt.onMatch(startMatch);
    }
    if (typeof opt.shouldAbort === "function" && opt.shouldAbort(startMatch)) {
      continue;
    }
    endTag.lastIndex = startTag.lastIndex;
    endMatch = endTag.exec(content);
    if (!endMatch) {
      throw error(`Missing end tag for start tag: ${startMatch[0]}`);
    }
    const toInject = opt.tagsToInject.slice();

    if (typeof opt.willInject === "function") {
      opt.willInject(toInject);
    }

    let newContents = content.slice(0, startMatch.index);

    if (opt.removeTags) {
      if (opt.empty) {
        startTag.lastIndex -= startMatch[0].length;
      }
    } else {
      toInject.unshift(startMatch[0]);
      toInject.push(endMatch[0]);
    }
    const previousInnerContent = content.slice(
      startTag.lastIndex,
      endMatch.index
    );
    const indent = getLeadingWhitespace(previousInnerContent);
    newContents += toInject.join(indent);
    newContents += content.slice(endTag.lastIndex);
    content = newContents;
  }

  return content;
}

function getLeadingWhitespace(str) {
  const match = str.match(LEADING_WHITESPACE_REGEXP);
  return match ? match[0] : "";
}

function prepareFiles(files, targetExt, opt, target) {
  return Array.from(files).map((file) => {
    const ext = extname(file.path);
    const filePath = getFilepath(file, target, opt);
    const startTag = getTagRegExp(
      opt.tags.start(targetExt, ext, opt.starttag),
      ext,
      opt,
      filePath
    );
    const endTag = getTagRegExp(
      opt.tags.end(targetExt, ext, opt.endtag),
      ext,
      opt,
      filePath
    );
    const tagKey = String(startTag) + String(endTag);
    return Object.assign(
      {},
      {
        file: file,
        ext: ext,
        startTag: startTag,
        endTag: endTag,
        tagKey: tagKey
      }
    );
  });
}

function getTagRegExp(tag, sourceExt, opt, sourcePath) {
  tag = makeWhiteSpaceOptional(escapeStringRegexp(tag));
  tag = replaceVariables(tag, {
    name: opt.name,
    path: sourcePath,
    ext: sourceExt === "{{ANY}}" ? ".+" : sourceExt
  });
  return new RegExp(tag, "ig");
}

function replaceVariables(str, variables) {
  return Object.keys(variables).reduce(
    (str, variable) =>
      str.replace(
        new RegExp(
          escapeStringRegexp(escapeStringRegexp(`{{${variable}}}`)),
          "ig"
        ),
        `${variables[variable]}\\b`
      ),
    str
  );
}

function makeWhiteSpaceOptional(str) {
  return str.replace(/\s+/g, "\\s*");
}

function escapeStringRegexp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTagsToInject(files, target, opt) {
  return files.reduce(function transformFile(lines, file, i, files) {
    const filepath = getFilepath(file.file, target, opt);
    const transformedContents = opt.transform(
      filepath,
      file.file,
      i,
      files.length,
      target
    );
    if (typeof transformedContents !== "string") {
      return lines;
    }
    return lines.concat(transformedContents);
  }, []);
}

function log(message) {
  logger.info(magenta(PLUGIN_NAME), message);
}

function error(message) {
  return new PluginError(PLUGIN_NAME, message);
}

export default inject;
