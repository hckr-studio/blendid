import { deepEqual } from "node:assert";
import { describe, it } from "node:test";
import parse from "./parse.mjs";

describe("Parse", () => {
  it("should correctly process empty input", () => {
    deepEqual(parse(""), []);
  });

  it("should process escaped parentheses (open)", () => {
    deepEqual(parse("\\("), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "\\("
      }
    ]);
  });

  it("should process escaped parentheses (close)", () => {
    deepEqual(parse("\\)"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "\\)"
      }
    ]);
  });

  it("should process escaped parentheses (both)", () => {
    deepEqual(parse("\\(\\)"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 4,
        value: "\\(\\)"
      }
    ]);
  });

  it("should process escaped parentheses (both)", () => {
    deepEqual(parse("\\( \\)"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "\\("
      },
      {
        type: "space",
        sourceIndex: 2,
        sourceEndIndex: 3,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 3,
        sourceEndIndex: 5,
        value: "\\)"
      }
    ]);
  });

  it("should process unopened parentheses as word", () => {
    deepEqual(parse("() )wo)rd)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "",
        before: "",
        after: "",
        nodes: []
      },
      {
        type: "space",
        sourceIndex: 2,
        sourceEndIndex: 3,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 3,
        sourceEndIndex: 10,
        value: ")wo)rd)"
      }
    ]);
  });

  it("should add before prop", () => {
    deepEqual(parse("( )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 3,
        value: "",
        before: " ",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should add before and after prop", () => {
    deepEqual(parse("( | )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 2,
            sourceEndIndex: 3,
            value: "|"
          }
        ]
      }
    ]);
  });

  it("should add value prop", () => {
    deepEqual(parse("name()"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "name",
        before: "",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should process nested functions", () => {
    deepEqual(parse("((()))"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "",
        before: "",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 1,
            sourceEndIndex: 5,
            value: "",
            before: "",
            after: "",
            nodes: [
              {
                type: "function",
                sourceIndex: 2,
                sourceEndIndex: 4,
                value: "",
                before: "",
                after: "",
                nodes: []
              }
            ]
          }
        ]
      }
    ]);
  });

  it("should process advanced nested functions", () => {
    deepEqual(parse("( calc(( ) ))word"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 13,
        value: "",
        before: " ",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 2,
            sourceEndIndex: 12,
            value: "calc",
            before: "",
            after: " ",
            nodes: [
              {
                type: "function",
                sourceIndex: 7,
                sourceEndIndex: 10,
                value: "",
                before: " ",
                after: "",
                nodes: []
              }
            ]
          }
        ]
      },
      {
        type: "word",
        sourceIndex: 13,
        sourceEndIndex: 17,
        value: "word"
      }
    ]);
  });

  it("should process divider (/)", () => {
    deepEqual(parse("/"), [
      {
        type: "div",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: "/",
        before: "",
        after: ""
      }
    ]);
  });

  it("should process divider (:)", () => {
    deepEqual(parse(":"), [
      {
        type: "div",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: ":",
        before: "",
        after: ""
      }
    ]);
  });

  it("should process divider (,)", () => {
    deepEqual(parse(","), [
      {
        type: "div",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: ",",
        before: "",
        after: ""
      }
    ]);
  });

  it("should process complex divider", () => {
    deepEqual(parse(" , "), [
      {
        type: "div",
        sourceIndex: 0,
        sourceEndIndex: 3,
        value: ",",
        before: " ",
        after: " "
      }
    ]);
  });

  it("should process divider in function", () => {
    deepEqual(parse("( , )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "div",
            sourceIndex: 2,
            sourceEndIndex: 3,
            value: ",",
            before: "",
            after: ""
          }
        ]
      }
    ]);
  });

  it("should process two spaced divider", () => {
    deepEqual(parse(" , : "), [
      {
        type: "div",
        sourceIndex: 0,
        sourceEndIndex: 3,
        value: ",",
        before: " ",
        after: " "
      },
      {
        type: "div",
        sourceIndex: 3,
        sourceEndIndex: 5,
        value: ":",
        before: "",
        after: " "
      }
    ]);
  });

  it('should process empty quoted strings (")', () => {
    deepEqual(parse('""'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "",
        quote: '"'
      }
    ]);
  });

  it("should process empty quoted strings (')", () => {
    deepEqual(parse("''"), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "",
        quote: "'"
      }
    ]);
  });

  it("should process escaped quotes (')", () => {
    deepEqual(parse("'word\\'word'"), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 12,
        value: "word\\'word",
        quote: "'"
      }
    ]);
  });

  it("should process escaped quotes (')", () => {
    deepEqual(parse('"word\\"word"'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 12,
        value: 'word\\"word',
        quote: '"'
      }
    ]);
  });

  it("should process single quotes inside double quotes (')", () => {
    deepEqual(parse('"word\'word"'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "word'word",
        quote: '"'
      }
    ]);
  });

  it("should process double quotes inside single quotes (')", () => {
    deepEqual(parse("'word\"word'"), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: 'word"word',
        quote: "'"
      }
    ]);
  });

  it("should process unclosed quotes", () => {
    deepEqual(parse('"word'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "word",
        quote: '"',
        unclosed: true
      }
    ]);
  });

  it("should process unclosed quotes with ended backslash", () => {
    deepEqual(parse('"word\\'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "word\\",
        quote: '"',
        unclosed: true
      }
    ]);
  });

  it("should process quoted strings", () => {
    deepEqual(parse('"string"'), [
      {
        type: "string",
        sourceIndex: 0,
        sourceEndIndex: 8,
        value: "string",
        quote: '"'
      }
    ]);
  });

  it("should process quoted strings and words", () => {
    deepEqual(parse('word1"string"word2'), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "word1"
      },
      {
        type: "string",
        sourceIndex: 5,
        sourceEndIndex: 13,
        value: "string",
        quote: '"'
      },
      {
        type: "word",
        sourceIndex: 13,
        sourceEndIndex: 18,
        value: "word2"
      }
    ]);
  });

  it("should process quoted strings and spaces", () => {
    deepEqual(parse(' "string" '), [
      {
        type: "space",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: " "
      },
      {
        type: "string",
        sourceIndex: 1,
        sourceEndIndex: 9,
        value: "string",
        quote: '"'
      },
      {
        type: "space",
        sourceIndex: 9,
        sourceEndIndex: 10,
        value: " "
      }
    ]);
  });

  it("should process escaped symbols as words", () => {
    deepEqual(parse(" \\\"word\\'\\ \\\t "), [
      {
        type: "space",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 1,
        sourceEndIndex: 13,
        value: "\\\"word\\'\\ \\\t"
      },
      {
        type: "space",
        sourceIndex: 13,
        sourceEndIndex: 14,
        value: " "
      }
    ]);
  });

  it("should correctly proceess font value", () => {
    deepEqual(
      parse(
        "bold italic 12px \t /3 'Open Sans', Arial, \"Helvetica Neue\", sans-serif"
      ),
      [
        {
          type: "word",
          sourceIndex: 0,
          sourceEndIndex: 4,
          value: "bold"
        },
        {
          type: "space",
          sourceIndex: 4,
          sourceEndIndex: 5,
          value: " "
        },
        {
          type: "word",
          sourceIndex: 5,
          sourceEndIndex: 11,
          value: "italic"
        },
        {
          type: "space",
          sourceIndex: 11,
          sourceEndIndex: 12,
          value: " "
        },
        {
          type: "word",
          sourceIndex: 12,
          sourceEndIndex: 16,
          value: "12px"
        },
        {
          type: "div",
          sourceIndex: 16,
          sourceEndIndex: 20,
          value: "/",
          before: " \t ",
          after: ""
        },
        {
          type: "word",
          sourceIndex: 20,
          sourceEndIndex: 21,
          value: "3"
        },
        {
          type: "space",
          sourceIndex: 21,
          sourceEndIndex: 22,
          value: " "
        },
        {
          type: "string",
          sourceIndex: 22,
          sourceEndIndex: 33,
          value: "Open Sans",
          quote: "'"
        },
        {
          type: "div",
          sourceIndex: 33,
          sourceEndIndex: 35,
          value: ",",
          before: "",
          after: " "
        },
        {
          type: "word",
          sourceIndex: 35,
          sourceEndIndex: 40,
          value: "Arial"
        },
        {
          type: "div",
          sourceIndex: 40,
          sourceEndIndex: 42,
          value: ",",
          before: "",
          after: " "
        },
        {
          type: "string",
          sourceIndex: 42,
          sourceEndIndex: 58,
          value: "Helvetica Neue",
          quote: '"'
        },
        {
          type: "div",
          sourceIndex: 58,
          sourceEndIndex: 60,
          value: ",",
          before: "",
          after: " "
        },
        {
          type: "word",
          sourceIndex: 60,
          sourceEndIndex: 70,
          value: "sans-serif"
        }
      ]
    );
  });

  it("should correctly proceess color value", () => {
    deepEqual(parse("rgba( 29, 439 , 29 )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 20,
        value: "rgba",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 6,
            sourceEndIndex: 8,
            value: "29"
          },
          {
            type: "div",
            sourceIndex: 8,
            sourceEndIndex: 10,
            value: ",",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 10,
            sourceEndIndex: 13,
            value: "439"
          },
          {
            type: "div",
            sourceIndex: 13,
            sourceEndIndex: 16,
            value: ",",
            before: " ",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 16,
            sourceEndIndex: 18,
            value: "29"
          }
        ]
      }
    ]);
  });

  it("should correctly process url function", () => {
    deepEqual(parse("url( /gfx/img/bg.jpg )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 22,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 20,
            value: "/gfx/img/bg.jpg"
          }
        ]
      }
    ]);
  });

  it("should add unclosed: true prop for url function", () => {
    deepEqual(parse("url( /gfx/img/bg.jpg "), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 21,
        value: "url",
        before: " ",
        after: "",
        unclosed: true,
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 20,
            value: "/gfx/img/bg.jpg"
          },
          {
            type: "space",
            sourceIndex: 20,
            sourceEndIndex: 21,
            value: " "
          }
        ]
      }
    ]);
  });

  it("should correctly process url function with quoted first argument", () => {
    deepEqual(parse('url( "/gfx/img/bg.jpg" hello )'), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 30,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "string",
            sourceIndex: 5,
            sourceEndIndex: 22,
            quote: '"',
            value: "/gfx/img/bg.jpg"
          },
          {
            type: "space",
            sourceIndex: 22,
            sourceEndIndex: 23,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 23,
            sourceEndIndex: 28,
            value: "hello"
          }
        ]
      }
    ]);
  });

  it("should correctly parse spaces", () => {
    deepEqual(parse("calc(1 + 2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "space",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "+"
          },
          {
            type: "space",
            sourceIndex: 8,
            sourceEndIndex: 9,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 9,
            sourceEndIndex: 10,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly parse subtraction with spaces", () => {
    deepEqual(parse("calc(1 - 2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "space",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "-"
          },
          {
            type: "space",
            sourceIndex: 8,
            sourceEndIndex: 9,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 9,
            sourceEndIndex: 10,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly parse multiplication with spaces", () => {
    deepEqual(parse("calc(1 * 2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "space",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "*"
          },
          {
            type: "space",
            sourceIndex: 8,
            sourceEndIndex: 9,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 9,
            sourceEndIndex: 10,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly parse division with spaces", () => {
    deepEqual(parse("calc(1 / 2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "space",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "/"
          },
          {
            type: "space",
            sourceIndex: 8,
            sourceEndIndex: 9,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 9,
            sourceEndIndex: 10,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly parse multiplication without spaces", () => {
    deepEqual(parse("calc(1*2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 9,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "word",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: "*"
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly parse division without spaces", () => {
    deepEqual(parse("calc(1/2)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 9,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: "1"
          },
          {
            type: "word",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: "/"
          },
          {
            type: "word",
            sourceIndex: 7,
            sourceEndIndex: 8,
            value: "2"
          }
        ]
      }
    ]);
  });

  it("should correctly process nested calc functions", () => {
    deepEqual(parse("calc(((768px - 100vw) / 2) - 15px)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 34,
        value: "calc",
        before: "",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 5,
            sourceEndIndex: 26,
            value: "",
            before: "",
            after: "",
            nodes: [
              {
                type: "function",
                sourceIndex: 6,
                sourceEndIndex: 21,
                value: "",
                before: "",
                after: "",
                nodes: [
                  {
                    type: "word",
                    sourceIndex: 7,
                    sourceEndIndex: 12,
                    value: "768px"
                  },
                  {
                    type: "space",
                    sourceIndex: 12,
                    sourceEndIndex: 13,
                    value: " "
                  },
                  {
                    type: "word",
                    sourceIndex: 13,
                    sourceEndIndex: 14,
                    value: "-"
                  },
                  {
                    type: "space",
                    sourceIndex: 14,
                    sourceEndIndex: 15,
                    value: " "
                  },
                  {
                    type: "word",
                    sourceIndex: 15,
                    sourceEndIndex: 20,
                    value: "100vw"
                  }
                ]
              },
              {
                type: "div",
                sourceIndex: 21,
                sourceEndIndex: 24,
                value: "/",
                before: " ",
                after: " "
              },
              {
                type: "word",
                sourceIndex: 24,
                sourceEndIndex: 25,
                value: "2"
              }
            ]
          },
          {
            type: "space",
            sourceIndex: 26,
            sourceEndIndex: 27,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 27,
            sourceEndIndex: 28,
            value: "-"
          },
          {
            type: "space",
            sourceIndex: 28,
            sourceEndIndex: 29,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 29,
            sourceEndIndex: 33,
            value: "15px"
          }
        ]
      }
    ]);
  });

  it("should process colons with params", () => {
    deepEqual(parse("(min-width: 700px) and (orientation: \\$landscape)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 18,
        value: "",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 1,
            sourceEndIndex: 10,
            value: "min-width"
          },
          {
            type: "div",
            sourceIndex: 10,
            sourceEndIndex: 12,
            value: ":",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 12,
            sourceEndIndex: 17,
            value: "700px"
          }
        ]
      },
      {
        type: "space",
        sourceIndex: 18,
        sourceEndIndex: 19,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 19,
        sourceEndIndex: 22,
        value: "and"
      },
      {
        type: "space",
        sourceIndex: 22,
        sourceEndIndex: 23,
        value: " "
      },
      {
        type: "function",
        sourceIndex: 23,
        sourceEndIndex: 49,
        value: "",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 24,
            sourceEndIndex: 35,
            value: "orientation"
          },
          {
            type: "div",
            sourceIndex: 35,
            sourceEndIndex: 37,
            value: ":",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 37,
            sourceEndIndex: 48,
            value: "\\$landscape"
          }
        ]
      }
    ]);
  });

  it("should escape parentheses with backslash", () => {
    deepEqual(parse("url( http://website.com/assets\\)_test )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 39,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 37,
            value: "http://website.com/assets\\)_test"
          }
        ]
      }
    ]);
  });

  it("should parse parentheses correctly", () => {
    deepEqual(parse("fn1(fn2(255), fn3(.2)), fn4(fn5(255,.2), fn6)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 22,
        value: "fn1",
        before: "",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 4,
            sourceEndIndex: 12,
            value: "fn2",
            before: "",
            after: "",
            nodes: [
              {
                type: "word",
                sourceIndex: 8,
                sourceEndIndex: 11,
                value: "255"
              }
            ]
          },
          {
            type: "div",
            sourceIndex: 12,
            sourceEndIndex: 14,
            value: ",",
            before: "",
            after: " "
          },
          {
            type: "function",
            sourceIndex: 14,
            sourceEndIndex: 21,
            value: "fn3",
            before: "",
            after: "",
            nodes: [
              {
                type: "word",
                sourceIndex: 18,
                sourceEndIndex: 20,
                value: ".2"
              }
            ]
          }
        ]
      },
      {
        type: "div",
        sourceIndex: 22,
        sourceEndIndex: 24,
        value: ",",
        before: "",
        after: " "
      },
      {
        type: "function",
        sourceIndex: 24,
        sourceEndIndex: 45,
        value: "fn4",
        before: "",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 28,
            sourceEndIndex: 39,
            value: "fn5",
            before: "",
            after: "",
            nodes: [
              {
                type: "word",
                sourceIndex: 32,
                sourceEndIndex: 35,
                value: "255"
              },
              {
                type: "div",
                sourceIndex: 35,
                sourceEndIndex: 36,
                value: ",",
                before: "",
                after: ""
              },
              {
                type: "word",
                sourceIndex: 36,
                sourceEndIndex: 38,
                value: ".2"
              }
            ]
          },
          {
            type: "div",
            sourceIndex: 39,
            sourceEndIndex: 41,
            value: ",",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 41,
            sourceEndIndex: 44,
            value: "fn6"
          }
        ]
      }
    ]);
  });

  it("shouldn't throw an error on unclosed function", () => {
    deepEqual(parse("(0 32 word "), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "",
        before: "",
        after: "",
        unclosed: true,
        nodes: [
          {
            type: "word",
            sourceIndex: 1,
            sourceEndIndex: 2,
            value: "0"
          },
          {
            type: "space",
            sourceIndex: 2,
            sourceEndIndex: 3,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 3,
            sourceEndIndex: 5,
            value: "32"
          },
          {
            type: "space",
            sourceIndex: 5,
            sourceEndIndex: 6,
            value: " "
          },
          {
            type: "word",
            sourceIndex: 6,
            sourceEndIndex: 10,
            value: "word"
          },
          {
            type: "space",
            sourceIndex: 10,
            sourceEndIndex: 11,
            value: " "
          }
        ]
      }
    ]);
  });

  it("should add unclosed: true prop for every unclosed function", () => {
    deepEqual(parse("( ( ( ) "), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 8,
        value: "",
        before: " ",
        after: "",
        unclosed: true,
        nodes: [
          {
            type: "function",
            sourceIndex: 2,
            sourceEndIndex: 8,
            value: "",
            before: " ",
            after: "",
            unclosed: true,
            nodes: [
              {
                type: "function",
                sourceIndex: 4,
                sourceEndIndex: 7,
                value: "",
                before: " ",
                after: "",
                nodes: []
              },
              {
                type: "space",
                sourceIndex: 7,
                sourceEndIndex: 8,
                value: " "
              }
            ]
          }
        ]
      }
    ]);
  });

  it("shouldn't throw an error on unopened function", () => {
    deepEqual(parse("0 32 word ) "), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 1,
        value: "0"
      },
      {
        type: "space",
        sourceIndex: 1,
        sourceEndIndex: 2,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 2,
        sourceEndIndex: 4,
        value: "32"
      },
      {
        type: "space",
        sourceIndex: 4,
        sourceEndIndex: 5,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 5,
        sourceEndIndex: 9,
        value: "word"
      },
      {
        type: "space",
        sourceIndex: 9,
        sourceEndIndex: 10,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 10,
        sourceEndIndex: 11,
        value: ")"
      },
      {
        type: "space",
        sourceIndex: 11,
        sourceEndIndex: 12,
        value: " "
      }
    ]);
  });

  it("should process escaped spaces as word in fonts", () => {
    deepEqual(parse("Bond\\ 007"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 9,
        value: "Bond\\ 007"
      }
    ]);
  });

  it("should parse double url and comma", () => {
    deepEqual(parse("url(foo/bar.jpg), url(http://website.com/img.jpg)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 16,
        value: "url",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 4,
            sourceEndIndex: 15,
            value: "foo/bar.jpg"
          }
        ]
      },
      {
        type: "div",
        sourceIndex: 16,
        sourceEndIndex: 18,
        value: ",",
        before: "",
        after: " "
      },
      {
        type: "function",
        sourceIndex: 18,
        sourceEndIndex: 49,
        value: "url",
        before: "",
        after: "",
        nodes: [
          {
            type: "word",
            sourceIndex: 22,
            sourceEndIndex: 48,
            value: "http://website.com/img.jpg"
          }
        ]
      }
    ]);
  });

  it("should parse empty url", () => {
    deepEqual(parse("url()"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "url",
        before: "",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with space", () => {
    deepEqual(parse("url( )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "url",
        before: " ",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with multiple spaces", () => {
    deepEqual(parse("url(   )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 8,
        value: "url",
        before: "   ",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with newline (LF)", () => {
    deepEqual(parse("url(\n)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "url",
        before: "\n",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with newline (CRLF)", () => {
    deepEqual(parse("url(\r\n)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 7,
        value: "url",
        before: "\r\n",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with multiple newlines (LF)", () => {
    deepEqual(parse("url(\n\n\n)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 8,
        value: "url",
        before: "\n\n\n",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with multiple newlines (CRLF)", () => {
    deepEqual(parse("url(\r\n\r\n\r\n)"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "url",
        before: "\r\n\r\n\r\n",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse empty url with whitespace characters", () => {
    deepEqual(parse("url(  \n \t  \r\n  )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 16,
        value: "url",
        before: "  \n \t  \r\n  ",
        after: "",
        nodes: []
      }
    ]);
  });

  it("should parse comments", () => {
    deepEqual(parse("/*before*/ 1px /*between*/ 1px /*after*/"), [
      {
        type: "comment",
        sourceIndex: 0,
        sourceEndIndex: 10,
        value: "before"
      },
      {
        type: "space",
        sourceIndex: 10,
        sourceEndIndex: 11,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 11,
        sourceEndIndex: 14,
        value: "1px"
      },
      {
        type: "space",
        sourceIndex: 14,
        sourceEndIndex: 15,
        value: " "
      },
      {
        type: "comment",
        sourceIndex: 15,
        sourceEndIndex: 26,
        value: "between"
      },
      {
        type: "space",
        sourceIndex: 26,
        sourceEndIndex: 27,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 27,
        sourceEndIndex: 30,
        value: "1px"
      },
      {
        type: "space",
        sourceIndex: 30,
        sourceEndIndex: 31,
        value: " "
      },
      {
        type: "comment",
        sourceIndex: 31,
        sourceEndIndex: 40,
        value: "after"
      }
    ]);
  });

  it("should parse comments inside functions", () => {
    deepEqual(parse("rgba( 0, 55/55, 0/*,.5*/ )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 26,
        value: "rgba",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 6,
            sourceEndIndex: 7,
            value: "0"
          },
          {
            type: "div",
            sourceIndex: 7,
            sourceEndIndex: 9,
            value: ",",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 9,
            sourceEndIndex: 11,
            value: "55"
          },
          {
            type: "div",
            sourceIndex: 11,
            sourceEndIndex: 12,
            value: "/",
            before: "",
            after: ""
          },
          {
            type: "word",
            sourceIndex: 12,
            sourceEndIndex: 14,
            value: "55"
          },
          {
            type: "div",
            sourceIndex: 14,
            sourceEndIndex: 16,
            value: ",",
            before: "",
            after: " "
          },
          {
            type: "word",
            sourceIndex: 16,
            sourceEndIndex: 17,
            value: "0"
          },
          {
            type: "comment",
            sourceIndex: 17,
            sourceEndIndex: 24,
            value: ",.5"
          }
        ]
      }
    ]);
  });

  it("should parse comments at the end of url functions with quoted first argument", () => {
    deepEqual(parse('url( "/demo/bg.png" /*comment*/ )'), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 33,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "string",
            sourceIndex: 5,
            sourceEndIndex: 19,
            value: "/demo/bg.png",
            quote: '"'
          },
          {
            type: "space",
            sourceIndex: 19,
            sourceEndIndex: 20,
            value: " "
          },
          {
            type: "comment",
            sourceIndex: 20,
            sourceEndIndex: 31,
            value: "comment"
          }
        ]
      }
    ]);
  });

  it("should not parse comments at the start of url function with unquoted first argument", () => {
    deepEqual(parse("url( /*comment*/ /demo/bg.png )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 31,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 29,
            value: "/*comment*/ /demo/bg.png"
          }
        ]
      }
    ]);
  });

  it("should not parse comments at the end of url function with unquoted first argument", () => {
    deepEqual(parse("url( /demo/bg.png /*comment*/ )"), [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 31,
        value: "url",
        before: " ",
        after: " ",
        nodes: [
          {
            type: "word",
            sourceIndex: 5,
            sourceEndIndex: 29,
            value: "/demo/bg.png /*comment*/"
          }
        ]
      }
    ]);
  });

  it("should parse unclosed comments", () => {
    deepEqual(parse("/*comment*/ 1px /* unclosed "), [
      {
        type: "comment",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "comment"
      },
      {
        type: "space",
        sourceIndex: 11,
        sourceEndIndex: 12,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 12,
        sourceEndIndex: 15,
        value: "1px"
      },
      {
        type: "space",
        sourceIndex: 15,
        sourceEndIndex: 16,
        value: " "
      },
      {
        type: "comment",
        sourceIndex: 16,
        sourceEndIndex: 28,
        value: " unclosed ",
        unclosed: true
      }
    ]);
  });

  it("should respect escape character", () => {
    deepEqual(parse("Hawaii \\35 -0"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "Hawaii"
      },
      {
        type: "space",
        sourceIndex: 6,
        sourceEndIndex: 7,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 7,
        sourceEndIndex: 10,
        value: "\\35"
      },
      {
        type: "space",
        sourceIndex: 10,
        sourceEndIndex: 11,
        value: " "
      },
      {
        type: "word",
        sourceIndex: 11,
        sourceEndIndex: 13,
        value: "-0"
      }
    ]);
  });

  it("should parse unicode-range (single codepoint)", () => {
    deepEqual(parse("U+26"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 4,
        value: "U+26"
      }
    ]);
  });

  it("should parse unicode-range (single codepoint) 2", () => {
    deepEqual(parse("U+0-7F"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "U+0-7F"
      }
    ]);
  });

  it("should parse unicode-range (single codepoint) 3", () => {
    deepEqual(parse("U+0-7f"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "U+0-7f"
      }
    ]);
  });

  it("should parse unicode-range (single codepoint) (lowercase)", () => {
    deepEqual(parse("u+26"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 4,
        value: "u+26"
      }
    ]);
  });

  it("should parse unicode-range (codepoint range)", () => {
    deepEqual(parse("U+0025-00FF"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "U+0025-00FF"
      }
    ]);
  });

  it("should parse unicode-range (wildcard range)", () => {
    deepEqual(parse("U+4??"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "U+4??"
      }
    ]);
  });

  it("should parse unicode-range (multiple values)", () => {
    deepEqual(parse("U+0025-00FF, U+4??"), [
      {
        type: "unicode-range",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "U+0025-00FF"
      },
      {
        type: "div",
        sourceIndex: 11,
        sourceEndIndex: 13,
        value: ",",
        before: "",
        after: " "
      },
      {
        type: "unicode-range",
        sourceIndex: 13,
        sourceEndIndex: 18,
        value: "U+4??"
      }
    ]);
  });

  it("should parse invalid unicode-range as word", () => {
    deepEqual(parse("U+4??Z"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 6,
        value: "U+4??Z"
      }
    ]);
  });

  it("should parse invalid unicode-range as word 2", () => {
    deepEqual(parse("U+"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 2,
        value: "U+"
      }
    ]);
  });

  it("should parse invalid unicode-range as word 2", () => {
    deepEqual(parse("U+Z"), [
      {
        type: "word",
        sourceIndex: 0,
        sourceEndIndex: 3,
        value: "U+Z"
      }
    ]);
  });
});
