import { deepEqual, equal } from "node:assert";
import { describe, it } from "node:test";
import parser from "./index.mjs";

describe("ValueParser", () => {
  it("should process rgba with spaces and commas", () => {
    equal(
      " rgba( 34 , 45 , 54, .5 ) ",
      parser(" rgba( 34 , 45 , 54, .5 ) ")
        .walk(() => {})
        .toString()
    );
  });

  it("should process mixed content with functions, spaces and strings", () => {
    equal(
      "w1 w2 w6 \n f(4) ( ) () \t \"s't\" 'st\\\"2'",
      parser("w1 w2 w6 \n f(4) ( ) () \t \"s't\" 'st\\\"2'")
        .walk(() => {})
        .toString()
    );
  });

  it("walk should process all functions", () => {
    const result = [];
    parser("fn( ) fn2( fn3())").walk((node) => {
      if (node.type === "function") {
        result.push(node);
      }
    });

    deepEqual(result, [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "fn",
        before: " ",
        after: "",
        nodes: []
      },
      {
        type: "function",
        sourceIndex: 6,
        sourceEndIndex: 17,
        value: "fn2",
        before: " ",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 11,
            sourceEndIndex: 16,
            value: "fn3",
            before: "",
            after: "",
            nodes: []
          }
        ]
      },
      {
        type: "function",
        sourceIndex: 11,
        sourceEndIndex: 16,
        value: "fn3",
        before: "",
        after: "",
        nodes: []
      }
    ]);
  });

  it("walk shouldn't process functions after falsy callback", () => {
    const result = [];

    parser("fn( ) fn2( fn3())").walk((node) => {
      if (node.type === "function") {
        result.push(node);
        if (node.value === "fn2") {
          return false;
        }
      }
      return true;
    });

    deepEqual(result, [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "fn",
        before: " ",
        after: "",
        nodes: []
      },
      {
        type: "function",
        sourceIndex: 6,
        sourceEndIndex: 17,
        value: "fn2",
        before: " ",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 11,
            sourceEndIndex: 16,
            value: "fn3",
            before: "",
            after: "",
            nodes: []
          }
        ]
      }
    ]);
  });

  it("walk shouldn't process nodes with defined non-function type", () => {
    const result = [];

    parser("fn( ) fn2( fn3())").walk((node) => {
      if (node.type === "function" && node.value === "fn2") {
        node.type = "word";
      }
      result.push(node);
    });

    deepEqual(result, [
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 5,
        value: "fn",
        before: " ",
        after: "",
        nodes: []
      },
      { type: "space", sourceIndex: 5, sourceEndIndex: 6, value: " " },
      {
        type: "word",
        sourceIndex: 6,
        sourceEndIndex: 17,
        value: "fn2",
        before: " ",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 11,
            sourceEndIndex: 16,
            value: "fn3",
            before: "",
            after: "",
            nodes: []
          }
        ]
      }
    ]);
  });

  it("walk should process all functions with reverse mode", () => {
    const result = [];

    parser("fn2( fn3())").walk((node) => {
      if (node.type === "function") {
        result.push(node);
      }
    }, true);

    deepEqual(result, [
      {
        type: "function",
        sourceIndex: 5,
        sourceEndIndex: 10,
        value: "fn3",
        before: "",
        after: "",
        nodes: []
      },
      {
        type: "function",
        sourceIndex: 0,
        sourceEndIndex: 11,
        value: "fn2",
        before: " ",
        after: "",
        nodes: [
          {
            type: "function",
            sourceIndex: 5,
            sourceEndIndex: 10,
            value: "fn3",
            before: "",
            after: "",
            nodes: []
          }
        ]
      }
    ]);
  });
});
