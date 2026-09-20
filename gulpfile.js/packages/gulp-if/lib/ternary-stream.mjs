import { Duplex, PassThrough } from "node:stream";
import { ForkStream } from "./fork-stream.mjs";

function duplexify(writable, readable, opts = {}) {
  const duplex = new Duplex({ ...opts, objectMode: true });

  // Pipe writable to readable through duplex
  writable.on("error", (err) => duplex.emit("error", err));
  readable.on("error", (err) => duplex.emit("error", err));

  // Write to writable
  duplex._write = (chunk, encoding, callback) => {
    writable.write(chunk, encoding, callback);
  };

  // End the writable
  duplex._final = (callback) => {
    writable.end(callback);
  };

  // Read from readable
  duplex._read = () => {
    readable.on("data", (chunk) => {
      if (!duplex.push(chunk)) {
        readable.pause();
        duplex.once("drain", () => readable.resume());
      }
    });
    readable.on("end", () => {
      duplex.push(null);
    });
    readable.resume();
  };

  return duplex;
}

duplexify.obj = (writable, readable, opts) =>
  duplexify(writable, readable, { ...opts, objectMode: true });

function mergeStream(...streams) {
  const merged = new PassThrough({ objectMode: true });
  merged.setMaxListeners(0);

  for (const stream of streams) {
    stream.on("error", (err) => merged.emit("error", err));
    stream.pipe(merged, { end: false });
    stream.once("end", () => {
      // Check if all source streams have ended
      const allEnded = streams.every((s) => s._readableState?.ended);
      if (allEnded && merged.readable) {
        merged.end();
      }
    });
  }

  return merged;
}

export default function ternaryStream(condition, trueStream, falseStream) {
  if (!trueStream) {
    throw new Error("fork-stream: child action is required");
  }

  // output stream
  const outStream = new PassThrough({ objectMode: true });

  // create fork-stream
  const forkStream = new ForkStream({
    classifier: (e, cb) => {
      const ans = !!condition(e);
      return cb(null, ans);
    }
  });

  // if condition is true, pipe input to trueStream
  forkStream.a.pipe(trueStream);

  let mergedStream;

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
