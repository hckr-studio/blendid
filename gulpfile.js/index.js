/*
  gulpfile.js
  ===========
  Rather than manage one giant configuration file responsible
  for creating multiple tasks, each task has been broken out into
  its own file in gulpfile.js/tasks. Any files in that directory get
  automatically required below.
*/

const gulp = require('gulp');
const requireDir = require('require-dir');

// Globally expose config objects
global.PATH_CONFIG = require('./lib/get-path-config');
global.TASK_CONFIG = require('./lib/get-task-config');

// Require all tasks in gulpfile.js/tasks, including subfolders
requireDir('./tasks', { recurse: true });

// Initialize any additional user-provided tasks
TASK_CONFIG.additionalTasks.initialize(gulp, PATH_CONFIG, TASK_CONFIG);
