#!/usr/bin/env node
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
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
      "ffmpeg",
      [
        "-i",
        `${folder}/${file}`,
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

    const ffprobe = spawnSync("ffprobe", [
      "-v",
      "quiet",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      `${folder}/${file}`,
    ]);
    const duration = parseFloat(ffprobe.stdout.toString());

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

    process.on("close", async (code) => {
      if (code === 0) {
        bar.update(1);
        await changeDate(folder, file);
        resolve();
      } else {
        console.error(`Encoding failed for ${file} with exit code ${code}`);
        resolve();
      }
    });
  });
}

async function encode() {
  try {
    const files = fs.readdirSync(folder);
    const progress = new MultiProgress(process.stderr);
    const tasks = files.map(
      (file, index) => () => encodeFile(file, index, progress)
    );

    const concurrentTasks = 1;
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
