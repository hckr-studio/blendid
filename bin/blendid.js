#!/usr/bin/env node
const path = require("path");
const childProcess = require("child_process");

const blendidEntryDir = path.resolve(__dirname, "../gulpfile.js/index.mjs");
const gulpModulePath = path.dirname(require.resolve("gulp"));
const gulpBinaryFile = path.join(gulpModulePath, "/bin/gulp");

const gulp = childProcess.fork(gulpBinaryFile, [
  "--cwd",
  process.cwd(),
  "--gulpfile",
  blendidEntryDir,
  ...process.argv.slice(2)
]);

gulp.on("exit", (code) => {
  process.exit(code);
});
