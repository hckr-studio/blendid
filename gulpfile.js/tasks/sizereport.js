const { src, task } = require("gulp");
const sizereport = require("gulp-sizereport");
const projectPath = require("../lib/projectPath");

task("size-report", () =>
  src([projectPath(PATH_CONFIG.dest, "**/*"), "*!rev-manifest.json"]).pipe(
    sizereport({ gzip: true })
  )
);
