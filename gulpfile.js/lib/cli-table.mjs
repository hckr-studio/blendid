import { styleText } from "node:util";
import { cloneDeep, mergeWith } from "./object.mjs";

// Style options for consistent color output regardless of stream type
const styleOptions = { validateStream: false };

// Default options
const defaultOptions = {
  chars: {
    top: "─",
    "top-mid": "┬",
    "top-left": "┌",
    "top-right": "┐",
    bottom: "─",
    "bottom-mid": "┴",
    "bottom-left": "└",
    "bottom-right": "┘",
    left: "│",
    "left-mid": "├",
    mid: "─",
    "mid-mid": "┼",
    right: "│",
    "right-mid": "┤",
    middle: "│"
  },
  truncate: "…",
  colWidths: [],
  colAligns: [],
  style: {
    "padding-left": 1,
    "padding-right": 1,
    head: ["red"],
    border: ["grey"],
    compact: false
  },
  head: []
};

function strlen(str) {
  const code = /\u001b\[(?:\d*;){0,5}\d*m/g;
  const stripped = `${str}`.replace(code, "");
  const split = stripped.split("\n");
  return split.reduce((memo, s) => (s.length > memo ? s.length : memo), 0);
}

/**
 * Table class
 *
 * @param {Object} options
 * @api public
 */
export class Table extends Array {
  constructor(options) {
    super();
    this.options = mergeWith(
      cloneDeep(defaultOptions),
      options ?? {},
      () => {}
    );

    for (const row of options?.rows ?? []) {
      this.push(row);
    }
  }

  /**
   * Width getter
   *
   * @return {Number} width
   * @api public
   */
  get width() {
    const str = this.toString().split("\n");
    if (str.length) return str[0].length;
    return 0;
  }

  /**
   * Render to a string.
   *
   * @return {String} table representation
   * @api public
   */
  toString() {
    const lines = [];
    const options = this.options;
    const { style, head, chars, truncate: truncater } = options;
    const colWidths = options.colWidths ?? new Array(this.head.length);

    if (!head.length && !this.length) return "";

    if (!colWidths.length) {
      let allRows = this.slice(0);
      if (head.length) {
        allRows = allRows.concat([head]);
      }

      for (const cells of allRows) {
        // horizontal (arrays)
        if (typeof cells === "object" && cells.length) {
          extractColumnWidths(cells);

          // vertical (objects)
        } else {
          const headerCell = Object.keys(cells)?.[0];
          const valueCell = cells[headerCell];

          colWidths[0] = Math.max(colWidths[0] ?? 0, getWidth(headerCell) ?? 0);

          // cross (objects w/ array values)
          if (typeof valueCell === "object" && valueCell?.length) {
            extractColumnWidths(valueCell, 1);
          } else {
            colWidths[1] = Math.max(
              colWidths[1] ?? 0,
              getWidth(valueCell) ?? 0
            );
          }
        }
      }
    }

    const totalWidth =
      (colWidths.length === 1
        ? colWidths[0]
        : colWidths.reduce((a, b) => a + b)) +
      colWidths.length +
      1;

    function extractColumnWidths(arr, offset) {
      offset ??= 0;
      for (let i = 0; i < arr.length; i++) {
        colWidths[i + offset] = Math.max(
          colWidths[i + offset] ?? 0,
          getWidth(arr[i]) ?? 0
        );
      }
    }

    function getWidth(obj) {
      return typeof obj === "object" && obj?.width !== undefined
        ? obj.width
        : (typeof obj === "object" ? strlen(obj?.text) : strlen(obj)) +
            (style["padding-left"] ?? 0) +
            (style["padding-right"] ?? 0);
    }

    // draws a line
    function line(line, left, right, intersection) {
      let width = 0;
      var line_ = left + line.repeat(totalWidth - 2) + right;

      for (let i = 0; i < colWidths.length - 1; i++) {
        width += colWidths[i] + 1;
        line_ = line_.slice(0, width) + intersection + line_.slice(width + 1);
      }

      return applyStyles(options.style.border, line_);
    }

    // draws the top line
    function lineTop() {
      const l = line(
        chars.top,
        chars["top-left"] ?? chars.top,
        chars["top-right"] ?? chars.top,
        chars["top-mid"]
      );
      if (l) lines.push(l);
    }

    function generateRow(items, style) {
      let firstCellHead;
      const cells = [];
      let maxHeight = 0;

      // prepare vertical and cross table data
      if (!Array.isArray(items) && typeof items === "object") {
        const key = Object.keys(items)?.[0];
        const value = items[key];
        firstCellHead = true;

        if (Array.isArray(value)) {
          items = value;
          items.unshift(key);
        } else {
          items = [key, value];
        }
      }

      // transform array of item strings into structure of cells
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const contents = item
          .toString()
          .split("\n")
          .map((l) => string(l, i));

        const height = contents.length;
        if (height > maxHeight) {
          maxHeight = height;
        }

        cells.push({ contents, height });
      }

      // transform vertical cells into horizontal lines
      const lines = new Array(maxHeight);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        for (let j = 0; j < cell.contents.length; j++) {
          const line = cell.contents[j];
          if (!lines[j]) {
            lines[j] = [];
          }
          if (
            style ||
            (firstCellHead && i === 0 && options.style.head?.length)
          ) {
            lines[j].push(applyStyles(options.style.head, line));
          } else {
            lines[j].push(line);
          }
        }

        // populate empty lines in cell
        for (let j = cell.height; j < maxHeight; j++) {
          if (!lines[j]) {
            lines[j] = [];
          }
          lines[j].push(string("", i));
        }
      }
      let ret = "";
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (ret.length > 0) {
          ret += `\n${applyStyles(options.style.border, chars.left)}`;
        }

        ret +=
          line.join(applyStyles(options.style.border, chars.middle)) +
          applyStyles(options.style.border, chars.right);
      }

      return applyStyles(options.style.border, chars.left) + ret;
    }

    function applyStyles(styles, subject) {
      if (!subject) return "";
      if (styles && styles.length > 0) {
        subject = styleText(styles, subject, styleOptions);
      }
      return subject;
    }

    // renders a string, by padding it or truncating it
    function string(str, index) {
      const str_ = String(
        typeof str === "object" && str?.text ? str.text : str
      );
      const length = strlen(str_);
      const width =
        colWidths[index] -
        (style["padding-left"] ?? 0) -
        (style["padding-right"] ?? 0);
      const align = options.colAligns[index] ?? "left";

      const targetLength = width + (str_.length - length);
      const alignDir =
        align === "left" ? "right" : align === "middle" ? "both" : "left";

      let paddedStr;
      if (length === width) {
        paddedStr = str_;
      } else if (length < width) {
        if (alignDir === "left") {
          paddedStr = str_.padStart(targetLength, " ");
        } else if (alignDir === "right") {
          paddedStr = str_.padEnd(targetLength, " ");
        } else {
          // 'both' - center padding
          const totalPadding = targetLength - str_.length;
          const leftPad = Math.ceil(totalPadding / 2);
          const rightPad = totalPadding - leftPad;
          paddedStr = " ".repeat(leftPad) + str_ + " ".repeat(rightPad);
        }
      } else {
        paddedStr = truncater
          ? str_.length >= width
            ? str_.slice(0, width - truncater.length) + truncater
            : str_
          : str_;
      }

      return (
        " ".repeat(style["padding-left"] ?? 0) +
        paddedStr +
        " ".repeat(style["padding-right"] ?? 0)
      );
    }

    if (head.length) {
      lineTop();
      lines.push(
        ...(generateRow(head, style.head) + "\n")
          .split("\n")
          .filter((l) => l !== "")
      );
    }

    if (this.length)
      for (let i = 0; i < this.length; i++) {
        const cells = this[i];
        if (!head.length && i === 0) lineTop();
        else {
          if (
            !style.compact || i < !!head.length ? 1 : 0 || cells.length === 0
          ) {
            const l = line(
              chars.mid,
              chars["left-mid"] ?? chars.mid,
              chars["right-mid"] ?? chars.mid,
              chars["mid-mid"] ?? chars.mid
            );
            if (l) lines.push(l);
          }
        }

        if (Object.hasOwn(cells, "length") && !cells.length) {
          continue;
        }

        lines.push(
          ...`${generateRow(cells)}\n`.split("\n").filter((l) => l !== "")
        );
      }

    const l = line(
      chars.bottom,
      chars["bottom-left"] ?? chars.bottom,
      chars["bottom-right"] ?? chars.bottom,
      chars["bottom-mid"]
    );
    if (l) lines.push(l);
    else if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

    return lines.join("\n");
  }

  /**
   * Alias for toString
   */
  render() {
    return this.toString();
  }
}
