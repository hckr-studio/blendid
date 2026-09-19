import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { describe, it } from "node:test";
import Vinyl from "vinyl";
import nunjucksRender, { deepClone } from "./index.mjs";

function getFile(filepath) {
  return new Vinyl({
    base: "test/test-fixtures",
    cwd: "test",
    path: filepath,
    contents: readFileSync(join(import.meta.dirname, filepath))
  });
}

function getExpected(filepath) {
  return readFileSync(join(import.meta.dirname, "expected", filepath), "utf8");
}

describe("gulp-nunjucks-render", () => {
  it("should render a html file", (t, done) => {
    const stream = nunjucksRender();
    const expected = getExpected("hello-world.html");
    const file = getFile("test-fixtures/hello-world.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(extname(output.path), ".html");
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should remove extension", (t, done) => {
    const stream = nunjucksRender({
      ext: null
    });
    const file = getFile("test-fixtures/hello-world.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(extname(output.path), "");
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("accept global env as second argument", (t, done) => {
    const stream = nunjucksRender({
      data: {
        html: "<strong>Hello World!</strong>"
      },
      envOptions: {
        autoescape: true
      }
    });
    const expected = getExpected("global.html");
    const file = getFile("test-fixtures/global.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(extname(output.path), ".html");
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should use nunjucks environment to resolve paths", (t, done) => {
    const stream = nunjucksRender({
      path: [join(import.meta.dirname, "test-fixtures")]
    });
    const expected = getExpected("child.html");
    const file = getFile("test-fixtures/child.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should pass context data", (t, done) => {
    const stream = nunjucksRender({
      data: {
        title: "Overridden title"
      }
    });
    const expected = getExpected("overridden-title.html");
    const file = getFile("test-fixtures/hello-world.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should use gulp-data", (t, done) => {
    const stream = nunjucksRender();
    const expected = getExpected("overridden-title.html");
    const file = getFile("test-fixtures/hello-world.nunj");
    file.data = { title: "Overridden title" };

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.data.title, "Overridden title");
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should merge gulp-data with context", (t, done) => {
    const stream = nunjucksRender({
      data: {
        title: "Title from context"
      }
    });
    const expected = getExpected("merge-data.html");
    const file = getFile("test-fixtures/merge-data.nunj");
    file.data = { title: "Title from data", text: "Some text" };

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should create a new data context for each template", (t, done) => {
    const stream = nunjucksRender({
      path: [join(import.meta.dirname, "test-fixtures")]
    });
    const expected1 = getExpected("set.html");
    const expected2 = getExpected("hello-world.html");
    const file = getFile("test-fixtures/set.nunj");
    const file2 = getFile("test-fixtures/hello-world.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.path, normalize("test-fixtures/set.html"));
      assert.equal(output.contents.toString(), expected1);

      stream.once("data", (output) => {
        assert.ok(output);
        assert.ok(output.contents);
        assert.equal(output.path, normalize("test-fixtures/hello-world.html"));
        assert.equal(output.contents.toString(), expected2);
      });

      stream.write(file2);
      stream.end();
    });
    stream.on("finish", () => {
      done();
    });
    stream.write(file);
  });

  it("should throw an error", (t, done) => {
    const stream = nunjucksRender();
    const file = getFile("test-fixtures/import-error.nunj");

    const onerror = function (err) {
      assert.ok(err);
      this.removeListener("finish", onfinish);
      done();
    };

    const onfinish = () => {
      done(new Error("Template has a syntax error which wasn't thrown."));
    };

    stream.on("error", onerror);
    stream.on("finish", onfinish);

    stream.write(file);
    stream.end();
  });

  it("error should contain file path", (t, done) => {
    const stream = nunjucksRender();
    const file = getFile("test-fixtures/import-error.nunj");

    const onerror = function (err) {
      assert.ok(err);
      assert.ok(err.fileName);
      this.removeListener("finish", onfinish);
      done();
    };

    const onfinish = () => {
      done(new Error("Template has a syntax error which wasn't thrown."));
    };

    stream.on("error", onerror);
    stream.on("finish", onfinish);

    stream.write(file);
    stream.end();
  });

  it("should inherit extension if inheritExtension option is provided", (t, done) => {
    const stream = nunjucksRender({ inheritExtension: true });
    const expected = getExpected("base.tpl");
    const file = getFile("test-fixtures/base.tpl");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.contents.toString(), expected);
      assert.equal(extname(output.path), ".tpl");
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("Can manipulate environment with hook", (t, done) => {
    const hook = (environment) => {
      environment.addFilter("defaultName", (str, defName) => {
        if (!str) {
          return (defName || "John Doe").toUpperCase();
        }

        return str.toUpperCase();
      });

      environment.addGlobal("globalTitle", "Test nunjucks project");
    };

    const stream = nunjucksRender({
      manageEnv: hook
    });

    const expected = getExpected("custom-filter.html");
    const file = getFile("test-fixtures/custom-filter.nunj");

    stream.once("data", (output) => {
      assert.ok(output);
      assert.ok(output.contents);
      assert.equal(output.contents.toString(), expected);
      done();
    });
    stream.write(file);
    stream.end();
  });

  it("should use custom default config", (t, done) => {
    const streamAutoescape = nunjucksRender({
      envOptions: {
        autoescape: true
      },
      data: {
        html: "<strong>Hello World!</strong>"
      }
    });

    const fileAutoescape = getFile("test-fixtures/global.nunj");
    const fileNotAutoescape = getFile("test-fixtures/global.nunj");
    const expectedAutoescape = getExpected("global.html");
    const expectedNotAutoescape = getExpected("global-not-excaped.html");

    streamAutoescape.once("data", (output) => {
      assert.equal(output.contents.toString(), expectedAutoescape);

      const streamNotAutoescape = nunjucksRender({
        envOptions: {
          autoescape: false
        },
        data: {
          html: "<strong>Hello World!</strong>"
        }
      });

      streamNotAutoescape.once("data", (output) => {
        assert.equal(output.contents.toString(), expectedNotAutoescape);
        done();
      });
      streamNotAutoescape.write(fileNotAutoescape);
      streamNotAutoescape.end();
    });
    streamAutoescape.write(fileAutoescape);
    streamAutoescape.end();
  });
});

describe("deepClone with Temporal objects", () => {
  if (typeof Temporal === "undefined") {
    it.skip("Temporal API not available - skipping Temporal tests", () => {});
  } else {
    it("should deep clone Temporal.PlainDate", () => {
      const original = Temporal.PlainDate.from("2024-01-15");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.PlainDate);
      assert.equal(cloned.year, original.year);
      assert.equal(cloned.month, original.month);
      assert.equal(cloned.day, original.day);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.PlainTime", () => {
      const original = Temporal.PlainTime.from("10:30:45");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.PlainTime);
      assert.equal(cloned.hour, original.hour);
      assert.equal(cloned.minute, original.minute);
      assert.equal(cloned.second, original.second);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.PlainDateTime", () => {
      const original = Temporal.PlainDateTime.from("2024-01-15T10:30:45");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.PlainDateTime);
      assert.equal(cloned.year, original.year);
      assert.equal(cloned.month, original.month);
      assert.equal(cloned.day, original.day);
      assert.equal(cloned.hour, original.hour);
      assert.equal(cloned.minute, original.minute);
      assert.equal(cloned.second, original.second);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.ZonedDateTime", () => {
      const original = Temporal.ZonedDateTime.from("2024-01-15T10:30:45[America/New_York]");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.ZonedDateTime);
      assert.equal(cloned.year, original.year);
      assert.equal(cloned.month, original.month);
      assert.equal(cloned.day, original.day);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.PlainMonthDay", () => {
      const original = Temporal.PlainMonthDay.from("01-15");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.PlainMonthDay);
      assert.equal(cloned.month, original.month);
      assert.equal(cloned.day, original.day);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.PlainYearMonth", () => {
      const original = Temporal.PlainYearMonth.from("2024-01");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.PlainYearMonth);
      assert.equal(cloned.year, original.year);
      assert.equal(cloned.month, original.month);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.Duration", () => {
      const original = Temporal.Duration.from({ hours: 2, minutes: 30, seconds: 15 });
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.Duration);
      assert.equal(cloned.hours, original.hours);
      assert.equal(cloned.minutes, original.minutes);
      assert.equal(cloned.seconds, original.seconds);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone Temporal.Instant", () => {
      const original = Temporal.Instant.from("2024-01-15T10:30:45Z");
      const cloned = deepClone(original);

      assert.ok(cloned instanceof Temporal.Instant);
      assert.equal(cloned.epochSeconds, original.epochSeconds);
      assert.equal(cloned.epochMilliseconds, original.epochMilliseconds);
      assert.notStrictEqual(cloned, original);
    });

    it("should deep clone objects containing Temporal values", () => {
      const originalDate = Temporal.PlainDate.from("2024-01-15");
      const originalTime = Temporal.PlainTime.from("10:30:00");
      const original = {
        date: originalDate,
        time: originalTime,
        nested: {
          date: originalDate
        }
      };

      const cloned = deepClone(original);

      assert.ok(cloned.date instanceof Temporal.PlainDate);
      assert.ok(cloned.time instanceof Temporal.PlainTime);
      assert.ok(cloned.nested.date instanceof Temporal.PlainDate);
      assert.notStrictEqual(cloned.date, original.date);
      assert.notStrictEqual(cloned.time, original.time);
      assert.notStrictEqual(cloned.nested.date, original.date);
      assert.notStrictEqual(cloned.nested, original.nested);
    });

    it("should deep clone arrays containing Temporal values", () => {
      const originalDate = Temporal.PlainDate.from("2024-01-15");
      const originalTime = Temporal.PlainTime.from("10:30:00");
      const original = [originalDate, originalTime];

      const cloned = deepClone(original);

      assert.ok(Array.isArray(cloned));
      assert.equal(cloned.length, 2);
      assert.ok(cloned[0] instanceof Temporal.PlainDate);
      assert.ok(cloned[1] instanceof Temporal.PlainTime);
      assert.notStrictEqual(cloned[0], original[0]);
      assert.notStrictEqual(cloned[1], original[1]);
      assert.notStrictEqual(cloned, original);
    });
  }
});
