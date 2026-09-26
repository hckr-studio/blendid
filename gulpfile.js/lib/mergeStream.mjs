import { PassThrough } from "node:stream";

class MergeStream extends PassThrough {
  /**
   * @param {...import("node:stream").Readable} streams - Streams to merge
   */
  constructor(...streams) {
    super({ objectMode: true });
    this.setMaxListeners(0);
    this.sources = new Set();

    this.on("unpipe", (source) => this.remove(source));
    for (const source of streams) {
      this.add(source);
    }
  }

  /**
   * Add a stream or array of streams to merge
   * @param {import("node:stream").Readable|Array<import("node:stream").Readable>} source
   * @returns {this}
   */
  add(source) {
    if (source == null) {
      return this;
    }
    if (Array.isArray(source)) {
      for (const s of source) {
        this.add(s);
      }
      return this;
    }
    this.sources.add(source);
    source.once("end", () => this.remove(source));
    source.once("error", (err) => this.emit("error", err));
    source.pipe(this, { end: false });
    return this;
  }

  /**
   * Check if no streams are currently being merged
   * @returns {boolean}
   */
  isEmpty() {
    return this.sources.size === 0;
  }

  /**
   * Remove a source stream
   * @param {import("node:stream").Readable} source
   */
  remove(source) {
    this.sources.delete(source);
    if (this.sources.size === 0 && this.readable) {
      this.end();
    }
  }
}

/**
 * Creates a stream that merges multiple streams into one.
 * @param {...import("node:stream").Readable} streams - Streams to merge
 * @returns {MergeStream} The merged stream with add() and isEmpty() methods
 */
export default function mergeStream(...streams) {
  return new MergeStream(...streams);
}
