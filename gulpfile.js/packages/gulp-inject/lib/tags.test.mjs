import assert from "node:assert";
import { beforeEach, describe, test } from "node:test";
import tagsFactory from "./tags.mjs";

let tags;
let tagsModule;

describe("tags", () => {
  test("should not crash when required", () => {
    assert.doesNotThrow(() => {
      tagsModule = tagsFactory;
    });
  });

  beforeEach(() => {
    if (!tagsModule) {
      return;
    }
    tags = tagsModule();
  });

  describe("start()", () => {
    describe("with no default", () => {
      test("should return html comment tag for html target files", () => {
        assert.strictEqual(tags.start("html"), "<!-- {{name}}:{{ext}} -->");
      });

      test("should return jsx comments for jsx target files", () => {
        assert.strictEqual(tags.start("jsx"), "{/* {{name}}:{{ext}} */}");
      });

      test("should return jade comments for jade target files", () => {
        assert.strictEqual(tags.start("jade", "css"), "//- {{name}}:{{ext}}");
      });

      test("should return pug comments for pug target files", () => {
        assert.strictEqual(tags.start("pug", "css"), "//- {{name}}:{{ext}}");
      });

      test("should return slm comments for slm target files", () => {
        assert.strictEqual(tags.start("slm"), "/ {{name}}:{{ext}}");
      });

      test("should return haml comment tag for haml files", () => {
        assert.strictEqual(tags.start("haml"), "-# {{name}}:{{ext}}");
      });

      test("should return less comment tag for less files", () => {
        assert.strictEqual(tags.start("less"), "/* {{name}}:{{ext}} */");
      });

      test("should return sass comment tag for sass files", () => {
        assert.strictEqual(tags.start("sass"), "/* {{name}}:{{ext}} */");
      });

      test("should return sass comment tag for sass files", () => {
        assert.strictEqual(tags.start("scss"), "/* {{name}}:{{ext}} */");
      });

      test("should return html comment tag for other target files", () => {
        assert.strictEqual(tags.start("txt"), "<!-- {{name}}:{{ext}} -->");
      });
    });

    describe("given a string as default", () => {
      test("should return the string", () => {
        assert.strictEqual(
          tags.start("json", "css", '"{{ext}}": ['),
          '"{{ext}}": ['
        );
      });
    });

    describe("given a function as default", () => {
      test("should receive target file and source file extensions as parameters", () => {
        tags.start("html", "css", (targetExt, sourceExt) => {
          assert.strictEqual(targetExt, "html");
          assert.strictEqual(sourceExt, "css");
        });
      });

      test("should return result of function untouched", () => {
        assert.strictEqual(
          tags.start("json", "css", () => '"{{ext}}": ['),
          '"{{ext}}": ['
        );
      });
    });
  });

  describe("end()", () => {
    describe("with no default", () => {
      test("should return html comment tag for html target files", () => {
        assert.strictEqual(tags.end("html"), "<!-- endinject -->");
      });

      test("should return jsx comments for jsx target files", () => {
        assert.strictEqual(tags.end("jsx"), "{/* endinject */}");
      });

      test("should return jade comments for jade target files", () => {
        assert.strictEqual(tags.end("jade"), "//- endinject");
      });

      test("should return pug comments for pug target files", () => {
        assert.strictEqual(tags.end("pug"), "//- endinject");
      });

      test("should return slm comments for slm target files", () => {
        assert.strictEqual(tags.end("slm"), "/ endinject");
      });

      test("should return haml comments for haml target files", () => {
        assert.strictEqual(tags.end("haml"), "-# endinject");
      });

      test("should return haml comments for haml target files", () => {
        assert.strictEqual(tags.end("less"), "/* endinject */");
      });

      test("should return sass comments for sass target files", () => {
        assert.strictEqual(tags.end("sass"), "/* endinject */");
      });

      test("should return scss comments for scss target files", () => {
        assert.strictEqual(tags.end("scss"), "/* endinject */");
      });

      test("should return html comment tag for other target files", () => {
        assert.strictEqual(tags.end("txt"), "<!-- endinject -->");
      });
    });

    describe("given a string as default", () => {
      test("should return the string", () => {
        assert.strictEqual(
          tags.end("json", "css", "] // {{ext}}"),
          "] // {{ext}}"
        );
      });
    });

    describe("given a function as default", () => {
      test("should receive target file and source file extensions as parameters", () => {
        tags.end("html", "css", (targetExt, sourceExt) => {
          assert.strictEqual(targetExt, "html");
          assert.strictEqual(sourceExt, "css");
        });
      });

      test("should return result of function untouched", () => {
        assert.strictEqual(
          tags.end("json", "css", () => "] // {{ext}}"),
          "] // {{ext}}"
        );
      });
    });
  });
});
