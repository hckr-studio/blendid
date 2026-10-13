import nunjucks from "@11ty/nunjucks";

export class Texy {
  tags = ["texy"];

  constructor(env, renderTexy) {
    this.env = env;
    this.process = renderTexy;
  }

  parse(parser, nodes, lexer) {
    const tok = parser.nextToken();

    // Parse the `markdown` tag and collect any arguments
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    // If arguments, return the fileTag constructed node
    if (args.children.length > 0) {
      return new nodes.CallExtensionAsync(this, "fileTag", args);
    }

    // Otherwise parse until the close block and move the parser to the next position
    const body = parser.parseUntilBlocks("endtexy");

    // I found Nunjucks to be incredibly convoluted on how to just get some data into the BlockTag function,
    // this finally worked by faking another template node.
    const tabStartNode = new nodes.NodeList(0, 0, [
      new nodes.Output(0, 0, [new nodes.TemplateData(0, 0, tok.colno - 1)])
    ]);

    parser.advanceAfterBlockEnd();

    // Return the constructed blockTag node
    return new nodes.CallExtension(this, "blockTag", args, [
      body,
      tabStartNode
    ]);
  }

  // Texy rendering for the file tag. Use the nunjucks.render function to render
  // the actual contents of the file. Pass the results through the Texy renderer.
  fileTag(environment, file, cb) {
    this.env
      .render(file, environment.ctx)
      .then((data) => {
        cb(null, new nunjucks.runtime.SafeString(this.process(data)));
      })
      .catch((err) => {
        cb(err);
      });
  }

  // Texy rendering for the block. Pretty simple, just get the body text and pass
  // it through the Texy renderer.
  blockTag(environment, body, tabStart) {
    let bodyText = body();
    const spacesRegex = /^[\s]+/;
    const tabStartCol = tabStart(); // The column position of the {% texy %} tag.

    if (tabStartCol > 0) {
      // If the {% texy %} tag is tabbed in, normalize the content to the same depth.
      const bodyLines = bodyText.split(/\r?\n/); // Split into lines.
      let normalizedBody = "";
      for (const line of bodyLines) {
        const startSpaces = line.match(spacesRegex);
        if (startSpaces && startSpaces[0].length >= tabStartCol) {
          // If the content is not at the same or greater tab depth, do nothing.
          normalizedBody += line.slice(tabStartCol); // Subtract the column position from the start of the string.
        } else if (startSpaces) {
          normalizedBody += line.slice(startSpaces[0].length);
        } else {
          normalizedBody += line;
        }
        normalizedBody += "\n";
      }
      bodyText = normalizedBody; // Rejoin into one string.
    }

    return new nunjucks.runtime.SafeString(this.process(bodyText));
  }
}
