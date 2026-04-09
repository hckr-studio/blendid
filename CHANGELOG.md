# Changelog

## 9.6.11

- Updated dependencies
- Markdown is preprocessed with Texy typography module

## 9.6.10

- Updated dependencies

## 9.6.9

- Support Text scaling in layouts
- Improved default stylesheet
- Updated dependencies

## 9.6.8

- Updated dependencies

## 9.6.7

- Updated dependencies

## 9.6.6

- Updated dependencies
- Fixed cloudinary metadata serialization when lqip value is `null`

## 9.6.5

- Updated dependencies

## 9.6.4

- Updated dependencies

## 9.6.3

- Updated dependencies
- Fixed `cloudinary.force` behavior
- improved LQIP rendering

## 9.6.2

- Added support for `async setup(cloudinary)` option for `cloudinary`. Can be used e.g. to call API methods for metadata
  fields definition.
- Added support for lqip hash computation and upload to Cloudinary as image metadata. Inspired
  by https://leanrada.com/notes/css-only-lqip/.

## 9.6.1

- Support for `async getMetadata(file)` option for `cloudinary`
- Added `force` option for `cloudinary` task to reupload existing files and metadata

## 9.6.0

- Added configuration options for `cloudinary` task to allow customizing the upload options
- Added `getMetadata(file)` option for `cloudinary` task to allow setting custom metadata from client code

## 9.5.1

- Updated dependencies

## 9.5.0

- Updated dependencies - notably Vite.js 7.0
- Use `export default function(pathConfig, mode, verbose)` in the generated `task-config.mjs`

## 9.4.0

- Task config can `export default function(pathConfig, mode, verbose)`.
- Updated sprite helpers

## 9.3.8

- Updated dependencies
- Task config can `export default function(mode) {}` returning configuration modifiable by mode (`gulp-mode`)

## 9.3.7

- Updated dependencies

## 9.3.6

- Updated dependencies
- Added `resolveUrl` filter, that uses `URL.parse` to resolve URL to given base
- Added canonical URL fallback into layout that uses `page.url` and resolves it `meta.url` base
- Fixed issue in Texy! Typography module with unpaired quotes failing hard

## 9.3.5

- Updated dependencies
- Better default config when `blendid init` is used to init the project
- WordPress import task `import-wp` can be configured via `task-config.mjs` file instead of CLI params. CLI params will
  override the config values when set. This enables headless CMS scenario.
- Esbuild task supports debug logging
- Esbuild task doesnt use incremental mode in dev that was broken

## 9.3.4

- Security update for Vite

## 9.3.3

- Updated dependencies
- Workaround for broken gulp-cli on Node 22.12+

## 9.3.2

- Improved dependency resolution for less duplicate dependencies

## 9.3.1

- Updated dependencies
- Improved base/reset stylesheet

## 9.3.0

- Updated Vite to 6.1.0

## 9.2.2

- Updated Vite

## 9.2.1

- Fixed case when the virtual file doesn't have `stat` property and/or meta doesn't have `lang`

## 9.2.0

- Updated dependencies
- Added Texy! Typography module into initial configuration
- New Data/Collections layout - opt-in via `html.data.collections` instead of `html.collections`.
  Collections are then accessible via `collections` global property in Nunjucks templates,
  to prevent collisions with properties defined in `global.mjs`
- Introduced new `page` global property in Nunjucks templates, that holds metadata about template and page.
  Inspired by 11ty https://www.11ty.dev/docs/data-eleventy-supplied/#page-variable
- esbuild default target is ES2024

## 9.1.2

- Updated dependencies

## 9.1.1

- Use `{MarkedExtension[]} html.markedExtensions` also in `generate-json` task.

## 9.1.0

- Added [Texy! Typography module](https://texy.info/en/syntax-full#typography) for usage as marked extension and as a
  Nunjucks filter `processTypography(locale)`
- Added `{MarkedExtension[]} html.markedExtensions` configuration option to allow the use of marked extensions

## 9.0.2

- Updated dependencies
- Updated npm ignore file

## 9.0.1

- Updated dependencies

## 9.0.0

- Updated to Vite.js 6
- Removed Sass from `stylesheets` pipeline. If you need Sass, use `gulp-sass` via `stylesheets.alternateTask`.
- Removed BrowserSync in favor of Vite.js. If you
  need [BrowserSync, use it as Vite plugin](https://github.com/Applelo/vite-plugin-browser-sync).
- Removed WorkBox. We will provide separate package with WorkBoxRegistry, that can be used via `additionalTasks`.
- Removed `gulp-notify` dependency.
- Cleaned and pinned dependencies, so the overall package size after installation is much smaller (>50% reduction).
- `gulp-mode` is now resolved just once and injected into Registries for later use.
- Path config is in `mjs` instead of JSON. JSON config is still supported, but migration to ESM encouraged.
- Support for `mjs` collection files for injection into HTML or generators input. Support for JSON is kept, but ESM is
  favored.
- Added `posthtml` step for additional tasks
- Added `import-wp` task for import of WordPress Posts and Pages
- Sensible layout template a CSS styles for modern web development

## 8.7.1

- fix `cloudflare.mjs` file name

## 8.7.0

- static files are copied after reving
- fixed cases when there are more tasks in `prebuild` and `postbuild` additional tasks. They are run in series.
- added optional `CloudflareRegistry` with `cloudflare-pages` task, it bahaves like `static` task, but can be included
  in `prebuild` stage

## 8.6.2

- explicitly transform nested CSS declarations to flat selectors
- fix ESM watching
- bumped dependencies

## 8.6.1

- propagate gulp exit code from blendid bin script

## 8.6.0

- Improved error handling in HTML task
- Added ability to resolve Workbox src path lazily
- Bumped dependencies

## 8.5.5

- Unquote parameters of custom CSS functions

## 8.5.4

- Fixed Cloudinary upload from the root without destination folder

## 8.5.3

- Improved initial steps in Readme
- Improved default site assets to be more useful and working OOTB
- Updated dependencies

## 8.5.2

- Parse all CSS functions parameters as JSON, otherwise strings are double-quoted, and we can't use unquoted strings
  because it breaks Sass parser.

## 8.5.1

- Fix optional `opts` in CSS functions

## 8.5.0

- Added custom CSS functions `asset-url` and `cloudinary-url`, they shoud do the same thing as Sass functions `assetUrl`
  and `cloudinaryUrl`, but they use JSON string for options instead of Sass Maps, so it doesn't break the parser. Sass
  and Sass functions will be removed (extracted to opt-in module) in version 9, so it is recommended to transition to
  the new functions.

## 8.4.4

- Revert custom functions - because of breaking change in unsupported Sass maps.

## 8.4.3

- Implement custom CSS functions in PostCSS instead of Sass

## 8.4.2

- Fixed optional sprite usage in the HTML task

## 8.4.1

- Fixed rev exlude option path

## 8.4.0

- Fixed reving of static files like favicon.ico or robots.txt that need to be unreved
- Added option to exclude files from reving via `production.rev.exclude` option
- When sprites are disabled don’t create a pipeline for them
- Added `_headers` file with cache busting of reved assets
- Added `robots.txt` file

## 8.3.0

- Allow change setting of `markdownToJSON` in `generate.json` settings

## 8.2.0

- Switched from `sass-embedded` to `sass`, it was hanging the build process on Cloudflare Pages CI
- removed `gulp-rename` as is not needed - `gulp-sass` already renames the output file
- Added default merge options for generate JSON collections - by default it will create an array of objects from parsed
  MD files with front matter

## 8.1.1

- cleanup marked usage from transitional settings
- Fixed broken `init` and `init-config` tasks (changed behavior of `src` in Gulp v5)
- updated dependencies

## 8.1.0

- requires Node 22
- updated dependencies
- uses `with` instead of `assert` in JSON imports

## 8.0.8

- fixed HTML generator to generate file for each item in the collection
- updated dependencies

## 8.0.7

- changed order of the `static` files task (moved to second place after clean)
- updated caniuse-lite

## 8.0.6

- rev JS uses esm path config prior to esbuild

## 8.0.5

- fix error in sizereport

## 8.0.4

- all binary handling tasks have disabled encoding
- Updated Sass Embedded to 1.74.1

## 8.0.3

- Fixed fonts task changing encoding of font files
- Updated Vite to 5.2.8

## 8.0.2

- removed `cloudinaryUrl` debug logging
- fixed HTML generator NPE

## 8.0.1

- added debugging ability to every task
- fixed globs/ignores
- added type hints to registries

## 8.0.0

- Requires Node 21
- Gulp v5
- updated dependencies

## 7.1.0

- bumped dependencies
- Sass `pkg:` specifier is now supported, See [official blog post](https://sass-lang.com/blog/announcing-pkg-importers/)
  for more details

## 7.0.4

- updated dependencies to latest versions

## 7.0.3

- fix native streams of JSON in generators

## 7.0.2

- updated Changelog

## 7.0.1

- cleanup files from npm package

## 7.0.0

- removed deprecated code
- use native node stream utilities instead of dependencies
- updated dependencies
- removed `javascripts` functionality based on Rollup in favour of `esbuild`

# 6.x

- moved to Gulp Registries and ESM
- deprecated global based APIs for extending the Blendid functionality in favor of Registries
- support for ESM based configuration
- introduced Vite.js for HMR
- introduced esbuild based workflow for ESM code
- moved to `postcss-preset-env`

# 5.x

- cleaned up shims for different backend frameworks
- updated to Gulp v4
- introduced support for `collections`
- introduced `generate` functionality based on collections
- introduced `cloudinary` functionality
- moved to `sass-embedded`

## 4.4.2

- relatively references directories and files within init task

## 4.4.1

- hotfix: ensures new `fancy-log` package doesn’t break tasks

## 4.4.0

- Prevent browserSync.server.middleware from being overwritten completely
- reorganizes production and replace file tasks to ensure public directory is cleaned on build task
- replaces outdated gulp-util with appropriate packages

## 4.3.1

- Hotfix for HTTP/2 upgrade task

## 4.3.0

- Adds an HTTP/2 assets upgrade by running `yarn run blendid -- http2-upgrade`
- Updates extras to include HTTP/2 init files

## 4.2.0

- Update dependencies, including Webpack 3
- Adds Drupal init task
- Readme updates
- Allow manually specifying the files that the `clean` task will delete via a `clean.patterns` option

## 4.1.0

- Add `devtool`, `uglifyJsPlugin`, and `definePlugin` environment options
- [Autoset `uglifyJsPlugin.sourceMap` to `true`](https://github.com/webpack/webpack/issues/2704#issuecomment-228860162)
  if `production.devtool` is defined
- Add `publicPath` to Craft task-config.js [#432](https://github.com/vigetlabs/blendid/issues/432)

## 4.0.1

- add watchOptions to browserSync config [#429](https://github.com/vigetlabs/blendid/pull/429)

## 4.0.0 Blendid!

- Gulp Starter is now Blendid!
- Now a standalone yarn/npm installable module :tada:
- Tasks and modules are fully configurable through task-config.js
- Paths are fully configuraable through path-config.json
- Update all dependencies to latest, including Webpack 2
- HTML and CSS tasks can be swapped out with alternative custom tasks
- Changed default Sass files from `.sass` to `.scss` 😭
- Custom gulp tasks can be added and run prebuild, postbuild, in development or production builds
- Renames javascripts `entries` option to `entry` to match Webpack config
- Removes Karma, Mocha, Sinon, Chai Test Suite. Jest is better and easy to set up. Use that instead.
- `init` task generates default config files and folder structure
- `init-craft` and `init-rails` tasks generate config files, helpers, and asset folder structures for their
  environments.
- So much more... see the README

### Upgrading from Beta and Release Candidates

- In task-config.js, `javascripts.entries` was renamed `javascript.entry` to be consistent with Webpack.
- You are no longer requried to provide `extensions` in each task config, or really any non-default configuration. If
  you want to use default settings in any task configuration, simply set the value to `true`. If you pass a
  configuration object, those settings will be merged with the defaults.
- Check the README for other new configuration options.

# 3.x.x Gulp Starter

This was the previous iteration of this project. Gulp Starter wasn’t an installable package, and was more of an example
starter kit that you could fork, clone, and copy into your project. The last iteration of this work is archived in the
gulp-starter branch of this repo.

See the blog post that started it all:
https://www.viget.com/articles/gulp-browserify-starter-faq
