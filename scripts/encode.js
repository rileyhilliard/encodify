#!/usr/bin/env node
const fs = require("fs");
const { spawn } = require("child_process");
const { changeDate } = require("./change-date");
const argv = require("yargs/yargs")(process.argv.slice(2)).argv;
const folder = argv.f;
const MultiProgress = require("multi-progress");

function encodeFile(file, index, progress) {
  return new Promise((resolve, reject) => {
    if (!file.includes(".MP4")) {
      resolve();
      return;
    }

    const dest = `${folder}/${file.replace("MP4", "mov")}`;

    // Check if the destination file already exists
    if (fs.existsSync(dest)) {
      console.warn(`Skipping encoding for ${file} as ${dest} already exists.`);
      resolve();
      return;
    }

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
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const bar = progress.newBar(`[:bar] ${file} :percent | ETA: :etas`, {
      complete: "=",
      incomplete: " ",
      width: 50,
      total: 100,
    });

    process.stdout.on("data", (data) => {
      const str = data.toString().trim();
      const progressData = str.replace(/[^0-9.]/g, "");
      const percentage = parseInt(progressData, 10);
      if (!isNaN(percentage)) {
        bar.update(percentage / 100);
      }
    });

    process.stderr.on("data", (data) => {
      const str = data.toString().trim();
      if (str !== "avconvert completed with error:0.") {
        console.error(str);
      }
    });

    process.on("close", async (code) => {
      if (code === 0) {
        bar.update(1);
        await changeDate(path.join(folder, file), dest);
        resolve();
      } else {
        console.error(`Encoding failed for ${file} with exit code ${code}`);
        resolve();
      }
    });
  });
}

async function encode() {
  console.warn(
    "use ffmpeg.js instead of encode.js\n Its slower but does a better compression."
  );
  try {
    const files = fs.readdirSync(folder);
    const progress = new MultiProgress(process.stderr);
    const tasks = files.map(
      (file, index) => () => encodeFile(file, index, progress)
    );

    const concurrentTasks = 2;
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

    console.log("🎉 All file conversions completed.");
  } catch (err) {
    console.error("Error processing files:", err);
  }
}

encode();
