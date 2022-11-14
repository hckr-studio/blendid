const PluginError = require("plugin-error");
const log = require("fancy-log");
const colors = require("ansi-colors");
const prettifyTime = require("./prettifyTime");
const handleErrors = require("./handleErrors");

module.exports = function (err, stats) {
  if (err) throw new PluginError("webpack", err);

  let statColor = stats.compilation.warnings.length < 1 ? "green" : "yellow";

  if (stats.compilation.errors.length > 0) {
    stats.compilation.errors.forEach(function (error) {
      handleErrors(error);
      statColor = "red";
    });
  } else {
    const compileTime = prettifyTime(stats.endTime - stats.startTime);
    log(colors[statColor](stats));
    log(
      "Compiled with",
      colors.cyan("webpack"),
      "in",
      colors.magenta(compileTime)
    );
  }
};
