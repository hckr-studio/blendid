import { Registry } from "#lib/registry.mjs";
import { GenerateHtmlRegistry } from "./generate/html.mjs";
import { GenerateJsonRegistry } from "./generate/json.mjs";
import { GenerateRedirectsRegistry } from "./generate/redirect.mjs";

/** @typedef {import("@types/gulp")} Undertaker */

const noop = (done) => {
  done();
};

export class GenerateRegistry extends Registry {
  constructor(config, pathConfig, mode) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.mode = mode;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, series, registry }) {
    if (!this.config.generate) return;

    const redirect = new GenerateRedirectsRegistry(
      this.config,
      this.pathConfig,
      this.mode
    );
    const json = new GenerateJsonRegistry(
      this.config,
      this.pathConfig,
      this.mode
    );
    const html = new GenerateHtmlRegistry(
      this.config,
      this.pathConfig,
      this.mode
    );
    registry(redirect);
    registry(json);
    registry(html);

    const genTasks = [json, html, redirect].flatMap((r) => r.ownTasks());
    task("generate", genTasks.length ? series(genTasks) : noop);
  }
}
