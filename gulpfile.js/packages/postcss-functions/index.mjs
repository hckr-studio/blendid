import {
  transformAtRule,
  transformDecl,
  transformRule
} from "./lib/transformer.mjs";

export default function functions(opts = {}) {
  const functions = opts.functions ?? {};

  return {
    postcssPlugin: "postcss-functions",
    AtRule(node) {
      return transformAtRule(node, functions);
    },
    Declaration(node) {
      return transformDecl(node, functions);
    },
    Rule(node) {
      return transformRule(node, functions);
    }
  };
}

functions.postcss = true;
