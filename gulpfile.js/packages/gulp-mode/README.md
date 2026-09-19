# node-gulp-mode

A gulp plugin for identifying build mode.

[![Circle CI](https://circleci.com/gh/CODEYA/node-gulp-mode/tree/master.svg?style=svg)](https://circleci.com/gh/CODEYA/node-gulp-mode/tree/master)
[![npm version](https://badge.fury.io/js/gulp-mode.svg)](http://badge.fury.io/js/gulp-mode)
[![npm downloads](https://img.shields.io/npm/dm/gulp-mode.svg)](https://img.shields.io/npm/dm/gulp-mode.svg)
[![npm license](https://img.shields.io/npm/l/gulp-mode.svg)](https://img.shields.io/npm/l/gulp-mode.svg)
[![Dependency Status](https://gemnasium.com/CODEYA/node-gulp-mode.svg)](https://gemnasium.com/CODEYA/node-gulp-mode)

# Install

With [npm](https://www.npmjs.com/) do:

```bash
$ npm install --save-dev gulp-mode
```

# Usage

```javascript
var gulp = require('gulp');
var mode = require('gulp-mode')();
var uglify = require('gulp-uglify');

gulp.task('default', function() {
  gulp.src('src/*.js')
      .pipe(mode.production(uglify()))
      .pipe(gulp.dest('dist'));
});
```

To specify mode

```bash
% gulp --production
```

or

```bash
% NODE_ENV=production gulp
```

# API

## Construct

```javascript
var mode = require('gulp-mode')([*options*]);
```

**Options:**

| name        | type    | description                           | default value                 |
|-------------|---------|---------------------------------------|-------------------------------|
| modes       | array   | List of mode name.                    | ["production", "development"] |
| default     | string  | Default mode. Must be in the `modes`. | "development"                 |
| verbose     | boolean | Show verbose messages.                | false                         |

Example:

```javascript
var mode = require('gulp-mode')({
  modes: ["production", "development"],
  default: "development",
  verbose: false
});
```

## Evaluate the mode

To evaluate the mode,

```javaScript
mode.<mode name>(callback)
```

Example:

```javascript
gulp.src('src/*.js')
    .pipe(mode.production(uglify()))
    .pipe(gulp.dest('dist'));
```

## Get current mode

To get current mode as boolean

```javascript
mode.<mode name>();
```

Example:

```javascript
var isProduction = mode.production();
if(isProduction) {
  console.log("Production mode");
}
```
