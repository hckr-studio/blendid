import { equal } from "node:assert";
import { describe, it } from "node:test";
import parse from "./parse.mjs";
import stringify from "./stringify.mjs";

describe("Stringify", () => {

  it("Should correctly add quotes", () => {
    equal(stringify(parse("bold italic 12px/3 'Open Sans', Arial, \\\"Helvetica Neue\\\", sans-serif")), "bold italic 12px/3 'Open Sans', Arial, \\\"Helvetica Neue\\\", sans-serif");
  });

  it("Should not close unclosed strings", () => {
    equal(stringify(parse("\\\" 12,  54, 65 ")), "\\\" 12,  54, 65 ");
  });

  it("Should correctly add brackets", () => {
    equal(stringify(parse(" rgba( 12,  54, 65) ")), " rgba( 12,  54, 65) ");
  });

  it("Should not close unclosed functions", () => {
    equal(stringify(parse(" rgba( 12,  54, 65 ")), " rgba( 12,  54, 65 ");
  });

  it("Should correctly process advanced gradients", () => {
    equal(stringify(parse("background-image:linear-gradient(45deg,transparent 25%,hsla(0,0%,100%,.2) 25%,hsla(0,0%,100%,.2) 75%,transparent 75%,transparent 25%,hsla(0,0%,100%,.2) 75%,transparent 75%,transparent),linear-gradient(45deg,transparent 25%,hsla(0,0%,100%,.2))")), "background-image:linear-gradient(45deg,transparent 25%,hsla(0,0%,100%,.2) 25%,hsla(0,0%,100%,.2) 75%,transparent 75%,transparent 25%,hsla(0,0%,100%,.2) 75%,transparent 75%,transparent),linear-gradient(45deg,transparent 25%,hsla(0,0%,100%,.2))");
  });

  it("Should correctly add comments", () => {
    equal(stringify(parse("/!*comment*!/ 1px /!* unclosed ")), "/!*comment*!/ 1px /!* unclosed ");
  });

  it("Should correctly process comments inside functions", () => {
    equal(stringify(parse("/!*before*!/ rgb( /!*red component*!/ 12,  54 /!*green component*!/, /!* blue *!/ 65)/!* after *!/ ")), "/!*before*!/ rgb( /!*red component*!/ 12,  54 /!*green component*!/, /!* blue *!/ 65)/!* after *!/ ");
  });

  it("Should correctly process empty url", () => {
    equal(stringify(parse("url()")), "url()");
  });

  it("Should correctly process empty url with space", () => {
    equal(stringify(parse("url( )")), "url( )");
  });

  it("Should correctly process empty url with spaces", () => {
    equal(stringify(parse("url(   )")), "url(   )");
  });

  it("Should correctly process empty url with tab", () => {
    equal(stringify(parse("url(\t)")), "url(\t)");
  });

  it("Should correctly process empty url with newline (LF)", () => {
    equal(stringify(parse("url(\n)")), "url(\n)");
  });

  it("Should correctly process empty url with multiple newlines (LF)", () => {
    equal(stringify(parse("url(\n\n\n)")), "url(\n\n\n)");
  });

  it("Should correctly process empty url with newline (CRLF)", () => {
    equal(stringify(parse("url(\r\n)")), "url(\r\n)");
  });

  it("Should correctly process empty url with multiple newlines (CRLF)", () => {
    equal(stringify(parse("url(\r\n\r\n\r\n)")), "url(\r\n\r\n\r\n)");
  });

  it("Should correctly process empty url with mixed whitespace characters", () => {
    equal(stringify(parse("url(  \n \t  \n  )")), "url(  \n \t  \n  )");
  });

  it("Should correctly process unicode-range (single codepoint)", () => {
    equal(stringify(parse("U+26")), "U+26");
  });

  it("Should correctly process unicode-range (codepoint range)", () => {
    equal(stringify(parse("U+0025-00FF")), "U+0025-00FF");
  });

  it("Should correctly process unicode-range (wildcard range)", () => {
    equal(stringify(parse("U+4??")), "U+4??");
  });

  it("Should correctly process unicode-range (multiple values)", () => {
    equal(stringify(parse("U+0025-00FF, U+4??")), "U+0025-00FF, U+4??");
  });

  const tokens = parse(" rgba(12,  54, 65 ) ");

  it("Should apply custom stringifier to function nodes with full tokens", () => {
    equal(
      stringify(tokens, (node) => {
        if (node.type === "function") {
          return (
            node.value +
            "[" +
            [
              node.nodes[0].value,
              node.nodes[2].value,
              node.nodes[4].value
            ].join(",") +
            "]"
          );
        }
      }),
      " rgba[12,54,65] "
    );
  });

  it("Should apply custom stringifier to single function node", () => {
    equal(
      stringify(tokens[1], (node) => {
        if (node.type === "function") {
          return (
            node.value +
            "[" +
            [
              node.nodes[0].value,
              node.nodes[2].value,
              node.nodes[4].value
            ].join(",") +
            "]"
          );
        }
      }),
      "rgba[12,54,65]"
    );
  });

  it("Shouldn't process nodes of word type", () => {
    tokens[1].type = "word";
    equal(stringify(tokens), " rgba ", "Shouldn't process nodes of word type");
  });

  it("Should apply custom stringifier to replace var() function calls", () => {
    equal(
      stringify(parse("calc(1px + var(--bar))"), (node) => {
        if (node.type === "function" && node.value === "var") {
          return "10px";
        }
      }),
      "calc(1px + 10px)"
    );
  });
});
