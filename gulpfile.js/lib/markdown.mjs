import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import { mangle } from "marked-mangle";
import { processTypo } from "./texy.mjs";

function texyTypography() {
  return {
    hooks: {
      preprocess(markdown) {
        return processTypo(markdown, { locale: "cs" });
      }
    }
  };
}

marked.use(
  texyTypography(),
  gfmHeadingId(),
  markedHighlight({
    langPrefix: "language-",
    highlight(code, lang) {
      return code;
    }
  }),
  mangle()
);

export { marked };
