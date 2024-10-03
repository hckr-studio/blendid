export default {
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
    collections: [
      // explicitly import `data/${collection}.json` files into global context for use in HTML templates
      // you can use `generate.json` task to create JSON files from directories with markdown files
    ]
  },

  vite: {
    appType: "mpa",
    browserArgs: "--ignore-certificate-errors --allow-insecure-localhost",
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
