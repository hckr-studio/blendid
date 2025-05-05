# ![Blendid](https://raw.githubusercontent.com/hckr-studio/blendid/master/blendid-logo.png)

**Blendid** is a delicious stand-alone blend of tasks and build tools that form a full-featured modern asset pipeline.
It can be used as-is as a static site builder, or can be configured and integrated into your own
development environment and site or app structure.

## Quick start on a fresh project (empty directory)

```bash
echo "22" > .nvmrc
nvm install $(< .nvmrc)
yarn set version berry
echo "nodeLinker: node-modules\nenableGlobalCache: false" >> .yarnrc.yml
yarn init
yarn add -D @hckr_/blendid
yarn blendid init
yarn blendid
```

This will create default `src` and `config` files in your directory and start compiling and live-updating files!
Try editing them and watch your browser auto-update!

## Import existing WordPress site

You can import existing pages and posts into the project from any WordPress instance by running `import-wp` task:

```bash
yarn blendid import-wp --url https://example.worpress.com --pages --posts
```

Pages are imported into `src/html`.
Post are imported into `src/data/posts`.
You can then add `generate.json` and `html.collections: ["posts"]` into your `task-config.mjs` to be used in your templates.

## Texy! Typography

Blendid contains [Texy! Typography module](https://texy.info/en/syntax-full#typography) to correct many typographic mistakes.
You can apply Nunjucks filter `processTypography(locale)` in your templates on any inline text.

You can also add Texy! Typography module as a Marked extension:

```javascript
// task-config.mjs
import { texyTypography } from "@hckr_/blendid/lib/texy.mjs";

export default {
  html: {
    markedExtensions: [texyTypography("en")]
  },
}
```

This will automatically apply typographic corrections on all your Markdowns - used in templates via `{% markdown %}`
or in `data.collections` via `generate-json` task.

# Publish to npm

```bash
yarn npm login
yarn npm publish --access public --tag latest
```
