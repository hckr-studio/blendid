import { PassThrough } from "node:stream";

export function passthrough() {
  return new PassThrough({ objectMode: true });
}
