# Encode and Change Date

This project provides a script to encode all `.MP4` files in a specified folder to HVEC (H.265) format and change the creation date of the encoded files to match the creation date of the original `.MP4` files.

![](https://i.ibb.co/qrJ5fvr/demo.gif)

## Motivation

Raw video recordings from high-end DSLR cameras, such as Canon, produce huge file sizes. For example, a 10-minute 1080p video can be around 5GB in size. To efficiently store these videos, it becomes important to compress them to avoid using an unnecessary amount of storage space.

However, when transcoding files with typical transcoding scripts or software, the newly created file does not inherit the metadata from the original source file. This means that important information, such as the shoot date of the video, is changed to the day the transcode was performed.

For home videos, preserving the original shoot date is crucial, especially when using platforms like Google Photos to store them. If the shoot date is lost, the video will appear in the wrong place (from a time perspective) in the Google Photos feed, making it difficult to organize and find specific memories.

This script solves both these issues by:

1. Compressing the video size, significantly reducing storage requirements while balancing quality.
2. Preserving the video file metadata, including the creation date, ensuring that the videos maintain their correct timeline and organization in platforms like Google Photos.

## Features

- Encodes `.MP4` files to HVEC (H.265) format using FFmpeg
- Preserves the original creation date of the `.MP4` files in the encoded files
- Supports concurrent encoding of multiple files
- Provides progress bars for each encoding process
- Logs encoding progress and errors

## Prerequisites

Before running the script, ensure that you have the following dependencies installed:

- Node.js (version 22 or above)
- FFmpeg (version 7.0 or above)
- ExifTool

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/encode-and-change-date.git
```

2. Navigate to the project directory:

```bash
cd encode-and-change-date
```

3. Install the required Node.js packages:

```bash
yarn install
```

## Usage

To transcode .MP4 files in a folder from x264 to x265 (HVEC) and change the creation date & metadata of the new transcoded file to the original source file, run the following command:

```bash
node scripts/ffmpeg.js -f <path/to/folder>
```

Replace <path/to/folder> with the actual path to the folder containing the .MP4 files you want to encode.
Example:

```bash
node scripts/ffmpeg.js -f /Users/rileyhilliard/Videos/home-videos
```

The script will encode all .MP4 files in the specified folder to HVEC format and change their creation date to match the original .MP4 files. The encoded files will have the same name as the original files but with `<fileName>-encoded.mp4` added to to the newly created file.

## Configuration

The script uses the following default configuration:

- **Encoding preset**: medium
- **Constant Rate Factor (CRF)**: 23
- **Pixel format**: yuv420p
- **Audio codec**: copy (no re-encoding)

You can modify these settings by editing the ffmpeg command arguments in the scripts/ffmpeg.js file.

## Logging

The script logs encoding progress and errors to the following files:

- `error.log`: Contains error messages
- `combined.log`: Contains all log messages

The log files are generated in the project directory.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.
