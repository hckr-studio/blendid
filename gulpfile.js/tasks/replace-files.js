const gulp = require("gulp");
const fs = require("fs-extra");
const del = require("del");
const projectPath = require("../lib/projectPath");

const replaceFiles = function(cb) {
  const temp = projectPath(PATH_CONFIG.dest);
  const dest = projectPath(PATH_CONFIG.finalDest);
  const delPatterns =
    TASK_CONFIG.clean && TASK_CONFIG.clean.patterns
      ? TASK_CONFIG.clean.patterns
      : dest;

  del.sync(delPatterns, { force: true });
  fs.copySync(temp, dest);
  del.sync(temp, { force: true });

  cb();
};

gulp.task("replaceFiles", replaceFiles);

module.exports = replaceFiles;
