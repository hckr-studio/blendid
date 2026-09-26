import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import Vinyl from "vinyl";
import svgmin from "./index.mjs";

function readFixture(fileName) {
  return readFileSync(
    path.resolve(import.meta.dirname, "test-fixtures", fileName),
    "utf8"
  ).replace(/\n$/, "");
}

const inputSVG = readFixture("input.svg");
const outputSVG = readFixture("output.svg");

function makeTest(options, file, additionalSetup = () => {}) {
  return new Promise((resolve, reject) => {
    try {
      const transform = svgmin(options);
      let result;

      // Resolve the promise on the transform's finish or end
      // events.
      transform.on("finish", () => resolve(result));
      transform.on("error", (error) => reject(error));

      // Save the transform's data to the Promise's result.
      transform.on("data", (data) => {
        result = data.contents ? String(data.contents) : data.contents;
      });

      // Write the test's file to the transform.
      const vinylFile = Vinyl.isVinyl(file)
        ? file
        : new Vinyl({ contents: Buffer.from(file) });
      transform.write(vinylFile);

      // Allow individual tests to run additional code before the
      // transform 'end' event and to modify the transform or the Vinyl
      // file being written.
      additionalSetup(transform, vinylFile);

      transform.end();
    } catch (error) {
      reject(error);
    }
  });
}

describe("gulp-svgmin", () => {
  it("should let null files pass through", async () => {
    const result = await makeTest(
      null,
      new Vinyl({
        path: "null.md",
        contents: null
      })
    );

    assert.strictEqual(result, null);
  });

  it("should minify svg with svgo", async () => {
    const result = await makeTest(null, inputSVG);

    assert.strictEqual(result, outputSVG);
  });

  it("should honor disabling plugins, such as keeping the doctype", async () => {
    const result = await makeTest(
      {
        plugins: [
          {
            name: "preset-default",
            params: { overrides: { removeDoctype: false } }
          }
        ]
      },
      inputSVG
    );

    assert.match(result, /DOCTYPE/);
  });

  it("should allow disabling multiple plugins", async () => {
    const result = await makeTest(
      {
        plugins: [
          {
            name: "preset-default",
            params: {
              overrides: { removeDoctype: false, removeComments: false }
            }
          }
        ]
      },
      inputSVG
    );

    assert.match(result, /DOCTYPE/);
    assert.match(result, /test comment/);
  });

  it("should allow per file options, such as keeping the doctype", async () => {
    const vinylFile = new Vinyl({ contents: Buffer.from(inputSVG) });

    const result = await makeTest((file) => {
      assert.strictEqual(file, vinylFile);
      return {
        plugins: [
          {
            name: "preset-default",
            params: { overrides: { removeDoctype: false } }
          }
        ]
      };
    }, vinylFile);

    assert.match(result, /DOCTYPE/);
  });

  it("should emit an error when the Vinyl object is in stream mode", async () => {
    await assert.rejects(
      makeTest(
        null,
        // Create a stream-mode Vinyl object.
        new Vinyl({
          contents: new PassThrough()
        }),
        (transform, vinylFile) => {
          // Write the SVG file to the stream.
          vinylFile.contents.write(inputSVG);
          vinylFile.contents.end();
        }
      ),
      /Streaming not supported/
    );
  });

  it("should emit an error when svgo throws an error", async () => {
    await assert.rejects(makeTest(null, "file does not contain an SVG"), {
      name: "SvgoParserError"
    });
  });
});
