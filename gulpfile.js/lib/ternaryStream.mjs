import duplexify from "./duplexify.mjs";
import { ForkStream } from "./forkStream.mjs";
import mergeStream from "./mergeStream.mjs";
import { passthrough } from "./stream.mjs";

export default function ternaryStream(condition, trueStream, falseStream) {
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
