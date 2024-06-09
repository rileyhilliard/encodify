#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { changeDate } = require("./change-date");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const MultiProgress = require("multi-progress");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "encode-service" },
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

const argv = yargs(hideBin(process.argv)).option("folder", {
  alias: "f",
  describe: "Folder path",
  demandOption: true,
  type: "string",
}).argv;

const folder = argv.folder;

async function encodeFile(file, index, progress) {
  try {
    if (!file.includes(".MP4")) {
      return;
    }

    const dest = path.join(folder, file.replace("MP4", "mp4"));

    if (fs.existsSync(dest)) {
      logger.warn(`Skipping encoding for ${file} as ${dest} already exists.`);
      return;
    }

    const ffprobe = spawnSync("ffprobe", [
      "-v",
      "quiet",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path.join(folder, file),
    ]);
    const duration = parseFloat(ffprobe.stdout.toString());

    const process = spawn(
      "ffmpeg",
      [
        "-i",
        path.join(folder, file),
        "-c:v",
        "libx265",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "copy",
        "-tag:v",
        "hvc1",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        dest,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const bar = progress.newBar(`[:bar] ${file} :percent | ETA: :etas`, {
      complete: "=",
      incomplete: " ",
      width: 50,
      total: duration,
    });

    process.stderr.on("data", (data) => {
      const str = data.toString().trim();
      const match = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const milliseconds = parseInt(match[4], 10) * 10;
        const currentTime =
          hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
        const percentage = currentTime / bar.total;
        bar.update(percentage);
      }
    });

    await new Promise((resolve, reject) => {
      process.on("close", async (code) => {
        if (code === 0) {
          bar.update(1);
          await changeDate(folder, file);
          resolve();
        } else {
          const errorMessage = `Encoding failed for ${file} with exit code ${code}`;
          logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  } catch (error) {
    logger.error(`Error encoding file ${file}: ${error.message}`);
    throw error;
  }
}

async function encode() {
  try {
    const files = fs.readdirSync(folder);
    const progress = new MultiProgress(process.stderr);
    const tasks = files.map(
      (file, index) => () => encodeFile(file, index, progress)
    );

    const concurrentTasks = process.env.CONCURRENT_TASKS || 1;
    const runningTasks = new Set();

    const runTask = async (task) => {
      runningTasks.add(task);
      await task();
      runningTasks.delete(task);

      if (tasks.length > 0) {
        const nextTask = tasks.shift();
        await runTask(nextTask);
      }
    };

    const initialTasks = tasks.splice(0, concurrentTasks);
    await Promise.all(initialTasks.map(runTask));

    while (runningTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info("All file conversions completed.");
  } catch (err) {
    logger.error(`Error processing files: ${err.message}`);
    process.exit(1);
  }
}

encode();
