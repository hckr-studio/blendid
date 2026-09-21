import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import gulplog from "gulplog";
import { DOMParser } from "linkedom";
import PluginError from "plugin-error";
import Vinyl from "vinyl";
import svgstore from "./index.mjs";

// Simple mock for gulplog.info that captures calls
// This replaces sinon's stub functionality
const gulplogCalls = [];
const originalInfo = gulplog.info;
gulplog.info = (...args) => {
  gulplogCalls.push(args);
  return originalInfo(...args);
};
gulplog.info.getCall = (index) => ({ args: gulplogCalls[index] });

// Mock sandbox for restore functionality
const sandbox = {
  stub(obj, method) {
    gulplogCalls.length = 0;
    return gulplog.info;
  },
  restore() {
    gulplogCalls.length = 0;
  }
};

describe("gulp-svgstore", () => {
  beforeEach(() => {
    sandbox.stub(gulplog, "info");
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("should not create empty svg file", (t, done) => {
    const stream = svgstore();
    let isEmpty = true;

    stream.on("data", () => {
      isEmpty = false;
    });

    stream.on("end", () => {
      assert.ok(isEmpty, "Created empty svg");
      done();
    });

    stream.end();
  });

  it("should correctly merge svg files", (t, done) => {
    const stream = svgstore({ inlineSvg: true });

    stream.on("data", (file) => {
      const result = file.contents.toString();
      const target =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<symbol preserveAspectRatio="xMinYMid meet" viewBox="0 0 4 4" id="circle"><circle cx="2" cy="2" r="1" /></symbol>' +
        '<symbol id="square"><rect x="1" y="1" width="2" height="2" /></symbol>' +
        "</svg>";
      assert.strictEqual(result, target);
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg viewBox="0 0 4 4" preserveAspectRatio="xMinYMid meet"><circle cx="2" cy="2" r="1"/></svg>'
        ),
        path: "circle.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg><rect x="1" y="1" width="2" height="2"/></svg>'
        ),
        path: "square.svg"
      })
    );

    stream.end();
  });

  it("should not include null or invalid files", (t, done) => {
    const stream = svgstore({ inlineSvg: true });

    stream.on("data", (file) => {
      const result = file.contents.toString();
      const target =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<symbol viewBox="0 0 4 4" id="circle"><circle cx="2" cy="2" r="1" /></symbol>' +
        "</svg>";
      assert.strictEqual(result, target);
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>'
        ),
        path: "circle.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: null,
        path: "square.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from("not an svg"),
        path: "square.svg"
      })
    );

    stream.end();
  });

  it("should merge defs to parent svg file", (t, done) => {
    const stream = svgstore({ inlineSvg: true });

    stream.on("data", (file) => {
      const result = file.contents.toString();
      const target =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs><circle id="circ" cx="2" cy="2" r="1" /></defs>' +
        '<symbol viewBox="0 0 4 4" id="circle" />' +
        "</svg>";
      assert.strictEqual(result, target);
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg viewBox="0 0 4 4">' +
            '<defs><circle id="circ" cx="2" cy="2" r="1"/></svg></defs>' +
            '<circle cx="2" cy="2" r="1"/>' +
            "</svg>"
        ),
        path: "circle.svg"
      })
    );

    stream.end();
  });

  it("should emit error if files have the same name", (t, done) => {
    const stream = svgstore();

    stream.on("error", (error) => {
      assert.ok(error instanceof PluginError);
      assert.strictEqual(error.message, "File name should be unique: circle");
      done();
    });

    stream.write(
      new Vinyl({ contents: Buffer.from("<svg></svg>"), path: "circle.svg" })
    );
    stream.write(
      new Vinyl({ contents: Buffer.from("<svg></svg>"), path: "circle.svg" })
    );

    stream.end();
  });

  it("should generate result filename based on base path of the first file", (t, done) => {
    const stream = svgstore();

    stream.on("data", (file) => {
      assert.strictEqual(file.relative, "icons.svg");
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from("<svg/>"),
        path: "src/icons/circle.svg",
        base: "src/icons"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from("<svg/>"),
        path: "src2/icons2/square.svg",
        base: "src2/icons2"
      })
    );

    stream.end();
  });

  it("should generate svgstore.svg if base path of the 1st file is dot", (t, done) => {
    const stream = svgstore();

    stream.on("data", (file) => {
      assert.strictEqual(file.relative, "svgstore.svg");
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from("<svg/>"),
        path: "circle.svg",
        base: "."
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from("<svg/>"),
        path: "src2/icons2/square.svg",
        base: "src2"
      })
    );

    stream.end();
  });

  it("should include all namespace into final svg", (t, done) => {
    const stream = svgstore();

    stream.on("data", (file) => {
      const resultDom = new DOMParser().parseFromString(
        file.contents.toString(),
        "image/svg+xml"
      );
      const $resultSvg = resultDom.querySelector("svg");

      assert.strictEqual(
        $resultSvg.getAttribute("xmlns"),
        "http://www.w3.org/2000/svg"
      );
      assert.strictEqual(
        $resultSvg.getAttribute("xmlns:xlink"),
        "http://www.w3.org/1999/xlink"
      );
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="1" height="1"/>' +
            "</svg>"
        ),
        path: "rect.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
            'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
            "</svg>"
        ),
        path: "sandwich.svg"
      })
    );

    stream.end();
  });

  it("should not include duplicate namespaces into final svg", (t, done) => {
    const stream = svgstore({ inlineSvg: true });

    stream.on("data", (file) => {
      assert.strictEqual(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
          '<symbol id="rect" /><symbol id="sandwich" /></svg>',
        file.contents.toString()
      );
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
        ),
        path: "rect.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
        ),
        path: "sandwich.svg"
      })
    );

    stream.end();
  });

  it("should transfer svg presentation attributes to a wrapping g element", (t, done) => {
    const stream = svgstore({ inlineSvg: true });

    stream.on("data", (file) => {
      assert.strictEqual(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
          '<symbol id="rect"><g style="fill:#0000" stroke-linecap="round" stroke-width="2" stroke="currentColor"><rect width="1" height="1" /></g></symbol></svg>',
        file.contents.toString()
      );
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="fill:#0000"><rect width="1" height="1"/></svg>'
        ),
        path: "rect.svg"
      })
    );

    stream.end();
  });

  it("Warn about duplicate namespace value under different name", (t, done) => {
    const stream = svgstore();

    stream.on("data", () => {
      assert.strictEqual(
        "Same namespace value under different names : xmlns:lk and xmlns:xlink.\n" +
          "Keeping both.",
        gulplog.info.getCall(0).args[0]
      );
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:lk="http://www.w3.org/1999/xlink">' +
            '<rect id="a" width="1" height="1"/>' +
            '<use y="2" lk:href="#a"/>' +
            "</svg>"
        ),
        path: "rect.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
            'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
            "</svg>"
        ),
        path: "sandwich.svg"
      })
    );

    stream.end();
  });

  it("Strong warn about duplicate namespace name with different value", (t, done) => {
    const stream = svgstore();

    stream.on("data", () => {
      assert.strictEqual(
        "xmlns:xlink namespace appeared multiple times with different value. " +
          'Keeping the first one : "http://www.w3.org/1998/xlink".\n' +
          "Each namespace must be unique across files.",
        gulplog.info.getCall(0).args[0]
      );
      done();
    });

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1998/xlink">' +
            '<rect id="a" width="1" height="1"/>' +
            '<use y="2" xlink:href="#a"/>' +
            "</svg>"
        ),
        path: "rect.svg"
      })
    );

    stream.write(
      new Vinyl({
        contents: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
            'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
            "</svg>"
        ),
        path: "sandwich.svg"
      })
    );

    stream.end();
  });
});
