import { Registry } from "#lib/registry.mjs";
import { RevAssetsRegistry } from "./rev/assets.mjs";
import { RevCodeRegistry } from "./rev/code.mjs";
import { RevImportmapsCodeRegistry } from "./rev/importmaps-code.mjs";
import { RevUpdateHtmlRegistry } from "./rev/update-html.mjs";
import { RevUpdateJsRegistry } from "./rev/update-js.mjs";
import { RevUpdateReferencesRegistry } from "./rev/update-references.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

export class RevRegistry extends Registry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, series, registry }) {
    if (!this.config.production.rev) return;
    registry(new RevAssetsRegistry(this.config, this.pathConfig));
    registry(new RevCodeRegistry(this.config, this.pathConfig));
    registry(new RevImportmapsCodeRegistry(this.config, this.pathConfig));
    registry(new RevUpdateReferencesRegistry(this.config, this.pathConfig));
    registry(new RevUpdateHtmlRegistry(this.config, this.pathConfig));
    registry(new RevUpdateJsRegistry(this.config, this.pathConfig));

    const updateHtml = this.config.html ? "update-html" : false;
    const updateJs = this.config.esbuild ? "update-js" : false;
    const revTasks = [
      // 1) Add md5 hashes to assets referenced by CSS and JS files
      "rev-assets",
      // 2) Update asset references (images, fonts, etc) with reved filenames in compiled css + js
      "rev-update-references",
      // 3) Rev and compress CSS and JS files
      // (this is done after assets, so that if a referenced asset hash changes,
      // the parent hash will change as well
      "rev-code",
      "rev-importmaps-code",
      // 4) Update asset references in JS
      updateJs,
      // 5) Update asset references in HTML
      updateHtml
    ].filter(Boolean);
    task("rev", series(revTasks));
  }
}
