const gulp = require("gulp");
const rev = require("gulp-rev");
const revNapkin = require("gulp-rev-napkin");
const projectPath = require("../../lib/projectPath");

// 3) Rev and compress CSS and JS files (this is done after assets, so that if a
//    referenced asset hash changes, the parent hash will change as well
gulp.task("rev-css", function() {
  return gulp
    .src(projectPath(PATH_CONFIG.dest, "**/*.css"))
    .pipe(rev())
    .pipe(gulp.dest(PATH_CONFIG.dest))
    .pipe(revNapkin({ verbose: false, force: true }))
    .pipe(
      rev.manifest(projectPath(PATH_CONFIG.dest, "rev-manifest.json"), {
        merge: true
      })
    )
    .pipe(gulp.dest(""));
});
