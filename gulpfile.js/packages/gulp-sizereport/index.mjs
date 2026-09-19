import { Transform } from "node:stream";
import { styleText } from "node:util";
import Table from "cli-table";
import { gzipSizeSync } from "gzip-size";
import PluginError from "plugin-error";
import prettyBytes from "pretty-bytes";
import { sync as zstdSizeSync } from "zstd-size";
import { brotliSizeSync } from "#brotli-size/index.mjs";

const COMPRESSION_TYPES = [
  {
    key: "gzip",
    label: "Gzipped",
    sizeSync: gzipSizeSync,
    defaultOptions: { level: 6 }
  },
  {
    key: "brotli",
    label: "Brotli",
    sizeSync: brotliSizeSync,
    defaultOptions: { quality: 6 }
  },
  {
    key: "zstd",
    label: "Zstd",
    sizeSync: zstdSizeSync,
    defaultOptions: { level: 3 }
  }
];

const DEFAULT_OPTIONS = {
  gzip: false,
  brotli: false,
  zstd: false,
  minifier: null,
  total: true,
  fail: false
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMaxKey(type, prefix = "", suffix = "Size") {
  const config = COMPRESSION_TYPES.find((c) => c.key === type);
  const label = config ? config.label : capitalize(type);
  return `max${prefix}${label}${suffix}`;
}

class SizeReportTransform extends Transform {
  constructor(options) {
    super({ objectMode: true });

    // Normalize options and extract compression parameters
    this.opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
    this.compressionOptions = {};

    for (const { key, defaultOptions } of COMPRESSION_TYPES) {
      const userOpt = options?.[key];

      // Determine if compression is enabled
      if (typeof userOpt === "object" && userOpt !== null) {
        // Object form: { level: 9 } or { quality: 11, mode: 'text' }
        this.opts[key] = true;
        this.compressionOptions[key] = { ...defaultOptions, ...userOpt };
      } else if (userOpt === true) {
        // Boolean true: use defaults
        this.compressionOptions[key] = defaultOptions;
      } else {
        // false, undefined, or null: disabled
        this.compressionOptions[key] = null;
      }
    }

    this.totals = {
      original: 0,
      compressed: {},
      minified: 0,
      minifiedCompressed: {}
    };

    for (const { key } of COMPRESSION_TYPES) {
      this.totals.compressed[key] = 0;
      this.totals.minifiedCompressed[key] = 0;
    }

    this.fileCount = 0;
    this.fail = false;

    this.tableHeadCols = this.buildTableHeaders();

    this.table = new Table({
      head: this.tableHeadCols,
      colAligns: ["left", ...Array(this.tableHeadCols.length - 1).fill("right")]
    });
  }

  buildTableHeaders() {
    const cols = ["File", "Original"];

    for (const { key, label } of COMPRESSION_TYPES) {
      if (this.opts[key]) {
        cols.push(label);
      }
    }

    if (this.opts.minifier) {
      cols.push("Minified");
      for (const { key, label } of COMPRESSION_TYPES) {
        if (this.opts[key]) {
          cols.push(label);
        }
      }
    }

    return cols;
  }

  getSizeToDisplay(size, key, filename) {
    const max = this.opts[filename] || this.opts["*"];
    let value;

    if (max) {
      value = max[key];
    } else {
      value = this.opts[key];
    }

    if (value && size > value) {
      this.fail = true;
      return styleText("red", prettyBytes(size));
    }

    return prettyBytes(size);
  }

  buildTotalRow() {
    const row = [
      "",
      styleText(
        "bold",
        this.getSizeToDisplay(this.totals.original, "maxTotalSize", "*")
      )
    ];

    for (const { key } of COMPRESSION_TYPES) {
      if (this.opts[key]) {
        row.push(
          styleText(
            "bold",
            this.getSizeToDisplay(
              this.totals.compressed[key],
              getMaxKey(key, "Total"),
              "*"
            )
          )
        );
      }
    }

    if (this.opts.minifier) {
      row.push(
        styleText(
          "bold",
          this.getSizeToDisplay(
            this.totals.minified,
            "maxTotalMinifiedSize",
            "*"
          )
        )
      );

      for (const { key } of COMPRESSION_TYPES) {
        if (this.opts[key]) {
          row.push(
            styleText(
              "bold",
              this.getSizeToDisplay(
                this.totals.minifiedCompressed[key],
                getMaxKey(key, "TotalMinified"),
                "*"
              )
            )
          );
        }
      }
    }

    return row;
  }

  _transform(file, enc, callback) {
    if (file.isNull()) {
      callback(null, file);
      return;
    }

    if (file.isStream()) {
      callback(new PluginError("gulp-sizereport", "Streaming not supported"));
      return;
    }

    const originalSize = file.contents.length;
    this.totals.original += originalSize;
    this.fileCount++;

    const row = [
      file.relative,
      this.getSizeToDisplay(originalSize, "maxSize", file.relative)
    ];

    for (const { key, sizeSync } of COMPRESSION_TYPES) {
      if (this.opts[key]) {
        const opts = this.compressionOptions[key];
        const compressedSize = opts
          ? sizeSync(file.contents, opts)
          : sizeSync(file.contents);
        this.totals.compressed[key] += compressedSize;
        row.push(
          this.getSizeToDisplay(compressedSize, getMaxKey(key), file.relative)
        );
      }
    }

    if (typeof this.opts.minifier === "function") {
      const minified = this.opts.minifier(String(file.contents), file.relative);
      const minifiedSize = minified.length;
      this.totals.minified += minifiedSize;

      row.push(
        this.getSizeToDisplay(minifiedSize, "maxMinifiedSize", file.relative)
      );

      for (const { key, sizeSync } of COMPRESSION_TYPES) {
        if (this.opts[key]) {
          const opts = this.compressionOptions[key];
          const compressedSize = opts
            ? sizeSync(minified, opts)
            : sizeSync(minified);
          this.totals.minifiedCompressed[key] += compressedSize;
          row.push(
            this.getSizeToDisplay(
              compressedSize,
              getMaxKey(key, "Minified"),
              file.relative
            )
          );
        }
      }
    }

    this.table.push(row);
    callback(null, file);
  }

  _flush(callback) {
    if (this.opts.title) {
      console.log(`:: ${styleText("bold", this.opts.title)} ::`);
    }

    if (this.fileCount > 0) {
      if (this.opts.total === true) {
        this.table.push(this.buildTotalRow());
      }

      console.log(this.table.toString());

      if (this.opts.fail && this.fail) {
        callback(
          new PluginError(
            "gulp-sizereport",
            "One or more file(s) exceeded the maximum size defined in options."
          )
        );
        return;
      }
    }

    callback();
  }
}

function plugin(options) {
  return new SizeReportTransform(options);
}

export default plugin;
