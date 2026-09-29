import assert from "node:assert";
import { describe, it } from "node:test";
import postcss from "postcss";
import functions from "./index.mjs";

async function testFixture(fixture, expected = null, opts = {}) {
  if (expected === null) expected = fixture;

  const out = await postcss(functions(opts)).process(fixture, {
    from: undefined
  });
  assert.deepStrictEqual(out.css, expected);
}

describe("postcss-functions", () => {
  it("should invoke a recognized function", async () => {
    await testFixture("a{foo:bar()}", "a{foo:baz}", {
      functions: {
        bar: () => "baz"
      }
    });
  });

  it("should accept deferred functions", async () => {
    await testFixture("a{foo:bar()}", "a{foo:baz}", {
      functions: {
        bar: async () => "baz"
      }
    });
  });

  it("should invoke multiple functions", async () => {
    await testFixture("a{foo:bar() baz()}", "a{foo:bat qux}", {
      functions: {
        bar: () => "bat",
        baz: () => "qux"
      }
    });
  });

  it("should ignore unrecognized functions", async () => {
    await testFixture("a{foo:bar()}");
  });

  it("should be able to pass arguments to functions", async () => {
    await testFixture("a{foo:bar(qux, norf)}", "a{foo:qux-norf}", {
      functions: {
        bar: (baz, bat) => `${baz}-${bat}`
      }
    });
  });

  it("should be able to pass arguments with spaces to functions", async () => {
    await testFixture("a{foo:bar(hello world)}", "a{foo:hello-world}", {
      functions: {
        bar: (baz) => baz.replace(" ", "-")
      }
    });
  });

  it("should invoke a function in an at-rule", async () => {
    await testFixture("@foo bar(){bat:qux}", "@foo baz{bat:qux}", {
      functions: {
        bar: () => "baz"
      }
    });
  });

  it("should invoke a function in a rule", async () => {
    await testFixture("foo:nth-child(bar()){}", "foo:nth-child(baz){}", {
      functions: {
        bar: () => "baz"
      }
    });
  });

  it("should invoke nested functions", async () => {
    await testFixture("a{foo:bar(baz())}", "a{foo:batqux}", {
      functions: {
        bar: (arg) => `bat${arg}`,
        baz: async () => "qux"
      }
    });
  });

  it("should not pass empty arguments", async () => {
    await postcss(
      functions({
        functions: {
          bar(...args) {
            assert.strictEqual(args.length, 0);
          }
        }
      })
    ).process("a{foo:bar()}", { from: undefined });
  });
});
