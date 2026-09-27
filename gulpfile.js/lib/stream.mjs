import { PassThrough, Readable, Writable } from "node:stream";
import duplexify from "./duplexify.mjs";

export function passthrough() {
  return new PassThrough({ objectMode: true });
}

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

export function mergeStream(...streams) {
  return new MergeStream(...streams);
}

export class ForkStream extends Writable {
  constructor(options = {}) {
    super({ ...options, objectMode: true });

    if (options.classifier) {
      this._classifier = options.classifier;
    }

    this.a = new Readable({ ...options, objectMode: true });
    this.b = new Readable({ ...options, objectMode: true });

    let resume = null;

    this.a._read = () => {
      if (resume) {
        const r = resume;
        resume = null;
        r();
      }
    };

    this.b._read = () => {
      if (resume) {
        const r = resume;
        resume = null;
        r();
      }
    };

    this.on("finish", () => {
      this.a.push(null);
      this.b.push(null);
    });
  }

  _classifier(e, done) {
    return done(null, !!e);
  }

  _write(input, encoding, done) {
    this._classifier.call(null, input, (err, res) => {
      if (err) {
        return done(err);
      }

      const out = res ? this.a : this.b;

      if (out.push(input)) {
        return done();
      } else {
        this.resume = done;
      }
    });
  }
}

export function ternaryStream(condition, trueStream, falseStream) {
  if (!trueStream) {
    throw new Error("ternary-stream: child action is required");
  }

  const outStream = passthrough();

  const forkStream = new ForkStream({
    classifier(chunk, cb) {
      return cb(null, Boolean(condition(chunk)));
    }
  });

  // if condition is true, pipe input to trueStream
  forkStream.a.pipe(trueStream);

  var mergedStream;

  if (falseStream) {
    // if there's an 'else' condition
    // if condition is false
    // pipe input to falseStream
    forkStream.b.pipe(falseStream);
    // merge output with trueStream's output
    mergedStream = mergeStream(falseStream, trueStream);
    // redirect falseStream errors to mergedStream
    falseStream.on("error", (err) => {
      mergedStream.emit("error", err);
    });
  } else {
    // if there's no 'else' condition
    // if condition is false
    // merge output with trueStream's output
    mergedStream = mergeStream(forkStream.b, trueStream);
  }

  // redirect trueStream errors to mergedStream
  trueStream.on("error", (err) => {
    mergedStream.emit("error", err);
  });

  // send everything down-stream
  mergedStream.pipe(outStream);
  // redirect mergedStream errors to outStream
  mergedStream.on("error", (err) => {
    outStream.emit("error", err);
  });

  // consumers write in to forkStream, we write out to outStream
  return duplexify.obj(forkStream, outStream);
}
