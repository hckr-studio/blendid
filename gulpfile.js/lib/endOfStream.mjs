import once from "once";

const noop = () => {};

const qnt = globalThis.Bare ? queueMicrotask : process.nextTick.bind(process);

const isRequest = (stream) =>
  stream.setHeader && typeof stream.abort === "function";

const isChildProcess = (stream) =>
  stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3;

const eos = (stream, opts, callback) => {
  if (typeof opts === "function") return eos(stream, null, opts);
  if (!opts) opts = {};

  callback = once(callback || noop);

  const ws = stream._writableState;
  const rs = stream._readableState;
  let readable = opts.readable || (opts.readable !== false && stream.readable);
  let writable = opts.writable || (opts.writable !== false && stream.writable);
  let cancelled = false;

  const onlegacyfinish = () => {
    if (!stream.writable) onfinish();
  };

  const onfinish = () => {
    writable = false;
    if (!readable) callback.call(stream);
  };

  const onend = () => {
    readable = false;
    if (!writable) callback.call(stream);
  };

  const onexit = (exitCode) => {
    callback.call(
      stream,
      exitCode ? new Error("exited with error code: " + exitCode) : null
    );
  };

  const onerror = (err) => {
    callback.call(stream, err);
  };

  const onclose = () => {
    qnt(onclosenexttick);
  };

  const onclosenexttick = () => {
    if (cancelled) return;
    if (readable && !(rs && rs.ended && !rs.destroyed))
      return callback.call(stream, new Error("premature close"));
    if (writable && !(ws && ws.ended && !ws.destroyed))
      return callback.call(stream, new Error("premature close"));
  };

  const onrequest = () => {
    stream.req.on("finish", onfinish);
  };

  if (isRequest(stream)) {
    stream.on("complete", onfinish);
    stream.on("abort", onclose);
    if (stream.req) onrequest();
    else stream.on("request", onrequest);
  } else if (writable && !ws) {
    // legacy streams
    stream.on("end", onlegacyfinish);
    stream.on("close", onlegacyfinish);
  }

  if (isChildProcess(stream)) stream.on("exit", onexit);

  stream.on("end", onend);
  stream.on("finish", onfinish);
  if (opts.error !== false) stream.on("error", onerror);
  stream.on("close", onclose);

  return () => {
    cancelled = true;
    stream.removeListener("complete", onfinish);
    stream.removeListener("abort", onclose);
    stream.removeListener("request", onrequest);
    if (stream.req) stream.req.removeListener("finish", onfinish);
    stream.removeListener("end", onlegacyfinish);
    stream.removeListener("close", onlegacyfinish);
    stream.removeListener("finish", onfinish);
    stream.removeListener("exit", onexit);
    stream.removeListener("end", onend);
    stream.removeListener("error", onerror);
    stream.removeListener("close", onclose);
  };
};

export default eos;
