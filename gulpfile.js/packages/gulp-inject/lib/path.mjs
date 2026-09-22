import path from "node:path";

export default function getFilepath(sourceFile, targetFile, opt) {
  opt = opt || {};
  const ignorePath = Array.isArray(opt.ignorePath)
    ? opt.ignorePath
    : [opt.ignorePath].filter(Boolean);
  const base = opt.relative
    ? path.dirname(addRootSlash(unixify(targetFile.path)))
    : addRootSlash(unixify(sourceFile.cwd));

  let filepath = unixify(
    path.relative(base, addRootSlash(unixify(sourceFile.path)))
  );

  if (ignorePath.length) {
    filepath = removeBasePath(ignorePath, filepath);
  }

  if (opt.addPrefix) {
    filepath = addPrefix(filepath, opt.addPrefix);
  }

  if (opt.addRootSlash) {
    filepath = addRootSlash(filepath);
  } else if (!opt.addPrefix) {
    filepath = removeRootSlash(filepath);
  }

  if (opt.addSuffix) {
    filepath = addSuffix(filepath, opt.addSuffix);
  }

  return filepath;
}

function unixify(filepath) {
  return filepath.replace(/\\/g, "/");
}
function addRootSlash(filepath) {
  return filepath.replace(/^\/*([^/])/, "/$1");
}
function removeRootSlash(filepath) {
  return filepath.replace(/^\/+/, "");
}
function addPrefix(filepath, prefix) {
  return prefix + addRootSlash(filepath);
}
function addSuffix(filepath, suffix) {
  return filepath + suffix;
}

function removeBasePath(basedirs, filepath) {
  return basedirs.map(unixify).reduce((path, remove) => {
    if (path[0] === "/" && remove[0] !== "/") {
      remove = `/${remove}`;
    }
    if (path[0] !== "/" && remove[0] === "/") {
      path = `/${path}`;
    }
    if (remove && path.indexOf(remove) === 0) {
      return path.slice(remove.length);
    }
    return path;
  }, filepath);
}
