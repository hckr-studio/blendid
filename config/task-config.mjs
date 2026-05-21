import { texyTypography } from "@hckr_/blendid/lib/texy.mjs";

/**
 * @param {Record<string, *>} pathConfig
 * @param {{development: () => boolean, production: () => boolean}} mode
 * @param {Boolean} verbose
 * @return {TaskConfig}
 */
export default function (pathConfig, mode, verbose) {
  return {
    images: true,
    cloudflare: false,
    cloudinary: false,
    workboxBuild: false,
    fonts: true,
    static: true,
    svgSprite: true,
    stylesheets: true,
    esbuild: true,

    html: {
      // Fixes micro-typography issues.
      // @see {@link https://texy.info/en/syntax-full#typography} for more details
      markedExtensions: [texyTypography("en")],
      data: {
        collections: [
          // explicitly import `data/${collection}.json` files into global context for use in HTML templates
          // you can use `generate.json` task to create JSON files from directories with markdown files
        ]
      }
    },

    vite: {
      appType: "mpa",
      browserArgs: "--ignore-certificate-errors --allow-insecure-localhost"
    },

    production: {
      rev: {
        exclude: ["_headers", "_redirects"]
      }
    },

    watch: {
      tasks: []
    }
  };
}
