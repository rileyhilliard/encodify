#!/usr/bin/env node
const util = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("child_process");
const exec = util.promisify(require("node:child_process").exec);
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "change-date-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

async function changeDate(originalFile, file) {
  try {
    const originalDate = fs.statSync(originalFile).birthtime;
    const formattedDate = originalDate.toISOString();

    await new Promise((resolve, reject) => {
      const exiftool = spawn("exiftool", [
        "-TagsFromFile",
        originalFile,
        "-all:all>all:all",
        "-overwrite_original",
        `-api`,
        `QuickTimeUTC`,
        `-CreateDate=${formattedDate}`,
        file,
      ]);

      exiftool.on("close", (code) => {
        if (code === 0) {
          logger.info(
            `\nMetadata copied and 'Media Create Date' set for ${file}`
          );
          resolve();
        } else {
          const errorMessage = `Failed to copy metadata and set 'Media Create Date' for ${file}`;
          logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });

    const formattedDate2 = new Date(originalDate).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const setFileCommand =
      process.platform === "darwin"
        ? `SetFile -d "${formattedDate2}" -m "${formattedDate2}" "${file}"`
        : `touch -d "${formattedDate2}" "${file}"`;

    await exec(setFileCommand);
  } catch (error) {
    logger.error(`Error changing date for file ${file}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  changeDate,
};
