const gulp = require("gulp");
const rev = require("gulp-rev");
const revdel = require("gulp-rev-delete-original");
const projectPath = require("../../lib/projectPath");

// 1) Add md5 hashes to assets referenced by CSS and JS files
gulp.task("rev-assets", function() {
  // Ignore files that may reference assets. We'll rev them next.
  const ignoreThese =
    "!" + projectPath(PATH_CONFIG.dest, "**/*+(css|js|map|json|html)");

  return gulp
    .src([projectPath(PATH_CONFIG.dest, "**/*"), ignoreThese])
    .pipe(rev())
    .pipe(gulp.dest(projectPath(PATH_CONFIG.dest)))
    .pipe(revdel())
    .pipe(
      rev.manifest(projectPath(PATH_CONFIG.dest, "rev-manifest.json"), {
        merge: true
      })
    )
    .pipe(gulp.dest("."));
});
