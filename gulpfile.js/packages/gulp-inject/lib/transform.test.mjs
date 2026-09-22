import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import Vinyl from "vinyl";
import { transform } from "./transform.mjs";

// Helper function to create fixture files
function fixture(file, read) {
  const filepath = path.resolve(import.meta.dirname, "test-fixtures", file);
  return new Vinyl({
    path: filepath,
    cwd: import.meta.dirname,
    base: path.resolve(
      import.meta.dirname,
      "test-fixtures",
      path.dirname(file)
    ),
    contents: read ? fs.readFileSync(filepath) : null
  });
}

describe("transform", () => {
  it("should not crash when required", () => {
    assert.doesNotThrow(() => {
      assert.strictEqual(typeof transform, "function");
    });
  });

  it("should be a function", () => {
    assert.strictEqual(typeof transform, "function");
  });

  describe("targets", () => {
    it("should have a transform function for html target files", () => {
      assert.strictEqual(typeof transform.html, "function");
    });

    it("should have a transform function for react javascript (jsx) target files", () => {
      assert.strictEqual(typeof transform.jsx, "function");
    });

    it("should have a transform function for jade target files", () => {
      assert.strictEqual(typeof transform.jade, "function");
    });

    it("should have a transform function for pug target files", () => {
      assert.strictEqual(typeof transform.pug, "function");
    });

    it("should have a transform function for slm target files", () => {
      assert.strictEqual(typeof transform.slm, "function");
    });

    it("should have a transform function for haml target files", () => {
      assert.strictEqual(typeof transform.haml, "function");
    });

    it("should have a transform function for less target files", () => {
      assert.strictEqual(typeof transform.less, "function");
    });

    it("should have a transform function for sass target files", () => {
      assert.strictEqual(typeof transform.sass, "function");
    });

    it("should have a transform function for scss target files", () => {
      assert.strictEqual(typeof transform.scss, "function");
    });
  });

  describe("html as target", () => {
    it("should transform css to a link tag", () => {
      assert.strictEqual(typeof transform.html.css, "function");
      assert.strictEqual(
        transform.html.css("test-file.css"),
        '<link rel="stylesheet" href="test-file.css">'
      );
    });

    it("should transform html to a link tag", () => {
      assert.strictEqual(typeof transform.html.html, "function");
      assert.strictEqual(
        transform.html.html("test-file.html"),
        '<link rel="import" href="test-file.html">'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.html.js, "function");
      assert.strictEqual(
        transform.html.js("test-file.js"),
        '<script src="test-file.js"></script>'
      );
    });

    it("should transform jsx to a script tag", () => {
      assert.strictEqual(typeof transform.html.jsx, "function");
      assert.strictEqual(
        transform.html.jsx("test-file.jsx"),
        '<script type="text/jsx" src="test-file.jsx"></script>'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.html.coffee, "function");
      assert.strictEqual(
        transform.html.coffee("test-file.coffee"),
        '<script type="text/coffeescript" src="test-file.coffee"></script>'
      );
    });

    it("should transform an image to an img tag", () => {
      assert.strictEqual(typeof transform.html.image, "function");
      assert.strictEqual(
        transform.html.image("test-file.png"),
        '<img src="test-file.png">'
      );
    });

    describe("selfClosingTag option is true", () => {
      before(() => {
        transform.selfClosingTag = true;
      });
      after(() => {
        transform.selfClosingTag = false;
      });

      it("should make link tags self closing", () => {
        assert.strictEqual(
          transform.html.css("test-file.css"),
          '<link rel="stylesheet" href="test-file.css" />'
        );
        assert.strictEqual(
          transform.html.html("test-file.html"),
          '<link rel="import" href="test-file.html" />'
        );
      });

      it("should make img tags self closing", () => {
        assert.strictEqual(
          transform.html.image("test-file.png"),
          '<img src="test-file.png" />'
        );
      });
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.html("test-file.css"),
        transform.html.css("test-file.css")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.html("test-file.html"),
        transform.html.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.html("test-file.js"),
        transform.html.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.html("test-file.coffee"),
        transform.html.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.html("test-file.png"),
        transform.html.image("test-file.png")
      );
      assert.strictEqual(
        transform.html("test-file.gif"),
        transform.html.image("test-file.gif")
      );
      assert.strictEqual(
        transform.html("test-file.jpg"),
        transform.html.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.html("test-file.jpeg"),
        transform.html.image("test-file.jpeg")
      );
    });
  });

  describe("jsx as target", () => {
    it("should transform css to a self closing link tag", () => {
      assert.strictEqual(typeof transform.jsx.css, "function");
      assert.strictEqual(
        transform.jsx.css("test-file.css"),
        '<link rel="stylesheet" href="test-file.css" />'
      );
    });

    it("should transform html to a self closing link tag", () => {
      assert.strictEqual(typeof transform.jsx.html, "function");
      assert.strictEqual(
        transform.jsx.html("test-file.html"),
        '<link rel="import" href="test-file.html" />'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.jsx.js, "function");
      assert.strictEqual(
        transform.jsx.js("test-file.js"),
        '<script src="test-file.js"></script>'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.jsx.coffee, "function");
      assert.strictEqual(
        transform.jsx.coffee("test-file.coffee"),
        '<script type="text/coffeescript" src="test-file.coffee"></script>'
      );
    });

    it("should transform an image to a self closing img tag", () => {
      assert.strictEqual(typeof transform.jsx.image, "function");
      assert.strictEqual(
        transform.jsx.image("test-file.png"),
        '<img src="test-file.png" />'
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.jsx("test-file.css"),
        transform.jsx.css("test-file.css")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.jsx("test-file.html"),
        transform.jsx.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.jsx("test-file.js"),
        transform.jsx.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.jsx("test-file.coffee"),
        transform.jsx.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.jsx("test-file.png"),
        transform.jsx.image("test-file.png")
      );
      assert.strictEqual(
        transform.jsx("test-file.gif"),
        transform.jsx.image("test-file.gif")
      );
      assert.strictEqual(
        transform.jsx("test-file.jpg"),
        transform.jsx.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.jsx("test-file.jpeg"),
        transform.jsx.image("test-file.jpeg")
      );
    });
  });

  describe("jade as target", () => {
    it("should transform css to a jade link tag", () => {
      assert.strictEqual(typeof transform.jade.css, "function");
      assert.strictEqual(
        transform.jade.css("test-file.css"),
        'link(rel="stylesheet", href="test-file.css")'
      );
    });

    it("should transform jade to a jade include tag", () => {
      assert.strictEqual(typeof transform.jade.jade, "function");
      assert.strictEqual(
        transform.jade.jade("test-file.jade"),
        "include test-file.jade"
      );
    });

    it("should transform html to a link tag", () => {
      assert.strictEqual(typeof transform.jade.html, "function");
      assert.strictEqual(
        transform.jade.html("test-file.html"),
        'link(rel="import", href="test-file.html")'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.jade.js, "function");
      assert.strictEqual(
        transform.jade.js("test-file.js"),
        'script(src="test-file.js")'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.jade.coffee, "function");
      assert.strictEqual(
        transform.jade.coffee("test-file.coffee"),
        'script(type="text/coffeescript", src="test-file.coffee")'
      );
    });

    it("should transform an image to an img tag", () => {
      assert.strictEqual(typeof transform.jade.image, "function");
      assert.strictEqual(
        transform.jade.image("test-file.png"),
        'img(src="test-file.png")'
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.css"),
        transform.jade.css("test-file.css")
      );
    });

    it("should use the jade transformer for jade files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.jade"),
        transform.jade.jade("test-file.jade")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.html"),
        transform.jade.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.js"),
        transform.jade.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.coffee"),
        transform.jade.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.jade("test-file.png"),
        transform.jade.image("test-file.png")
      );
      assert.strictEqual(
        transform.jade("test-file.gif"),
        transform.jade.image("test-file.gif")
      );
      assert.strictEqual(
        transform.jade("test-file.jpg"),
        transform.jade.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.jade("test-file.jpeg"),
        transform.jade.image("test-file.jpeg")
      );
    });
  });

  describe("pug as target", () => {
    it("should transform css to a pug link tag", () => {
      assert.strictEqual(typeof transform.pug.css, "function");
      assert.strictEqual(
        transform.pug.css("test-file.css"),
        'link(rel="stylesheet", href="test-file.css")'
      );
    });

    it("should transform pug to a pug include tag", () => {
      assert.strictEqual(typeof transform.pug.pug, "function");
      assert.strictEqual(
        transform.pug.pug("test-file.pug"),
        "include test-file.pug"
      );
    });

    it("should transform html to a link tag", () => {
      assert.strictEqual(typeof transform.pug.html, "function");
      assert.strictEqual(
        transform.pug.html("test-file.html"),
        'link(rel="import", href="test-file.html")'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.pug.js, "function");
      assert.strictEqual(
        transform.pug.js("test-file.js"),
        'script(src="test-file.js")'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.pug.coffee, "function");
      assert.strictEqual(
        transform.pug.coffee("test-file.coffee"),
        'script(type="text/coffeescript", src="test-file.coffee")'
      );
    });

    it("should transform an image to an img tag", () => {
      assert.strictEqual(typeof transform.pug.image, "function");
      assert.strictEqual(
        transform.pug.image("test-file.png"),
        'img(src="test-file.png")'
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.css"),
        transform.pug.css("test-file.css")
      );
    });

    it("should use the pug transformer for pug files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.pug"),
        transform.pug.pug("test-file.pug")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.html"),
        transform.pug.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.js"),
        transform.pug.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.coffee"),
        transform.pug.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.pug("test-file.png"),
        transform.pug.image("test-file.png")
      );
      assert.strictEqual(
        transform.pug("test-file.gif"),
        transform.pug.image("test-file.gif")
      );
      assert.strictEqual(
        transform.pug("test-file.jpg"),
        transform.pug.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.pug("test-file.jpeg"),
        transform.pug.image("test-file.jpeg")
      );
    });
  });

  describe("slm as target", () => {
    it("should transform css to a slm link tag", () => {
      assert.strictEqual(typeof transform.slm.css, "function");
      assert.strictEqual(
        transform.slm.css("test-file.css"),
        'link rel="stylesheet" href="test-file.css"'
      );
    });

    it("should transform html to a link tag", () => {
      assert.strictEqual(typeof transform.slm.html, "function");
      assert.strictEqual(
        transform.slm.html("test-file.html"),
        'link rel="import" href="test-file.html"'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.slm.js, "function");
      assert.strictEqual(
        transform.slm.js("test-file.js"),
        'script src="test-file.js"'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.slm.coffee, "function");
      assert.strictEqual(
        transform.slm.coffee("test-file.coffee"),
        'script type="text/coffeescript" src="test-file.coffee"'
      );
    });

    it("should transform an image to an img tag", () => {
      assert.strictEqual(typeof transform.slm.image, "function");
      assert.strictEqual(
        transform.slm.image("test-file.png"),
        'img src="test-file.png"'
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.slm("test-file.css"),
        transform.slm.css("test-file.css")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.slm("test-file.html"),
        transform.slm.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.slm("test-file.js"),
        transform.slm.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.slm("test-file.coffee"),
        transform.slm.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.slm("test-file.png"),
        transform.slm.image("test-file.png")
      );
      assert.strictEqual(
        transform.slm("test-file.gif"),
        transform.slm.image("test-file.gif")
      );
      assert.strictEqual(
        transform.slm("test-file.jpg"),
        transform.slm.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.slm("test-file.jpeg"),
        transform.slm.image("test-file.jpeg")
      );
    });
  });

  describe("haml as target", () => {
    it("should transform css to a haml link tag", () => {
      assert.strictEqual(typeof transform.haml.css, "function");
      assert.strictEqual(
        transform.haml.css("test-file.css"),
        '%link{rel:"stylesheet", href:"test-file.css"}'
      );
    });

    it("should transform html to a link tag", () => {
      assert.strictEqual(typeof transform.haml.html, "function");
      assert.strictEqual(
        transform.haml.html("test-file.html"),
        '%link{rel:"import", href:"test-file.html"}'
      );
    });

    it("should transform javascript to a script tag", () => {
      assert.strictEqual(typeof transform.haml.js, "function");
      assert.strictEqual(
        transform.haml.js("test-file.js"),
        '%script{src:"test-file.js"}'
      );
    });

    it("should transform coffeescript to a script tag", () => {
      assert.strictEqual(typeof transform.haml.coffee, "function");
      assert.strictEqual(
        transform.haml.coffee("test-file.coffee"),
        '%script{type:"text/coffeescript", src:"test-file.coffee"}'
      );
    });

    it("should transform an image to an img tag", () => {
      assert.strictEqual(typeof transform.haml.image, "function");
      assert.strictEqual(
        transform.haml.image("test-file.png"),
        '%img{src:"test-file.png"}'
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.haml("test-file.css"),
        transform.haml.css("test-file.css")
      );
    });

    it("should use the html transformer for html files automatically", () => {
      assert.strictEqual(
        transform.haml("test-file.html"),
        transform.haml.html("test-file.html")
      );
    });

    it("should use the js transformer for js files automatically", () => {
      assert.strictEqual(
        transform.haml("test-file.js"),
        transform.haml.js("test-file.js")
      );
    });

    it("should use the coffee transformer for coffee files automatically", () => {
      assert.strictEqual(
        transform.haml("test-file.coffee"),
        transform.haml.coffee("test-file.coffee")
      );
    });

    it("should use the image transformer for png, gif, jpg and jpeg files automatically", () => {
      assert.strictEqual(
        transform.haml("test-file.png"),
        transform.haml.image("test-file.png")
      );
      assert.strictEqual(
        transform.haml("test-file.gif"),
        transform.haml.image("test-file.gif")
      );
      assert.strictEqual(
        transform.haml("test-file.jpg"),
        transform.haml.image("test-file.jpg")
      );
      assert.strictEqual(
        transform.haml("test-file.jpeg"),
        transform.haml.image("test-file.jpeg")
      );
    });
  });

  describe("less as target", () => {
    it("should transform less to an import tag", () => {
      assert.strictEqual(typeof transform.less.css, "function");
      assert.strictEqual(
        transform.less.css("test-file.css"),
        '@import "test-file.css";'
      );
    });

    it("should transform css to an import tag", () => {
      assert.strictEqual(typeof transform.less.less, "function");
      assert.strictEqual(
        transform.less.less("test-file.less"),
        '@import "test-file.less";'
      );
    });

    it("should use the less transformer for less files automatically", () => {
      assert.strictEqual(
        transform.less("test-file.less"),
        transform.less.less("test-file.less")
      );
    });

    it("should use the css transformer for css files automatically", () => {
      assert.strictEqual(
        transform.less("test-file.css"),
        transform.less.css("test-file.css")
      );
    });
  });

  describe("sass as target", () => {
    it("should transform sass to an import tag", () => {
      assert.strictEqual(typeof transform.sass.sass, "function");
      assert.strictEqual(
        transform.sass.sass("test-file.sass"),
        '@import "test-file.sass"'
      );
    });

    it("should transform scss to an import tag", () => {
      assert.strictEqual(typeof transform.sass.scss, "function");
      assert.strictEqual(
        transform.sass.scss("test-file.scss"),
        '@import "test-file.scss"'
      );
    });

    it("should transform css to an import tag", () => {
      assert.strictEqual(typeof transform.sass.css, "function");
      assert.strictEqual(
        transform.sass.css("test-file.css"),
        '@import "test-file.css"'
      );
    });

    it("should use the sass transformer for sass files automatically", () => {
      assert.strictEqual(
        transform.sass("test-file.sass"),
        transform.sass.sass("test-file.sass")
      );
    });

    it("should use the sass transformer for scss files automatically", () => {
      assert.strictEqual(
        transform.sass("test-file.scss"),
        transform.sass.scss("test-file.scss")
      );
    });

    it("should use the sass transformer for css files automatically", () => {
      assert.strictEqual(
        transform.sass("test-file.css"),
        transform.sass.css("test-file.css")
      );
    });
  });

  describe("scss as target", () => {
    it("should transform sass to an import tag", () => {
      assert.strictEqual(typeof transform.scss.sass, "function");
      assert.strictEqual(
        transform.scss.sass("test-file.sass"),
        '@import "test-file.sass";'
      );
    });

    it("should transform scss to an import tag", () => {
      assert.strictEqual(typeof transform.scss.scss, "function");
      assert.strictEqual(
        transform.scss.scss("test-file.scss"),
        '@import "test-file.scss";'
      );
    });

    it("should transform css to an import tag", () => {
      assert.strictEqual(typeof transform.scss.css, "function");
      assert.strictEqual(
        transform.scss.css("test-file.css"),
        '@import "test-file.css";'
      );
    });

    it("should use the scss transformer for sass files automatically", () => {
      assert.strictEqual(
        transform.scss("test-file.sass"),
        transform.scss.sass("test-file.sass")
      );
    });

    it("should use the scss transformer for scss files automatically", () => {
      assert.strictEqual(
        transform.scss("test-file.scss"),
        transform.scss.scss("test-file.scss")
      );
    });

    it("should use the scss transformer for css files automatically", () => {
      assert.strictEqual(
        transform.scss("test-file.css"),
        transform.scss.css("test-file.css")
      );
    });
  });

  it("should pick the correct target transformer for html targets", () => {
    const targetFile = fixture("index.html");
    const sourceFile = fixture("style.css");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.html.css(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for jsx targets", () => {
    const targetFile = fixture("app.jsx");
    const sourceFile = fixture("app.js");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.jsx.js(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for jade targets", () => {
    const targetFile = fixture("index.jade");
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.jade.image(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for pug targets", () => {
    const targetFile = fixture("index.pug");
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.pug.image(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for slm targets", () => {
    const targetFile = fixture("index.slm");
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.slm.image(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for haml targets", () => {
    const targetFile = fixture("index.haml");
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.haml.image(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for less targets", () => {
    const targetFile = fixture("index.less");
    const sourceFile = fixture("test-file.less");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.less.less(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for sass targets", () => {
    const targetFile = fixture("index.sass");
    const sourceFile = fixture("test-file.sass");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.sass.sass(sourceFile.path)
    );
  });

  it("should pick the correct target transformer for scss targets", () => {
    const targetFile = fixture("index.scss");
    const sourceFile = fixture("test-file.scss");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.scss.scss(sourceFile.path)
    );
  });

  it("should default to the html target transformer for other files", () => {
    const targetFile = fixture("plain.txt");
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile, targetFile),
      transform.html.image(sourceFile.path)
    );
  });

  it("should default to the html target transformer for unknown files", () => {
    const sourceFile = fixture("image.gif");
    assert.strictEqual(
      transform(sourceFile.path, null, null, sourceFile),
      transform.html.image(sourceFile.path)
    );
  });
});
