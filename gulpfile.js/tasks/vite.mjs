import DefaultRegistry from "undertaker-registry";
import logger from "gulplog";
import { createServer, version } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import projectPath from "../lib/projectPath.mjs";
import { styleText } from "node:util";

/** @typedef {import("@types/gulp")} Undertaker */

export class ViteRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task }) {
    task("vite", async () => {
      const root = projectPath(this.pathConfig.dest);
      const { plugins = [], browser, browserArgs, ...config } = this.config;
      if (browser) process.env.BROWSER = browser;
      if (browserArgs) process.env.BROWSER_ARGS = browserArgs;
      plugins.push(basicSsl());
      const server = await createServer({
        build: {
          target: false,
          assetsInlineLimit: 0,
          cssMinify: false,
          minify: false,
          sourcemap: "inline"
        },
        configFile: false,
        envFile: false,
        optimizeDeps: { include: [] },
        mode: "development",
        root,
        plugins,
        ...config
      });
      await server.listen();
      logger.info(
        `${styleText("cyan", "[vite]")} ${styleText("blue", `v${version}`)}`
      );
      logger.info(
        `${styleText("cyan", "[vite]")} ${styleText("bold", "dev server running at:")}`
      );
      server.printUrls();
      logger.info(`${styleText("cyan", "[vite]")} serving files from: ${root}`);
      logger.info(
        `${styleText("cyan", "[vite]")} opening the browser... ${browser ?? ""} ${
          browserArgs ?? ""
        }`
      );
    });
  }
}
