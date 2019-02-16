if (!TASK_CONFIG.stylesheets) return;

const gulp = require("gulp");
const gulpif = require("gulp-if");
const browserSync = require("browser-sync");
const sass = require("gulp-sass");
const sourcemaps = require("gulp-sourcemaps");
const handleErrors = require("../lib/handleErrors");
const autoprefixer = require("gulp-autoprefixer");
const projectPath = require("../lib/projectPath");
const cssnano = require("gulp-cssnano");

const sassTask = function () {
  const paths = {
    src: projectPath(
      PATH_CONFIG.src,
      PATH_CONFIG.stylesheets.src,
      "**/*.{" + TASK_CONFIG.stylesheets.extensions + "}"
    ),
    dest: projectPath(PATH_CONFIG.dest, PATH_CONFIG.stylesheets.dest)
  };

  if (
    TASK_CONFIG.stylesheets.sass &&
    TASK_CONFIG.stylesheets.sass.includePaths
  ) {
    TASK_CONFIG.stylesheets.sass.includePaths = TASK_CONFIG.stylesheets.sass.includePaths.map(
      function (includePath) {
        return projectPath(includePath);
      }
    );
  }

  const cssnanoConfig = TASK_CONFIG.stylesheets.cssnano || {};
  cssnanoConfig.autoprefixer = false; // this should always be false, since we're autoprefixing separately

  return gulp
    .src(paths.src)
    .pipe(gulpif(!global.production, sourcemaps.init()))
    .pipe(sass(TASK_CONFIG.stylesheets.sass))
    .on("error", handleErrors)
    .pipe(autoprefixer(TASK_CONFIG.stylesheets.autoprefixer))
    .pipe(gulpif(global.production, cssnano(cssnanoConfig)))
    .pipe(gulpif(!global.production, sourcemaps.write()))
    .pipe(gulp.dest(paths.dest))
    .pipe(browserSync.stream());
};

const { alternateTask = () => sassTask } = TASK_CONFIG.stylesheets;
const stylesheetsTask = alternateTask(gulp, PATH_CONFIG, TASK_CONFIG);

gulp.task("stylesheets", stylesheetsTask);
module.exports = stylesheetsTask;
