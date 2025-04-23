import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { parseArgs, styleText } from "node:util";
import logger from "gulplog";
import DefaultRegistry from "undertaker-registry";
import projectPath from "../lib/projectPath.mjs";

async function fetchObjects(objectType, url) {
  const hostname = new URL(url).hostname;
  const wordpressAPI = hostname.endsWith("wordpress.com")
    ? `https://public-api.wordpress.com/wp/v2/sites/${hostname}/`
    : new URL(`/wp-json/wp/v2/`, url);

  const resp = await fetch(new URL(objectType, wordpressAPI));
  return resp.json();
}

/**
 * @see {@link https://developer.wordpress.org/rest-api/reference/pages/}
 * @param {Array} pages
 * @returns {*}
 */
function pageTemplates(pages) {
  return pages
    .map((x) => [
      x.slug,
      { title: x.title.rendered, content: x.content.rendered }
    ])
    .map(([slug, { title, content }]) => [
      slug,
      `{% extends 'layouts/application.njk' %}

{% set title = "${title}" %}
{% set slug = "${slug}" %}

{% block content %}
<h1>${title}</h1>
${content}
{% endblock %}`
    ]);
}

/**
 * @param {string} url
 * @param {{html: string, data: string}} dest
 * @param {{ json: Boolean, force: Boolean}} options
 */
async function importPages(url, { html, data }, options) {
  logger.info(styleText("cyan", `Adding pages from website ${url}`));

  const pages = await fetchObjects("pages", url);

  logger.info(styleText("gray", `Found ${pages.length} pages`));

  if (options.json) {
    const file = path.join(data, "wpPages.json");
    if (!existsSync(file) || options.force) {
      await fs.writeFile(file, JSON.stringify(pages));
      logger.info(styleText("green", `Created pages JSON file`));
    }
  }

  for (const [slug, content] of pageTemplates(pages)) {
    const dir = path.join(html, slug);
    const file = path.join(dir, "index.njk");
    await fs.mkdir(dir, { recursive: true });
    if (!existsSync(file) || options.force) {
      await fs.writeFile(file, content);
      logger.info(styleText("green", `Created page ${slug}`));
    }
  }
}

/**
 * @see {@link https://developer.wordpress.org/rest-api/reference/posts/}
 * @param {Array} posts
 * @returns {*}
 */
function postTemplates(posts) {
  return posts
    .map((x) => [
      x.slug,
      {
        title: x.title.rendered,
        content: x.content.rendered,
        date: new Date(x.date)
      }
    ])
    .map(([slug, { title, content, date }]) => [
      slug,
      `---
title: "${title}"
slug: "${slug}"
date: "${date.toISOString()}"
---
<h1>${title}</h1>
${content}`
    ]);
}

/**
 * @param {string} url
 * @param {string} dest
 * @param {{ json: Boolean, force: Boolean}} options
 */
async function importPosts(url, dest, options) {
  logger.info(styleText("cyan", `Adding posts from website ${url}`));

  const posts = await fetchObjects("posts", url);

  logger.info(styleText("gray", `Found ${posts.length} posts`));

  if (options.json) {
    const file = path.join(dest, "wpPosts.json");
    if (!existsSync(file) || options.force) {
      await fs.writeFile(file, JSON.stringify(posts));
      logger.info(styleText("green", `Created posts JSON file`));
    }
  }

  for (const [slug, content] of postTemplates(posts)) {
    const dir = path.join(dest, "posts");
    const file = path.join(dir, `${slug}.md`);
    await fs.mkdir(dir, { recursive: true });
    if (!existsSync(file) || options.force) {
      await fs.writeFile(file, content);
      logger.info(styleText("green", `Created post ${slug}`));
    }
  }
}

/** @typedef {import("@types/gulp")} Undertaker */

export class ImportWPRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    this.args = parseArgs({
      strict: false,
      allowPositionals: true,
      args: process.argv,
      options: {
        pages: { type: "boolean", default: config.pages }, // downloads Pages
        posts: { type: "boolean", default: config.posts }, // downloads Posts
        json: { type: "boolean", default: config.json }, // saves original JSON data
        force: { type: "boolean", default: config.force }, // overrides existing files
        url: { type: "string", default: config.url } // root URL of the WordPress website
      }
    }).values;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task, src }) {
    task("import-wp", async () => {
      if (this.args.pages) {
        const dest = {
          html: projectPath(this.pathConfig.src, this.pathConfig.html.src),
          json: projectPath(this.pathConfig.src, this.pathConfig.data.src)
        };
        await importPages(this.args.url, dest, this.args);
      }

      if (this.args.posts) {
        const dest = projectPath(this.pathConfig.src, this.pathConfig.data.src);
        await importPosts(this.args.url, dest, this.args);
      }
    });
  }
}
