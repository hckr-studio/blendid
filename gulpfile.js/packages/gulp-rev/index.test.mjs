import assert from "node:assert";
import { Buffer } from "node:buffer";
import path from "node:path";
import { describe, it } from "node:test";
import Vinyl from "vinyl";
import rev from "./index.mjs";

function createFile({
  path,
  revOrigPath,
  revOrigBase,
  origName,
  revName,
  cwd,
  base,
  contents = ""
}) {
  let file;
  file = new Vinyl({
    path,
    cwd,
    base,
    contents: Buffer.from(contents)
  });
  file.revOrigPath = revOrigPath;
  file.revOrigBase = revOrigBase;
  file.origName = origName;
  file.revName = revName;

  return file;
}

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

const manifestFixturePath = path.join(
  import.meta.dirname,
  "test-fixtures",
  "manifest.json"
);

describe("gulp-rev", () => {
  it("revs files", async () => {
    const stream = rev();
    const file = createFile({
      path: "unicorn.css"
    });

    stream.end(file);

    const result = await getFirstData(stream);
    assert.strictEqual(result.path, "unicorn-d41d8cd98f.css");
    assert.strictEqual(result.revOrigPath, "unicorn.css");
  });

  it("adds the revision hash before the first `.` in the filename", async () => {
    const stream = rev();
    const file = createFile({
      path: "unicorn.css.map"
    });

    stream.end(file);

    const result = await getFirstData(stream);
    assert.strictEqual(result.path, "unicorn-d41d8cd98f.css.map");
    assert.strictEqual(result.revOrigPath, "unicorn.css.map");
  });

  it("stores the hashes for later", async () => {
    const stream = rev();
    const file = createFile({
      path: "unicorn.css"
    });

    stream.end(file);

    const result = await getFirstData(stream);
    assert.strictEqual(result.path, "unicorn-d41d8cd98f.css");
    assert.strictEqual(result.revOrigPath, "unicorn.css");
    assert.strictEqual(result.revHash, "d41d8cd98f");
  });

  it("handles sourcemaps transparently", async () => {
    const stream = rev();

    stream.write(
      createFile({
        path: "pastissada.css"
      })
    );

    stream.end(
      createFile({
        path: "maps/pastissada.css.map",
        contents: JSON.stringify({ file: "pastissada.css" })
      })
    );

    const files = await streamToPromise(stream);
    let sourcemapCount = 0;

    for (const file of files) {
      if (path.extname(file.path) === ".map") {
        assert.strictEqual(
          file.path,
          path.normalize("maps/pastissada-d41d8cd98f.css.map")
        );
        sourcemapCount++;
      }
    }

    assert.strictEqual(sourcemapCount, 1);
  });

  it("handles unparseable sourcemaps correctly", async () => {
    const stream = rev();

    stream.write(
      createFile({
        path: "pastissada.css"
      })
    );

    stream.end(
      createFile({
        path: "pastissada.css.map",
        contents: "Wait a minute, this is invalid JSON!"
      })
    );

    const files = await streamToPromise(stream);
    let sourcemapCount = 0;

    for (const file of files) {
      if (path.extname(file.path) === ".map") {
        assert.strictEqual(file.path, "pastissada-d41d8cd98f.css.map");
        sourcemapCount++;
      }
    }

    assert.strictEqual(sourcemapCount, 1);
  });

  it("okay when the optional sourcemap.file is not defined", async () => {
    const stream = rev();

    stream.write(
      createFile({
        path: "pastissada.css"
      })
    );

    stream.end(
      createFile({
        path: "pastissada.css.map",
        contents: JSON.stringify({})
      })
    );

    const files = await streamToPromise(stream);
    let sourcemapCount = 0;

    for (const file of files) {
      if (path.extname(file.path) === ".map") {
        assert.strictEqual(file.path, "pastissada-d41d8cd98f.css.map");
        sourcemapCount++;
      }
    }

    assert.strictEqual(sourcemapCount, 1);
  });

  it("handles a `.` in the folder name", async () => {
    const stream = rev();
    const file = createFile({
      path: "mysite.io/unicorn.css"
    });

    stream.end(file);

    const result = await getFirstData(stream);
    assert.strictEqual(
      result.path,
      path.normalize("mysite.io/unicorn-d41d8cd98f.css")
    );
    assert.strictEqual(
      result.revOrigPath,
      path.normalize("mysite.io/unicorn.css")
    );
  });

  describe("manifest", () => {
    it("builds a rev manifest file", async () => {
      const stream = rev.manifest();

      stream.end(
        createFile({
          path: "unicorn-d41d8cd98f.css",
          revOrigPath: "unicorn.css"
        })
      );

      const file = await getFirstData(stream);
      assert.ok(file.relative.includes("rev-manifest.json"));
      assert.deepStrictEqual(JSON.parse(file.contents.toString()), {
        "unicorn.css": "unicorn-d41d8cd98f.css"
      });
    });

    it("allows naming the manifest file", async () => {
      const manifestPath = "manifest.json";
      const stream = rev.manifest({ path: manifestPath });

      stream.end(
        createFile({
          path: "unicorn-d41d8cd98f.css",
          revOrigPath: "unicorn.css"
        })
      );

      const file = await getFirstData(stream);
      assert.ok(file.relative.includes(manifestPath));
    });

    it("appends to an existing rev manifest file", async () => {
      const stream = rev.manifest({
        path: manifestFixturePath,
        merge: true
      });

      stream.end(
        createFile({
          path: "unicorn-d41d8cd98f.css",
          revOrigPath: "unicorn.css"
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      assert.deepStrictEqual(manifest, {
        "app.js": "app-a41d8cd1.js",
        "unicorn.css": "unicorn-d41d8cd98f.css"
      });
    });

    it("does not append to an existing rev manifest by default", async () => {
      const stream = rev.manifest({ path: manifestFixturePath });

      stream.end(
        createFile({
          path: "unicorn-d41d8cd98f.css",
          revOrigPath: "unicorn.css"
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      assert.deepStrictEqual(manifest, {
        "unicorn.css": "unicorn-d41d8cd98f.css"
      });
    });

    it("sorts the rev manifest keys", async () => {
      const stream = rev.manifest({
        path: manifestFixturePath,
        merge: true
      });

      stream.write(
        createFile({
          path: "unicorn-d41d8cd98f.css",
          revOrigPath: "unicorn.css"
        })
      );
      stream.end(
        createFile({
          path: "pony-d41d8cd98f.css",
          revOrigPath: "pony.css"
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      const keys = Object.keys(manifest);
      assert.strictEqual(keys[0], "app.js");
      assert.strictEqual(keys[1], "pony.css");
      assert.strictEqual(keys[2], "unicorn.css");
    });

    it("uses relative paths based on the file base", async () => {
      const stream = rev.manifest();

      stream.write(
        createFile({
          cwd: import.meta.dirname,
          base: path.join(import.meta.dirname, "foo"),
          path: path.join(import.meta.dirname, "foo", "unicorn-d41d8cd98f.css"),
          revOrigBase: path.join(import.meta.dirname, "foo"),
          revOrigPath: path.join(import.meta.dirname, "foo", "unicorn.css")
        })
      );
      stream.end(
        createFile({
          cwd: import.meta.dirname,
          base: path.join(import.meta.dirname, "bar"),
          path: path.join(import.meta.dirname, "bar", "pony-d41d8cd98f.css"),
          revOrigBase: path.join(import.meta.dirname, "bar"),
          revOrigPath: path.join(import.meta.dirname, "bar", "pony.css")
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      assert.strictEqual(Object.keys(manifest).length, 2);
      assert.ok("unicorn.css" in manifest);
      assert.ok("pony.css" in manifest);
    });

    it("respects files coming from directories with different bases", async () => {
      const stream = rev.manifest();

      stream.write(
        createFile({
          cwd: import.meta.dirname,
          base: path.join(import.meta.dirname, "output"),
          path: path.join(
            import.meta.dirname,
            "output",
            "foo",
            "scriptfoo-d41d8cd98f.js"
          ),
          revOrigBase: path.join(import.meta.dirname, "vendor1"),
          revOrigPath: path.join(
            import.meta.dirname,
            "vendor1",
            "foo",
            "scriptfoo.js"
          )
        })
      );
      stream.end(
        createFile({
          cwd: import.meta.dirname,
          base: path.join(import.meta.dirname, "output"),
          path: path.join(
            import.meta.dirname,
            "output",
            "bar",
            "scriptbar-d41d8cd98f.js"
          ),
          revOrigBase: path.join(import.meta.dirname, "vendor2"),
          revOrigPath: path.join(
            import.meta.dirname,
            "vendor2",
            "bar",
            "scriptbar.js"
          )
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      assert.strictEqual(Object.keys(manifest).length, 2);
      assert.ok("foo/scriptfoo.js" in manifest);
      assert.ok("bar/scriptbar.js" in manifest);
    });

    it("uses correct base path for each file", async () => {
      const stream = rev.manifest();

      stream.write(
        createFile({
          cwd: "app/",
          base: "app/",
          path: path.join("app", "foo", "scriptfoo-d41d8cd98f.js"),
          revOrigPath: "scriptfoo.js"
        })
      );
      stream.end(
        createFile({
          cwd: "/",
          base: "assets/",
          path: path.join("/assets", "bar", "scriptbar-d41d8cd98f.js"),
          revOrigPath: "scriptbar.js"
        })
      );

      const file = await getFirstData(stream);
      const manifest = JSON.parse(file.contents.toString());
      assert.strictEqual(Object.keys(manifest).length, 2);
      assert.ok("foo/scriptfoo.js" in manifest);
      assert.ok("bar/scriptbar.js" in manifest);
    });
  });
});
