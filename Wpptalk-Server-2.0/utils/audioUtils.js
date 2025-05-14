// utils/audioUtils.js
import ffmpeg from 'fluent-ffmpeg';

export function getAudioDurationInSeconds(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration); // em segundos
    });
  });
}
