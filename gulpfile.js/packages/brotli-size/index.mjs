import { brotliCompressSync, constants as brotliConstants } from "node:zlib";

// Support a subset of the possible encoding options.
const bufferFormatter = (incoming) =>
  typeof incoming === "string" ? Buffer.from(incoming, "utf8") : incoming;

const optionFormatter = (passed, toEncode) => ({
  params: {
    [brotliConstants.BROTLI_PARAM_MODE]:
      passed?.mode ?? brotliConstants.BROTLI_DEFAULT_MODE,
    [brotliConstants.BROTLI_PARAM_QUALITY]:
      passed?.quality ?? brotliConstants.BROTLI_MAX_QUALITY,
    [brotliConstants.BROTLI_PARAM_SIZE_HINT]: toEncode?.byteLength ?? 0
  }
});

/**
 * @param {Buffer|string} incoming - Either a Buffer or string of the value to encode.
 * @param {object} [options] - Subset of Encoding Parameters.
 * @returns {number} Length of encoded Buffer.
 */
export function brotliSizeSync(incoming, options) {
  const buffer = bufferFormatter(incoming);
  return brotliCompressSync(buffer, optionFormatter(options, buffer))
    .byteLength;
}
