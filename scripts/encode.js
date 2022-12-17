#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const { changeDate } = require('./change-date');
const { argv = {} } = require('yargs/yargs')(process.argv.slice(2));
const folder = argv.f;


async function encode() {
  return new Promise((resolve) => {
    fs.readdir(folder, (err, files) => {
      //handling error
      if (err) return console.log('Unable to scan directory: ' + err);

      files.forEach(async (file) => {
        if (file.includes('.MP4')) {
          const dest = `${folder}/${file.replace('MP4', 'mov')}`;
          await spawnSync(`avconvert`,['-p', 'PresetHEVCHighestQuality', '-s', `${folder}/${file}`, '-o', dest, `-prog`], { stdio: 'inherit' });
          await changeDate(folder, file);
          console.log(`🎉 ${file} has been converted to HVEC @ ${dest}`);
        }
      });

      resolve();
    });
  });
}

encode();