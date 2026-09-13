import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { marked } from "../markdown.mjs";

describe("Markdown Processing", () => {
  it("should process markdown with heading ID extension", () => {
    const input = "# Test Heading";
    const result = marked.parse(input);
    assert.match(result, /<h1 id="test-heading">Test Heading<\/h1>/);
  });
});
