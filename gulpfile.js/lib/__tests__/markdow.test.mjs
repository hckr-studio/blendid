import { expect } from "chai";
import { marked } from "../markdown.mjs";

describe("Markdown Processing", () => {
  it("should process markdown with heading ID extension", () => {
    const input = "# Test Heading";
    const result = marked.parse(input);
    expect(result).to.include(`<h1 id="test-heading">Test Heading</h1>`);
  });
});
