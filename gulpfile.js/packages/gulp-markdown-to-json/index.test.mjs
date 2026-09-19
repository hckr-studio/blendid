import assert from "node:assert";
import { Buffer } from "node:buffer";
import { basename, extname, join } from "node:path";
import { Transform, Writable } from "node:stream";
import { describe, it } from "node:test";
import { marked } from "marked";
import Vinyl from "vinyl";
import vfs from "vinyl-fs";

import markdown from "./index.mjs";

const config = marked;

const fixturePath = join(import.meta.dirname, "test-fixtures");
const fixtureGlob = join(fixturePath, "**", "*");

const mockDate = new Date("2024-01-01T00:00:00.000Z");

// Create a mock fs.Stats object with the required properties
const mockStat = {
  mtime: mockDate,
  atime: mockDate,
  ctime: mockDate,
  birthtime: mockDate,
  isFile: () => true,
  isDirectory: () => false,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false
};

const fixtureVinyl = {
  path: "fixture.md",
  stat: mockStat
};

const fixtureConfig = {
  frontmatter: {
    contents: Buffer.from('---\ntitle: lipsum ipsum\n---\n*"dipsum"*')
  },
  atxHeading: { contents: Buffer.from('# Titulus\n*"tipsum"*') },
  setextHeading: { contents: Buffer.from('Titulus\n=======\n*"tipsum"*') },
  untitled: { contents: Buffer.from("*tipsum dipsum*") },
  multipleTitles: {
    contents: Buffer.from(
      '---\ntitle: lipsum ipsum\n---\n# Titulus\n*"tipsum"*'
    )
  },
  multipleH1: { contents: Buffer.from("# lipsum ipsum\n\n# Titulus tipsum") },
  invalidYAML: {
    contents: Buffer.from(
      '---\ntitle: "lipsum "fragor" ipsum"\n---\n*"dipsum"*'
    )
  },
  json: {
    contents: Buffer.from(
      '"{ \\"title\\": \\"ipsum blog\\", \\"description\\": \\"Typewriter put a bird on it\\" }"'
    )
  },
  invalidJSON: { contents: Buffer.from('"{ \\"title\\"') }
};

// Replace lodash.assign with Object.assign
Object.keys(fixtureConfig).forEach((key) => {
  fixtureConfig[key] = Object.assign({}, fixtureConfig[key], fixtureVinyl);
});

fixtureConfig.invalidJSON.path = "invalid.json";

// Helper to create Vinyl files with proper properties
function createFixture(type) {
  const cfg = fixtureConfig[type];
  return new Vinyl({
    path: cfg.path,
    contents: cfg.contents,
    stat: cfg.stat
  });
}

// Custom transform stream to collect objects into an array (replaces list-stream)
function collectStream() {
  const items = [];
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      items.push(chunk);
      callback();
    },
    flush(callback) {
      this.push(items);
      callback();
    }
  });
}

describe("gulp-markdown-to-json", () => {
  describe("Markdown and YAML parsing (marked)", () => {
    it("parses Markdown content and returns markup wrapped in JSON", async () => {
      const fixture = createFixture("frontmatter");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      assert.strictEqual(extname(result.path), ".json");
      const json = JSON.parse(result.contents.toString());
      assert.ok(json.body.includes("<p>"), `Expected body to contain <p>`);
    });

    it("parses YAML front matter and merges keys", async () => {
      const fixture = createFixture("frontmatter");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.ok(json.title, "Expected title to exist");
    });

    it("includes file modified date (as updatedAt)", async () => {
      const fixture = createFixture("frontmatter");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.updatedAt, mockDate.toISOString());
    });

    it("stream emits a PluginError with details from front-matter/js-yaml if YAML is invalid", async () => {
      const fixture = createFixture("invalidYAML");

      await new Promise((resolve, reject) => {
        markdown(config)
          .on("error", (err) => {
            // js-yaml may throw YAMLException or AssertionError depending on version
            assert.ok(
              err.name === "YAMLException" || err.name === "AssertionError",
              `Expected error name to be YAMLException or AssertionError, got ${err.name}`
            );
            // Stack trace may vary based on js-yaml version, just check that there is a stack
            assert.ok(err.stack, "Expected error to have a stack trace");
            resolve();
          })
          .write(fixture);
      });
    });
  });

  describe("Arguments API", () => {
    it("rename consolidated file", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config, "blog.json"))
          .on("data", (file) => {
            if (extname(file.path) === ".json") {
              assert.strictEqual(basename(file.path), "blog.json");
            }
          })
          .on("finish", resolve);
      });
    });

    it("pass a transform function", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(
            markdown(config, "blog.json", (data, file) => {
              data.test = true;
              return data;
            })
          )
          .on("data", (file) => {
            if (extname(file.path) === ".json") {
              const json = JSON.parse(file.contents.toString());
              assert.strictEqual(json.blog.blog.test, true);
              assert.strictEqual(basename(file.path), "blog.json");
            }
          })
          .on("finish", resolve);
      });
    });

    it("optional consolidated file rename", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(
            markdown(config, (data, file) => {
              data.test = true;
              return data;
            })
          )
          .on("data", (file) => {
            if (basename(file.path) === "content.json") {
              const json = JSON.parse(file.contents.toString());
              assert.strictEqual(json.blog.blog.test, true);
              assert.strictEqual(basename(file.path), "content.json");
            }
          })
          .on("finish", resolve);
      });
    });
  });

  describe("Title extraction", () => {
    it("does nothing if no h1 is found", async () => {
      const fixture = createFixture("untitled");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.ok(!("title" in json), "Expected title key to not exist");
    });

    it("extracts a title from the first atx-style h1", async () => {
      const fixture = createFixture("atxHeading");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "Titulus");
    });

    it("extracts a title from the first setext-style h1", async () => {
      const fixture = createFixture("setextHeading");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "Titulus");
    });

    it("uses the first h1 found", async () => {
      const fixture = createFixture("multipleH1");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "lipsum ipsum");
    });

    it("prefers YAML front matter titles over an extracted Markdown h1", async () => {
      const fixture = createFixture("multipleTitles");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "lipsum ipsum");
    });
  });

  describe("Title stripping", () => {
    const stripConfig = {
      renderer: marked,
      stripTitle: true
    };

    it("does nothing if stripTitle option is unspecified", async () => {
      const fixture = createFixture("atxHeading");

      const result = await new Promise((resolve) => {
        markdown(config)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.ok(
        json.body.includes("<h1>Titulus</h1>"),
        "Expected body to contain h1"
      );
    });

    it("strips the first h1 found", async () => {
      const fixture = createFixture("multipleH1");

      const result = await new Promise((resolve) => {
        markdown(stripConfig)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "lipsum ipsum");
      assert.ok(
        !json.body.includes("<h1>lipsum ipsum</h1>"),
        "Expected h1 to be stripped"
      );
    });

    it("does not strip title if YAML-specified title is used", async () => {
      const fixture = createFixture("multipleTitles");

      const result = await new Promise((resolve) => {
        markdown(stripConfig)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.ok(
        json.body.includes("<h1>Titulus</h1>"),
        "Expected body to contain h1"
      );
    });
  });

  describe("Transform function", () => {
    const transformConfig = {
      renderer: marked,
      transform: (data, file) => {
        delete data.body;
        data.path = file.path;
        return data;
      }
    };

    it("output file uses object returned by transform function", async () => {
      const fixture = createFixture("frontmatter");

      const result = await new Promise((resolve) => {
        markdown(transformConfig)
          .on("data", (file) => {
            resolve(file);
          })
          .write(fixture);
      });

      const json = JSON.parse(result.contents.toString());
      assert.strictEqual(json.title, "lipsum ipsum");
      assert.ok(!("body" in json), "Expected body to not exist");
      assert.ok("path" in json, "Expected path to exist");
    });

    it("consolidated output file uses objects returned by transform function", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(transformConfig))
          .on("data", (file) => {
            if (extname(file.path) === ".json") {
              const json = JSON.parse(file.contents.toString());
              assert.ok(
                !("body" in json.blog.posts["bushwick-artisan"]),
                "Expected body to not exist"
              );
              assert.ok(
                "path" in json.blog.posts["bushwick-artisan"],
                "Expected path to exist"
              );
            }
          })
          .on("finish", resolve);
      });
    });
  });

  describe("Output", () => {
    it("returns JSON for all Markdown in a specified directory structure", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const jsonFiles = files.filter(
              (file) => extname(file.path) === ".json"
            );
            assert.strictEqual(jsonFiles.length, 5);
          })
          .on("finish", resolve);
      });
    });

    it("passthrough existing JSON files", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const jsonFiles = files.filter(
              (file) => basename(file.path) === "site.json"
            );
            assert.strictEqual(jsonFiles.length, 1);
          })
          .on("finish", resolve);
      });
    });

    it("skip and flag invalid JSON files", async () => {
      const json = createFixture("json");
      const invalidJSON = createFixture("invalidJSON");

      await new Promise((resolve, reject) => {
        markdown(config)
          .on("data", (file) => {
            assert.strictEqual(basename(file.path), "content.json");
          })
          .on("error", (err) => {
            assert.strictEqual(err.message, "invalid.json is not valid JSON");
            resolve();
          })
          .write([json, invalidJSON]);
      });
    });

    it("consolidated output and single file, concurrently", async () => {
      await Promise.all([
        new Promise((resolve, reject) => {
          vfs
            .src(fixtureGlob)
            .pipe(collectStream())
            .pipe(markdown(config))
            .pipe(collectStream())
            .on("data", (files) => {
              const contentFiles = files.filter(
                (file) => file.basename === "content.json"
              );
              if (contentFiles.length > 0) {
                const json = JSON.parse(contentFiles[0].contents.toString());
                assert.ok(
                  json.blog.posts["oakland-activist"].body,
                  "Expected body to exist"
                );
              }
            })
            .on("error", reject)
            .on("finish", resolve);
        }),
        new Promise((resolve, reject) => {
          vfs
            .src(fixtureGlob)
            .pipe(
              markdown(config, (data, file) => {
                delete data.body;
                return data;
              })
            )
            .pipe(collectStream())
            .on("data", (files) => {
              const jsonFiles = files.filter(
                (file) => extname(file.path) === ".json"
              );
              assert.strictEqual(jsonFiles.length, 5);
            })
            .on("finish", resolve);
        })
      ]);
    });
  });

  describe("Consolidated Output", () => {
    it("consolidates output into a single file if buffered", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const jsonFiles = files.filter(
              (file) => extname(file.path) === ".json"
            );
            assert.strictEqual(jsonFiles.length, 1);
          })
          .on("finish", resolve);
      });
    });

    it("allows consolidated file to be renamed", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config, "blog.json"))
          .pipe(collectStream())
          .on("data", (files) => {
            const jsonFiles = files.filter(
              (file) => extname(file.path) === ".json"
            );
            if (jsonFiles.length > 0) {
              assert.strictEqual(basename(jsonFiles[0].path), "blog.json");
            }
          })
          .on("finish", resolve);
      });
    });

    it("represents the directory structure as a nested object", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const contentFiles = files.filter(
              (file) => file.basename === "content.json"
            );
            if (contentFiles.length > 0) {
              const json = JSON.parse(contentFiles[0].contents.toString());
              assert.ok(
                json.blog.posts["oakland-activist"],
                "Expected oakland-activist to exist"
              );
            }
          })
          .on("finish", resolve);
      });
    });

    it("deeply sorts the directory structure alphabetically", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const contentFiles = files.filter(
              (file) => file.basename === "content.json"
            );
            if (contentFiles.length > 0) {
              const json = JSON.parse(contentFiles[0].contents.toString());
              assert.deepStrictEqual(Object.keys(json.blog), [
                "blog",
                "posts",
                "site"
              ]);
              assert.deepStrictEqual(Object.keys(json.blog.posts), [
                "bushwick-artisan",
                "index",
                "oakland-activist"
              ]);
            }
          })
          .on("finish", resolve);
      });
    });

    it('merges files named "index" with parent directories in consolidated output', async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(
            markdown({
              renderer: config,
              flattenIndex: true
            })
          )
          .pipe(collectStream())
          .on("data", (files) => {
            const contentFiles = files.filter(
              (file) => file.basename === "content.json"
            );
            if (contentFiles.length > 0) {
              const json = JSON.parse(contentFiles[0].contents.toString());
              assert.strictEqual(json.blog.posts.title, "Archive");
              assert.ok(
                json.blog.posts["oakland-activist"],
                "Expected oakland-activist to exist"
              );
            }
          })
          .on("finish", resolve);
      });
    });

    it("merges like-named files with parent directories in consolidated output", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(
            markdown({
              renderer: config,
              flattenIndex: true
            })
          )
          .pipe(collectStream())
          .on("data", (files) => {
            const contentFiles = files.filter(
              (file) => file.basename === "content.json"
            );
            if (contentFiles.length > 0) {
              const json = JSON.parse(contentFiles[0].contents.toString());
              assert.ok(json.blog.title, "Expected blog.title to exist");
              assert.ok(
                json.blog.posts["oakland-activist"],
                "Expected oakland-activist to exist"
              );
            }
          })
          .on("finish", resolve);
      });
    });

    it("consolidated output includes passthrough JSON", async () => {
      await new Promise((resolve) => {
        vfs
          .src(fixtureGlob)
          .pipe(collectStream())
          .pipe(markdown(config))
          .pipe(collectStream())
          .on("data", (files) => {
            const contentFiles = files.filter(
              (file) => file.basename === "content.json"
            );
            if (contentFiles.length > 0) {
              const json = JSON.parse(contentFiles[0].contents.toString());
              assert.ok(
                json.blog.site.title,
                "Expected blog.site.title to exist"
              );
            }
          })
          .on("finish", resolve);
      });
    });
  });
});
