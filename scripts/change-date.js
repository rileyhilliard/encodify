#!/usr/bin/env node
const util = require("node:util");
const fs = require("node:fs");
const { spawn } = require("child_process");

const exec = util.promisify(require("node:child_process").exec);

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

module.exports = {
  changeDate,
};
