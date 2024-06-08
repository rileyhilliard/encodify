#!/usr/bin/env node
const fs = require("fs");
const { spawn } = require("child_process");
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);

const argv = require("yargs/yargs")(process.argv.slice(2)).argv;
const folder = argv.f;

function changeDate(root, file) {
  const movVersion = file.replace(".MP4", ".mov");
  const originalFile = `${root}/${file}`;
  const convertedFile = `${root}/${movVersion}`;

  // Get the original file's creation date
  const originalDate = fs.statSync(originalFile).birthtime;
  const formattedDate = originalDate.toISOString();

  return new Promise((resolve, reject) => {
    const exiftool = spawn("exiftool", [
      "-TagsFromFile",
      originalFile,
      "-all:all>all:all",
      "-overwrite_original",
      `-api`,
      `QuickTimeUTC`,
      `-CreateDate=${formattedDate}`,
      convertedFile,
    ]);

    exiftool.on("close", (code) => {
      if (code === 0) {
        console.log(
          `Metadata copied and 'Media Create Date' set for ${movVersion}`
        );
        resolve();
      } else {
        reject(
          new Error(
            `Failed to copy metadata and set 'Media Create Date' for ${movVersion}`
          )
        );
      }
    });
  }).then(() => {
    const formattedDate2 = new Date(originalDate).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return exec(
      `SetFile -d "${formattedDate2}" -m "${formattedDate2}" '${root}/${movVersion}'`
    );
  });
}

function encodeFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.includes(".MP4")) {
      resolve();
      return;
    }

    const dest = `${folder}/${file.replace("MP4", "mov")}`;
    const process = spawn(
      "avconvert",
      [
        "-p",
        "PresetHEVCHighestQuality",
        "-s",
        `${folder}/${file}`,
        "-o",
        dest,
        "-prog",
      ],
      { stdio: "inherit" }
    );

    process.on("close", async (code) => {
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
    const tasks = files.map((file) => () => encodeFile(file));

    for (let i = 0; i < tasks.length; i += 4) {
      await Promise.all(tasks.slice(i, i + 4).map((task) => task()));
    }
  } catch (err) {
    console.error("Error processing files:", err);
  }
}

encode();
