import assert from "node:assert";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";
import Vinyl from "vinyl";
import revRewrite from "./index.mjs";

const htmlFileBody =
  '<link rel="stylesheet" href="/css/style.css"><img src="image.png">';
const cssFileBody = 'body { background: url("image.png"); }';

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    const files = [];
    stream
      .on("error", (err) => {
        reject(err);
      })
      .on("data", (file) => {
        files.push(file);
      })
      .on("finish", () => {
        resolve(files);
      });
  });
}

function getFirstData(stream) {
  return new Promise((resolve, reject) => {
    stream.on("error", reject).once("data", (file) => {
      resolve(file);
    });
  });
}

export function createFile({
  path,
  contents = "",
  encoding = "utf8",
  revOrigPath
}) {
  const file = new Vinyl({
    path,
    contents: Buffer.from(contents, encoding)
  });

  if (revOrigPath) {
    file.revOrigPath = revOrigPath;
    file.revOrigBase = file.base;
  }

  return file;
}

export function createManifest() {
  const manifest = {
    "css/style.css": "css/style-81a53f7d04.css",
    "image.png": "image-d41d8cd98f.png"
  };
  return Buffer.from(JSON.stringify(manifest, null, 4));
}

describe("gulp-rev-rewrite", () => {
  it("collects and rewrites revisioned paths from the stream", async () => {
    const stream = revRewrite();

    stream.write(
      createFile({
        path: "index.html",
        contents: '<link rel="stylesheet" href="/css/style.css">'
      })
    );
    stream.end(
      createFile({
        path: "css/style-f2b804d3e3.css",
        contents: "body { color: red; }",
        revOrigPath: "css/style.css"
      })
    );

    const files = await streamToPromise(stream);
    let html;

    for (const file of files) {
      if (file.extname === ".html") {
        html = file.contents.toString();
      }
    }

    assert.strictEqual(
      html,
      '<link rel="stylesheet" href="/css/style-f2b804d3e3.css">'
    );
  });

  it("collects and rewrites revisioned paths from a manifest", async () => {
    const stream = revRewrite({ manifest: createManifest() });

    stream.end(
      createFile({
        path: "index.html",
        contents: '<link rel="stylesheet" href="/css/style.css">'
      })
    );

    const file = await getFirstData(stream);
    assert.strictEqual(
      file.contents.toString(),
      '<link rel="stylesheet" href="/css/style-81a53f7d04.css">'
    );
  });

  it("works with Windows-style paths", async () => {
    const stream = revRewrite();

    stream.write(
      createFile({
        path: "index.html",
        contents: '<link rel="stylesheet" href="/css/style.css">'
      })
    );
    stream.end(
      createFile({
        path: String.raw`css\style-f2b804d3e3.css`,
        contents: "body { color: red; }",
        revOrigPath: "css/style.css"
      })
    );

    const files = await streamToPromise(stream);
    let html;

    for (const file of files) {
      if (file.extname === ".html") {
        html = file.contents.toString();
      }
    }

    assert.strictEqual(
      html,
      '<link rel="stylesheet" href="/css/style-f2b804d3e3.css">'
    );
  });

  it("does not corrupt binary files", async () => {
    const stream = revRewrite({ manifest: createManifest() });

    const contents =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    stream.end(
      createFile({
        path: "image.png",
        contents,
        encoding: "base64"
      })
    );

    const file = await getFirstData(stream);
    assert.strictEqual(file.contents.toString("base64"), contents);
  });

  it("allows modifying unreved filenames", async () => {
    const modifyUnreved = (unreved, file) =>
      file.extname === ".html" ? `/${unreved}` : `${unreved}`;

    const stream = revRewrite({
      modifyUnreved,
      manifest: createManifest()
    });

    stream.write(createFile({ path: "style.css", contents: cssFileBody }));
    stream.end(createFile({ path: "index.html", contents: htmlFileBody }));

    const files = await streamToPromise(stream);
    for (const file of files) {
      const contents = file.contents.toString();
      console.log(contents);
      if (file.extname === ".html") {
        assert.strictEqual(contents.includes("css/style-81a53f7d04.css"), true);
        assert.strictEqual(contents.includes("image-d41d8cd98f.png"), false);
      } else {
        assert.strictEqual(contents.includes("image-d41d8cd98f.png"), true);
      }
    }
  });

  it("allows modifying reved filenames", async () => {
    const modifyReved = (reved, file) =>
      file.extname === ".html" ? `assets/${reved}` : `../${reved}`;

    const stream = revRewrite({
      modifyReved,
      manifest: createManifest()
    });

    stream.write(createFile({ path: "style.css", contents: cssFileBody }));
    stream.end(createFile({ path: "index.html", contents: htmlFileBody }));

    const files = await streamToPromise(stream);
    for (const file of files) {
      const contents = file.contents.toString();
      console.log(contents);
      if (file.extname === ".html") {
        assert.strictEqual(
          contents.includes("assets/css/style-81a53f7d04.css"),
          true
        );
        assert.strictEqual(
          contents.includes("assets/image-d41d8cd98f.png"),
          true
        );
      } else {
        assert.strictEqual(contents.includes("../image-d41d8cd98f.png"), true);
      }
    }
  });
});
