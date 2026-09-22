import path from "node:path";

export function extname(file) {
  file = file.split("?")[0];
  return path.extname(file).slice(1);
}

/**
 * Constants
 */
const TARGET_TYPES = [
  "html",
  "jade",
  "pug",
  "slm",
  "slim",
  "jsx",
  "haml",
  "less",
  "sass",
  "scss",
  "twig"
];
const IMAGES = ["jpeg", "jpg", "png", "gif"];
const DEFAULT_TARGET = TARGET_TYPES[0];

/**
 * Transform module
 */
export function transform(filepath, i, length, sourceFile, targetFile) {
  let type;
  if (targetFile?.path) {
    const ext = extname(targetFile.path);
    type = typeFromExt(ext);
  }
  if (!isTargetType(type)) {
    type = DEFAULT_TARGET;
  }
  const func = transform[type];
  if (func) {
    return func.apply(transform, arguments);
  }
}

/**
 * Options
 */

transform.selfClosingTag = false;

/**
 * Transform functions
 */
TARGET_TYPES.forEach((targetType) => {
  transform[targetType] = function (filepath) {
    const ext = extname(filepath);
    const type = typeFromExt(ext);
    const func = transform[targetType][type];
    if (func) {
      return func.apply(transform[targetType], arguments);
    }
  };
});

transform.html.css = (filepath) =>
  `<link rel="stylesheet" href="${filepath}"${end()}`;

transform.html.js = (filepath) => `<script src="${filepath}"></script>`;
transform.html.map = transform.html.js;

transform.html.jsx = (filepath) =>
  `<script type="text/jsx" src="${filepath}"></script>`;

transform.html.html = (filepath) =>
  `<link rel="import" href="${filepath}"${end()}`;

transform.html.coffee = (filepath) =>
  `<script type="text/coffeescript" src="${filepath}"></script>`;

transform.html.image = (filepath) => `<img src="${filepath}"${end()}`;

transform.jade.css = (filepath) => `link(rel="stylesheet", href="${filepath}")`;

transform.jade.js = (filepath) => `script(src="${filepath}")`;

transform.jade.jsx = (filepath) => `script(type="text/jsx", src="${filepath}")`;

transform.jade.jade = (filepath) => `include ${filepath}`;

transform.jade.html = (filepath) => `link(rel="import", href="${filepath}")`;

transform.jade.coffee = (filepath) =>
  `script(type="text/coffeescript", src="${filepath}")`;

transform.jade.image = (filepath) => `img(src="${filepath}")`;

transform.pug.css = (filepath) => `link(rel="stylesheet", href="${filepath}")`;

transform.pug.js = (filepath) => `script(src="${filepath}")`;

transform.pug.jsx = (filepath) => `script(type="text/jsx", src="${filepath}")`;

transform.pug.pug = (filepath) => `include ${filepath}`;

transform.pug.html = (filepath) => `link(rel="import", href="${filepath}")`;

transform.pug.coffee = (filepath) =>
  `script(type="text/coffeescript", src="${filepath}")`;

transform.pug.image = (filepath) => `img(src="${filepath}")`;

transform.slm.css = (filepath) => `link rel="stylesheet" href="${filepath}"`;

transform.slm.js = (filepath) => `script src="${filepath}"`;

transform.slm.html = (filepath) => `link rel="import" href="${filepath}"`;

transform.slm.coffee = (filepath) =>
  `script type="text/coffeescript" src="${filepath}"`;

transform.slm.image = (filepath) => `img src="${filepath}"`;

transform.slim.css = transform.slm.css;
transform.slim.js = transform.slm.js;
transform.slim.html = transform.slm.html;
transform.slim.coffee = transform.slm.coffee;
transform.slim.image = transform.slm.image;

transform.haml.css = (filepath) =>
  `%link{rel:"stylesheet", href:"${filepath}"}`;

transform.haml.js = (filepath) => `%script{src:"${filepath}"}`;

transform.haml.html = (filepath) => `%link{rel:"import", href:"${filepath}"}`;

transform.haml.coffee = (filepath) =>
  `%script{type:"text/coffeescript", src:"${filepath}"}`;

transform.haml.image = (filepath) => `%img{src:"${filepath}"}`;

transform.less.less = (filepath) => `@import "${filepath}";`;

transform.less.css = transform.less.less;

transform.sass.sass = (filepath) => `@import "${filepath}"`;

transform.sass.scss = transform.sass.sass;
transform.sass.css = transform.sass.sass;

transform.scss.sass = transform.less.less;
transform.scss.scss = transform.scss.sass;
transform.scss.css = transform.scss.sass;

transform.twig.css = (filepath) =>
  `<link rel="stylesheet" href="{{ asset("${filepath}") }}"${end()}`;

transform.twig.js = (filepath) =>
  `<script src="{{ asset("${filepath}") }}"></script>`;

/**
 * Transformations for jsx is like html
 * but always with self closing tags, invalid jsx otherwise
 */
Object.keys(transform.html).forEach((type) => {
  transform.jsx[type] = (...args) => {
    const originalOption = transform.selfClosingTag;
    transform.selfClosingTag = true;
    const result = transform.html[type].apply(transform.html, args);
    transform.selfClosingTag = originalOption;
    return result;
  };
});

function end() {
  return transform.selfClosingTag ? " />" : ">";
}

function typeFromExt(ext) {
  ext = ext.toLowerCase();
  if (isImage(ext)) {
    return "image";
  }
  return ext;
}

function isImage(ext) {
  return IMAGES.includes(ext);
}

function isTargetType(type) {
  if (!type) {
    return false;
  }
  return TARGET_TYPES.includes(type);
}
