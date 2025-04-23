import * as path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import logger from "gulplog";
import { getPathConfig } from "./getPathConfig.mjs";
import { processTypo } from "./texy.mjs";

const pathConfig = await getPathConfig();

/**
 * @param {string} publicId Public ID of cloudinary resource
 * @param {Object} [opts]
 */
function cloudinaryUrl(publicId, opts = {}) {
  try {
    const unwrap = (x) => x?.value ?? x?.text ?? x;
    const customKeys = new Map([
      ["format", "fetch_format"],
      ["ar", "aspect_ratio"]
    ]);
    const options = Object.assign(
      {
        secure: true,
        width: "auto",
        fetch_format: "auto",
        quality: "auto",
        dpr: 1,
        flags: "progressive"
      },
      Object.fromEntries(
        Object.entries(opts).map(([k, v]) => [
          customKeys.has(k) ? customKeys.get(k) : k,
          unwrap(v)
        ])
      )
    );
    return cloudinary.url(publicId, options);
  } catch (err) {
    logger.error("cloudinaryUrl", err);
  }
}

/**
 * @param {string} assetPath Asset path
 * @param {"stylesheets"|"esm"|"fonts"|"icons"|"images"|"html"|"static"} assetType Key in path-config.mjs map
 * @param {Object} [options]
 * @param {string} [options.base] Optional base path to prefix the resolved asset URL. Default is / - root absolute URL.
 * @returns {string}
 */
function assetUrl(assetPath, assetType, options) {
  const destPath = pathConfig[assetType].dest;
  return path.join(options?.base ?? "/", destPath, assetPath);
}

const unquote = (s) =>
  s.match(/^['"](?<unquoted>.+)['"]$/).groups?.unquoted ?? s;

export function getTaskDefaults(mode) {
  return {
    esbuild: {
      extensions: ["ts", "js", "mjs"],
      options: {
        bundle: true,
        splitting: true,
        treeShaking: true,
        minify: mode.production(),
        mainFields: ["module", "browser", "main"],
        sourcemap: true,
        legalComments: "linked",
        format: "esm",
        platform: "browser",
        target: ["es2024"],
        charset: "utf8",
        define: { __DEVELOPMENT__: mode.development() ? "true" : "undefined" }
      }
    },

    stylesheets: {
      presetEnv: {
        stage: 3,
        minimumVendorImplementations: 3,
        features: {
          "nesting-rules": { preserve: false }
        }
      },
      functions: {
        "asset-url": (assetType, assetPath, opts) =>
          `url(${assetUrl(unquote(assetPath), unquote(assetType), opts ? JSON.parse(unquote(opts)) : undefined)})`,
        "cloudinary-url": (publicId, opts) =>
          `url(${cloudinaryUrl(unquote(publicId), opts ? JSON.parse(unquote(opts)) : undefined)})`
      },
      extensions: ["css"]
    },

    generate: {
      extensions: ["md", "json", "mjs"]
    },

    "generate-json": {
      extensions: ["md"],
      mergeOption: {
        concatArrays: true,
        startObj: [],
        edit(json) {
          return [json];
        }
      }
    },

    "generate-html": {
      extensions: ["json", "mjs"]
    },

    html: {
      dataFile: "global.mjs",
      excludeFolders: ["layouts", "shared", "macros", "data"],
      extensions: ["html", "njk", "json"],
      nunjucksRender: {
        filters: {
          split(str, separator) {
            return str.split(separator);
          },
          assetUrl,
          cloudinaryUrl,
          parseUrl(input, base) {
            return URL.parse(input, base);
          },
          processTypography(str, locale) {
            return processTypo(str, { locale });
          }
        },
        envOptions: {
          watch: false
        }
      },
      htmlmin: {
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        decodeEntities: true,
        minifyCSS: true,
        removeAttributeQuotes: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeStyleLinkTypeAttributes: true
      }
    },

    images: {
      extensions: ["jpg", "jpeg", "png", "gif", "avif", "webp", "svg"]
    },

    cloudinary: {
      extensions: ["jpg", "jpeg", "png", "gif", "avif", "webp", "svg"],
      manifest: "images.json"
    },

    fonts: {
      extensions: ["woff2", "woff", "eot", "ttf", "svg"]
    },

    svgSprite: {
      svgstore: {
        inlineSvg: true
      }
    },

    sizeReport: { gzip: true },

    watch: {
      tasks: []
    },

    production: {
      rev: {
        exclude: ["_headers", "_redirects"]
      }
    },

    registries: [],

    additionalTasks: {
      development: {
        prebuild: null,
        postbuild: null,
        code: null,
        assets: null,
        posthtml: null
      },
      production: {
        prebuild: null,
        postbuild: null,
        code: null,
        assets: null,
        posthtml: null
      }
    },

    vite: {
      appType: "mpa",
      server: {
        open: "/",
        host: true,
        port: 3000
      }
    }
  };
}
