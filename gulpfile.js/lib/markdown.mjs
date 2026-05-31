import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import { mangle } from "marked-mangle";

marked.use(
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
