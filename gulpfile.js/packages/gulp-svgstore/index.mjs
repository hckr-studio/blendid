import path from "node:path";
import { Transform } from "node:stream";
import gulplog from "gulplog";
import { DOMParser } from "linkedom";
import PluginError from "plugin-error";
import Vinyl from "vinyl";

const presentationAttributes = new Set([
  "style",
  "alignment-baseline",
  "baseline-shift",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "cursor",
  "d",
  "direction",
  "display",
  "dominant-baseline",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "image-rendering",
  "kerning",
  "letter-spacing",
  "lighting-color",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "opacity",
  "overflow",
  "pointer-events",
  "shape-rendering",
  "solid-color",
  "solid-opacity",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "text-decoration",
  "text-rendering",
  "transform",
  "unicode-bidi",
  "vector-effect",
  "visibility",
  "word-spacing",
  "writing-mode"
]);

export default (config) => {
  config = config || {};

  const namespaces = {};
  let isEmpty = true;
  let fileName;
  const inlineSvg = config.inlineSvg || false;
  const ids = {};

  let resultSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs/></svg>';
  if (!inlineSvg) {
    resultSvg =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
      resultSvg;
  }

  const dom = new DOMParser().parseFromString(resultSvg, "image/svg+xml");
  const $combinedSvg = dom.querySelector("svg");
  const $combinedDefs = dom.querySelector("defs");
  const stream = new Transform({
    objectMode: true,
    transform(file, _, cb) {
      if (file.isStream()) {
        return cb(
          new PluginError("gulp-svgstore", "Streams are not supported!")
        );
      }

      if (file.isNull()) return cb();

      const svgDoc = new DOMParser().parseFromString(
        file.contents.toString(),
        "image/svg+xml"
      );
      const $svg = svgDoc.querySelector("svg");

      if (!$svg) return cb();

      const idAttr = path.basename(file.relative, path.extname(file.relative));
      const viewBoxAttr = $svg.getAttribute("viewBox");
      const preserveAspectRatioAttr = $svg.getAttribute("preserveAspectRatio");
      const $symbol = dom.createElement("symbol");

      if (idAttr in ids) {
        return cb(
          new PluginError(
            "gulp-svgstore",
            "File name should be unique: " + idAttr
          )
        );
      }

      ids[idAttr] = true;

      if (!fileName) {
        fileName = path.basename(file.base);
        if (fileName === "." || !fileName) {
          fileName = "svgstore.svg";
        } else {
          fileName = fileName.split(path.sep).shift() + ".svg";
        }
      }

      if (file && isEmpty) {
        isEmpty = false;
      }

      $symbol.setAttribute("id", idAttr);
      if (viewBoxAttr) {
        $symbol.setAttribute("viewBox", viewBoxAttr);
      }
      if (preserveAspectRatioAttr) {
        $symbol.setAttribute("preserveAspectRatio", preserveAspectRatioAttr);
      }

      const attrs = $svg.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;
        if (attrName.match(/xmlns:.+/)) {
          const storedNs = namespaces[attrName];
          const attrNs = attrs[i].value;

          if (storedNs !== undefined) {
            if (storedNs !== attrNs) {
              gulplog.info(
                attrName +
                  " namespace appeared multiple times with different value." +
                  ' Keeping the first one : "' +
                  storedNs +
                  '".\nEach namespace must be unique across files.'
              );
            }
          } else {
            for (const nsName in namespaces) {
              if (namespaces[nsName] === attrNs) {
                gulplog.info(
                  "Same namespace value under different names : " +
                    nsName +
                    " and " +
                    attrName +
                    ".\nKeeping both."
                );
              }
            }
            namespaces[attrName] = attrNs;
          }
        }
      }

      const $defs = svgDoc.querySelector("svg defs");
      if ($defs) {
        while ($defs.firstChild) {
          $combinedDefs.appendChild($defs.firstChild);
        }
        $defs.remove();
      }

      let $groupWrap = null;
      for (let i = 0; i < $svg.attributes.length; i++) {
        const name = $svg.attributes[i].name;
        const value = $svg.attributes[i].value;
        if (!presentationAttributes.has(name)) continue;
        if (!$groupWrap) $groupWrap = dom.createElement("g");
        $groupWrap.setAttribute(name, value);
      }

      if ($groupWrap) {
        while ($svg.firstChild) {
          $groupWrap.appendChild($svg.firstChild);
        }
        $symbol.appendChild($groupWrap);
      } else {
        while ($svg.firstChild) {
          $symbol.appendChild($svg.firstChild);
        }
      }
      $combinedSvg.appendChild($symbol);
      cb();
    },
    flush(cb) {
      if (isEmpty) return cb();
      if (!$combinedDefs.firstChild) {
        $combinedDefs.remove();
      }
      for (const nsName in namespaces) {
        $combinedSvg.setAttribute(nsName, namespaces[nsName]);
      }
      const svgOutput = dom.documentElement.outerHTML;
      const output = inlineSvg
        ? svgOutput
        : resultSvg.substring(0, resultSvg.indexOf("<svg")) + svgOutput;
      const file = new Vinyl({
        path: fileName,
        contents: Buffer.from(output)
      });
      this.push(file);
      cb();
    }
  });

  return stream;
};
