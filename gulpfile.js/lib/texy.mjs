import { processTypo } from "@gryphoon/texy";

export { processTypo };

/** @typedef {import("marked").MarkedExtension} MarkedExtension **/

/**
 * Marked rendering extension to apply
 * @param {String} locale
 * @returns {MarkedExtension}
 */
export function texyTypography(locale) {
  return {
    renderer: {
      text(token) {
        if (token.tokens) {
          return this.parser.parseInline(token.tokens);
        }
        return processTypo(token.text, { locale });
      }
    }
  };
}
