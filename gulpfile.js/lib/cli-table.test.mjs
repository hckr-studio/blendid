import assert from "node:assert";
import { describe, it } from "node:test";
import { Table } from "./cli-table.mjs";

describe("cli-table", () => {
  it("complete table", () => {
    const table = new Table({
      head: ["Rel", "Change", "By", "When"],
      style: {
        "padding-left": 1,
        "padding-right": 1,
        head: [],
        border: []
      },
      colWidths: [6, 21, 25, 17]
    });

    table.push(
      ["v0.1", "Testing something cool", "rauchg@gmail.com", "7 minutes ago"],
      ["v0.1", "Testing something cool", "rauchg@gmail.com", "8 minutes ago"]
    );

    const expected = [
      "┌──────┬─────────────────────┬─────────────────────────┬─────────────────┐",
      "│ Rel  │ Change              │ By                      │ When            │",
      "├──────┼─────────────────────┼─────────────────────────┼─────────────────┤",
      "│ v0.1 │ Testing something … │ rauchg@gmail.com        │ 7 minutes ago   │",
      "├──────┼─────────────────────┼─────────────────────────┼─────────────────┤",
      "│ v0.1 │ Testing something … │ rauchg@gmail.com        │ 8 minutes ago   │",
      "└──────┴─────────────────────┴─────────────────────────┴─────────────────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("width property", () => {
    const table = new Table({
      head: ["Cool"],
      style: {
        head: [],
        border: []
      }
    });

    assert.strictEqual(table.width, 8);
  });

  it("vertical table output", () => {
    const table = new Table({
      style: { "padding-left": 0, "padding-right": 0, head: [], border: [] }
    });

    table.push(
      { "v0.1": "Testing something cool" },
      { "v0.1": "Testing something cool" }
    );

    const expected = [
      "┌────┬──────────────────────┐",
      "│v0.1│Testing something cool│",
      "├────┼──────────────────────┤",
      "│v0.1│Testing something cool│",
      "└────┴──────────────────────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("cross table output", () => {
    const table = new Table({
      head: ["", "Header 1", "Header 2"],
      style: { "padding-left": 0, "padding-right": 0, head: [], border: [] }
    });

    table.push(
      { "Header 3": ["v0.1", "Testing something cool"] },
      { "Header 4": ["v0.1", "Testing something cool"] }
    );

    const expected = [
      "┌────────┬────────┬──────────────────────┐",
      "│        │Header 1│Header 2              │",
      "├────────┼────────┼──────────────────────┤",
      "│Header 3│v0.1    │Testing something cool│",
      "├────────┼────────┼──────────────────────┤",
      "│Header 4│v0.1    │Testing something cool│",
      "└────────┴────────┴──────────────────────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("table colors", () => {
    const table = new Table({
      head: ["Rel", "By"],
      style: { head: ["red"], border: ["grey"] }
    });

    const off = "\u001b[39m";
    const red = "\u001b[31m";
    const orange = "\u001b[38;5;221m";
    const grey = "\u001b[90m";
    const c256s = orange + "v0.1" + off;

    table.push([c256s, "rauchg@gmail.com"]);

    const expected = [
      grey + "┌──────┬──────────────────┐" + off,
      grey +
        "│" +
        off +
        red +
        " Rel  " +
        off +
        grey +
        "│" +
        off +
        red +
        " By               " +
        off +
        grey +
        "│" +
        off,
      grey + "├──────┼──────────────────┤" + off,
      grey +
        "│" +
        off +
        " " +
        c256s +
        " " +
        grey +
        "│" +
        off +
        " rauchg@gmail.com " +
        grey +
        "│" +
        off,
      grey + "└──────┴──────────────────┘" + off
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("custom chars", () => {
    const table = new Table({
      chars: {
        top: "═",
        "top-mid": "╤",
        "top-left": "╔",
        "top-right": "╗",
        bottom: "═",
        "bottom-mid": "╧",
        "bottom-left": "╚",
        "bottom-right": "╝",
        left: "║",
        "left-mid": "╟",
        right: "║",
        "right-mid": "╢"
      },
      style: {
        head: [],
        border: []
      }
    });

    table.push(["foo", "bar", "baz"], ["frob", "bar", "quuz"]);

    const expected = [
      "╔══════╤═════╤══════╗",
      "║ foo  │ bar │ baz  ║",
      "╟──────┼─────┼──────╢",
      "║ frob │ bar │ quuz ║",
      "╚══════╧═════╧══════╝"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("compact shortand", () => {
    const table = new Table({
      style: {
        head: [],
        border: [],
        compact: true
      }
    });

    table.push(["foo", "bar", "baz"], ["frob", "bar", "quuz"]);

    const expected = [
      "┌──────┬─────┬──────┐",
      "│ foo  │ bar │ baz  │",
      "│ frob │ bar │ quuz │",
      "└──────┴─────┴──────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("compact empty mid line", () => {
    const table = new Table({
      chars: {
        mid: "",
        "left-mid": "",
        "mid-mid": "",
        "right-mid": ""
      },
      style: {
        head: [],
        border: []
      }
    });

    table.push(["foo", "bar", "baz"], ["frob", "bar", "quuz"]);

    const expected = [
      "┌──────┬─────┬──────┐",
      "│ foo  │ bar │ baz  │",
      "│ frob │ bar │ quuz │",
      "└──────┴─────┴──────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("decoration lines disabled", () => {
    const table = new Table({
      chars: {
        top: "",
        "top-mid": "",
        "top-left": "",
        "top-right": "",
        bottom: "",
        "bottom-mid": "",
        "bottom-left": "",
        "bottom-right": "",
        left: "",
        "left-mid": "",
        mid: "",
        "mid-mid": "",
        right: "",
        "right-mid": "",
        middle: " "
      },
      style: {
        head: [],
        border: [],
        "padding-left": 0,
        "padding-right": 0
      }
    });

    table.push(["foo", "bar", "baz"], ["frobnicate", "bar", "quuz"]);

    const expected = ["foo        bar baz ", "frobnicate bar quuz"];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("rows option in constructor", () => {
    const table = new Table({
      style: {
        head: [],
        border: []
      },
      rows: [
        ["foo", "7 minutes ago"],
        ["bar", "8 minutes ago"]
      ]
    });

    const expected = [
      "┌─────┬───────────────┐",
      "│ foo │ 7 minutes ago │",
      "├─────┼───────────────┤",
      "│ bar │ 8 minutes ago │",
      "└─────┴───────────────┘"
    ];

    assert.strictEqual(table.toString(), expected.join("\n"));
  });

  it("table with no options provided in constructor", () => {
    const table = new Table();

    assert.ok(table);
  });
});
