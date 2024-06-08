#!/usr/bin/env node
const fs = require('fs');
const { spawn } = require('child_process');
const { changeDate } = require('./change-date');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const folder = argv.f;

function encodeFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.includes('.MP4')) {
      resolve();
      return;
    }

    const dest = `${folder}/${file.replace('.MP4', '.mov')}`; // Ensure the extension is case-insensitive
    const ffmpegArgs = ['-i', `${folder}/${file}`, '-c:v', 'hevc_videotoolbox', '-tag:v', 'hvc1', '-quality:v', 'high', dest];

    const process = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

    process.on('close', async (code) => {
      if (code === 0) {
        await changeDate(folder, file);
        console.log(`🎉 ${file} has been converted to HEVC @ ${dest}`);
        resolve();
      } else {
        reject(new Error(`Encoding failed for ${file} with exit code ${code}`));
      }
    });
  });
}

async function encode() {
  try {
    const files = fs.readdirSync(folder);
    const tasks = files.map(file => () => encodeFile(file));

    for (let i = 0; i < tasks.length; i += 4) {
      await Promise.all(tasks.slice(i, i + 4).map(task => task()));
    }

  } catch (err) {
    console.error('Error processing files:', err);
  }
}

encode();
