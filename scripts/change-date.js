#!/usr/bin/env node
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

function changeDate(root, file) {
  const movVersion = file.replace('.MP4', '.mov');
  return exec(`touch -r '${root}/${file}' '${root}/${movVersion}'`);
}

module.exports = {
  changeDate
} 