import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import fm, { test } from "../lib/front-matter.mjs";

describe("front-matter", () => {
  it("should export a function", () => {
    assert.equal(typeof fm, "function");
  });

  it("should parse yaml delimited by `---`", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/dashes-seperator.md"),
      "utf8"
    );

    const content = fm(data);

    assert.ok(content.attributes, "should have `attributes` key");
    assert.equal(content.attributes.title, "Three dashes marks the spot");
    assert.equal(content.attributes.tags?.length, 3);

    assert.ok(content.body, "should have a `body` key");
    assert.ok(content.body.match("don't break"), "should match body");
    assert.ok(content.body.match("---"), "should match body");
    assert.ok(
      content.body.match("Also this shouldn't be a problem"),
      "should match body"
    );

    assert.equal(content.bodyBegin, 10);

    assert.ok(content.frontmatter, "should have a `frontmatter` key");
    assert.ok(
      content.frontmatter.match("title: Three dashes marks the spot"),
      "should match frontmatter"
    );
    assert.ok(
      content.frontmatter.match(
        "expaned-description: with some --- crazy stuff in it"
      ),
      "should match frontmatter"
    );
  });

  it("should parse yaml delimited by `= yaml =`", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/yaml-seperator.md"),
      "utf8"
    );

    const content = fm(data);
    const meta = content.attributes;
    const body = content.body;

    assert.equal(meta.title, "I couldn't think of a better name");
    assert.equal(meta.description, "Just an example of using `= yaml =`");
    assert.ok(
      body.match("Plays nice with markdown syntax highlighting"),
      "should match body"
    );
  });

  it("should parse yaml ended by `...`", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/dots-ending.md"),
      "utf8"
    );

    const content = fm(data);
    const meta = content.attributes;
    const body = content.body;

    assert.equal(meta.title, "Example with dots document ending");
    assert.equal(meta.description, "Just an example of using `...`");
    assert.ok(body.match("It shouldn't break with ..."), "should match body");
  });

  it("should handle string missing front-matter", () => {
    const content = fm("No front matter here");

    assert.equal(content.body, "No front matter here");
  });

  it("should handle string missing body", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/missing-body.md"),
      "utf8"
    );

    const content = fm(data);

    assert.equal(content.attributes.title, "Three dashes marks the spot");
    assert.equal(content.attributes.tags?.length, 3);
    assert.equal(content.body, "");
    assert.equal(content.bodyBegin, 9);
  });

  it("should throw on insecure yaml", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/unsafe.md"),
      "utf8"
    );

    assert.throws(() => {
      fm(data);
    }, /YAMLException/);
  });

  it("should parse wrapped text in yaml", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/wrapped-text.md"),
      "utf8"
    );

    const content = fm(data);
    const folded = [
      "There once was a man from Darjeeling",
      "Who got on a bus bound for Ealing",
      "    It said on the door",
      '    "Please don\'t spit on the floor"',
      "So he carefully spat on the ceiling\n"
    ].join("\n");

    assert.equal(content.attributes["folded-text"], folded);
    assert.ok(
      content.body.match("Some crazy stuff going on up there"),
      "should match body"
    );
  });

  it("should handle strings with byte order mark", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/bom.md"),
      "utf8"
    );

    const content = fm(data);

    assert.equal(
      content.attributes.title,
      "Relax guy, I'm not hiding any BOMs"
    );
  });

  it("should handle no front matter, markdown with hr", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/no-front-matter.md"),
      "utf8"
    );

    const content = fm(data);
    assert.equal(content.body, data);
    assert.equal(content.bodyBegin, 1);
  });

  it("should handle complex and unsafe yaml with allowUnsafe option", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/complex-yaml.md"),
      "utf8"
    );

    const content = fm(data, { allowUnsafe: true });
    assert.ok(content.attributes, "should have `attributes` key");
    assert.equal(content.attributes.title, "This is a title!");
    assert.equal(content.attributes.contact, null);
    assert.equal(content.attributes.match, "/pattern/gim");
  });

  it("should test yaml separator", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/yaml-seperator.md"),
      "utf8"
    );

    assert.equal(test(data), true);
  });

  it("should test dashes separator", async () => {
    const data = await readFile(
      resolve(import.meta.dirname, "./test-fixtures/dashes-seperator.md"),
      "utf8"
    );

    assert.equal(test(data), true);
  });

  it("should test no front-matter", () => {
    assert.equal(test("no front matter here"), false);
  });

  it("should support live updating", () => {
    const separator = "---";
    let string = "";
    for (let i = 0; i < separator.length; i++) {
      string += separator[i];

      try {
        fm(string);
      } catch (e) {
        assert.ifError(e);
      }
    }

    string += "\n";
    string += "foo: bar";

    let content = fm(string);

    assert.deepEqual(content, {
      attributes: {},
      body: string,
      bodyBegin: 1
    });

    string += "\n---\n";
    content = fm(string);
    assert.deepEqual(content, {
      attributes: { foo: "bar" },
      body: "",
      bodyBegin: 4,
      frontmatter: "foo: bar"
    });
  });
});
