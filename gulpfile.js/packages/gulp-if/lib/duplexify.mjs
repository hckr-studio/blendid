import { Duplex, Readable, Writable } from "node:stream";
import eos from "./end-of-stream.mjs";

const SIGNAL_FLUSH = Buffer.from([0]);

function onuncork(self, fn) {
  if (self._corked) self.once("uncork", fn);
  else fn();
}

function autoDestroy(self, err) {
  if (self._autoDestroy) self.destroy(err);
}

function destroyer(self, end) {
  return (err) => {
    if (err) autoDestroy(self, err.message === "premature close" ? null : err);
    else if (end && !self._ended) self.end();
  };
}

function end(ws, fn) {
  if (!ws) return fn();
  if (ws._writableState?.finished) return fn();
  if (ws._writableState) return ws.end(fn);
  ws.end();
  fn();
}

const noop = () => {};

// Native replacement for stream-shift
const shift = (stream) => stream.read() ?? null;

const toStreams2 = (rs) =>
  new Readable({ objectMode: true, highWaterMark: 16 }).wrap(rs);

/**
 * Turn a writeable and readable stream into a single streams2 duplex stream.
 */
class Duplexify extends Duplex {
  constructor(writable, readable, opts) {
    super(opts);

    this._writable = null;
    this._readable = null;
    this._readable2 = null;

    this._autoDestroy = opts?.autoDestroy !== false ?? true;
    this._forwardDestroy = opts?.destroy !== false ?? true;
    this._forwardEnd = opts?.end !== false ?? true;
    this._corked = 1; // start corked
    this._ondrain = null;
    this._drained = false;
    this._forwarding = false;
    this._unwrite = null;
    this._unread = null;
    this._ended = false;

    this.destroyed = false;
    this._closeEmitted = false;

    if (writable) this.setWritable(writable);
    if (readable) this.setReadable(readable);
  }

  cork() {
    if (++this._corked === 1) this.emit("cork");
  }

  uncork() {
    if (this._corked && --this._corked === 0) this.emit("uncork");
  }

  setWritable(writable) {
    this._unwrite?.();

    if (this.destroyed) {
      writable?.destroy?.();
      return;
    }

    if (writable === null || writable === false) {
      this.end();
      return;
    }
    const unend = writable
      ? eos(
          writable,
          { writable: true, readable: false },
          destroyer(this, this._forwardEnd && !this._writable)
        )
      : noop;

    const ondrain = () => {
      const ondrain = this._ondrain;
      this._ondrain = null;
      if (ondrain) ondrain();
    };

    const onclose = () => {
      if (!this._closeEmitted) {
        this._closeEmitted = true;
        this.emit("close");
      }
    };

    const clear = () => {
      this._writable?.removeListener("drain", ondrain);
      this._writable?.removeListener("close", onclose);
      unend();
    };

    if (this._unwrite) process.nextTick(ondrain); // force a drain on stream reset to avoid livelocks

    this._writable = writable;
    this._writable.on("drain", ondrain);
    this._writable.on("close", onclose);
    this._unwrite = clear;

    this.uncork(); // always uncork setWritable
  }

  setReadable(readable) {
    this._unread?.();

    if (this.destroyed) {
      readable?.destroy?.();
      return;
    }

    if (readable === null || readable === false) {
      this.push(null);
      this.resume();
      return;
    }
    const unend = readable
      ? eos(
          readable,
          { writable: false, readable: true },
          this._forwardEnd && !this._readable ? destroyer(this) : noop
        )
      : noop;

    const onreadable = () => {
      this._forward();
    };

    const onend = () => {
      this.push(null);
    };

    const onclose = () => {
      if (!this._closeEmitted) {
        this._closeEmitted = true;
        this.emit("close");
      }
    };

    const clear = () => {
      this._readable2?.removeListener("readable", onreadable);
      this._readable2?.removeListener("end", onend);
      this._readable?.removeListener("close", onclose);
      unend();
    };

    this._drained = true;
    this._readable = readable;
    this._readable2 = readable?._readableState
      ? readable
      : toStreams2(readable);
    this._readable2?.on("readable", onreadable);
    this._readable2?.on("end", onend);
    this._readable?.on("close", onclose);
    this._unread = clear;

    this._forward();
  }

  _read() {
    this._drained = true;
    this._forward();
  }

  _forward() {
    if (this._forwarding || !this._readable2 || !this._drained) return;
    this._forwarding = true;

    let data;

    while (this._drained && (data = shift(this._readable2)) !== null) {
      if (this.destroyed) continue;
      this._drained = this.push(data);
    }

    this._forwarding = false;
  }

  destroy(err, cb) {
    cb ??= noop;
    if (this.destroyed) return cb(null);
    this.destroyed = true;
    this._closeEmitted = true;
    process.nextTick(() => {
      this._destroy(err);
      cb(null);
    });
  }

  _destroy(err) {
    if (err) {
      this.emit("error", err);
    }

    if (this._forwardDestroy) {
      this._readable?.destroy?.();
      this._writable?.destroy?.();
    }

    this.emit("close");
  }

  _write(data, enc, cb) {
    if (this.destroyed) return;
    if (this._corked)
      return onuncork(this, this._write.bind(this, data, enc, cb));
    if (data === SIGNAL_FLUSH) return this._finish(cb);
    if (!this._writable) return cb();

    if (this._writable.write(data) === false) this._ondrain = cb;
    else if (!this.destroyed) cb();
  }

  _finish(cb) {
    this.emit("preend");
    onuncork(this, () => {
      end(this._forwardEnd && this._writable, () => {
        // haxx to not emit prefinish twice
        if (this._writableState?.prefinished === false)
          this._writableState.prefinished = true;
        this.emit("prefinish");
        onuncork(this, cb);
      });
    });
  }

  end(data, enc, cb) {
    if (typeof data === "function") return this.end(null, null, data);
    if (typeof enc === "function") return this.end(data, null, enc);
    this._ended = true;
    if (data) this.write(data);
    if (!this._writableState?.ending && !this._writableState?.destroyed)
      this.write(SIGNAL_FLUSH);
    return Writable.prototype.end.call(this, cb);
  }
}

/**
 * Factory function to allow calling without 'new' for backward compatibility
 * @param {Writable} writable
 * @param {Readable} readable
 * @param [opts]
 * @returns {Duplexify}
 */
function duplexify(writable, readable, opts) {
  return new Duplexify(writable, readable, opts);
}

/**
 *
 * @param {Writable} writable
 * @param {Readable} readable
 * @param [opts]
 * @returns {Duplexify}
 */
duplexify.obj = function obj(writable, readable, opts) {
  const options = Object.assign({}, opts, {
    objectMode: true,
    highWaterMark: 16
  });
  return new Duplexify(writable, readable, options);
};

export default duplexify;
