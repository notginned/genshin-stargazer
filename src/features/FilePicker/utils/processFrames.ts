import { type Frames } from "../../../types/State.type";
import { hashCode } from "../../../utils/hash";
import { log } from "../../../utils/lib";
import { getDiff } from "./getDiff";

const drawFrame = (
  video: HTMLVideoElement,
  mainCanvas: HTMLCanvasElement,
  frames: HTMLCanvasElement[],
  callback?: (time: number) => void,
) => {
  let dt = 0;
  let counter = 0;
  const FPS = 2;
  const speed = video.playbackRate;
  const width = video.videoWidth;
  const height = video.videoHeight;
  mainCanvas.width = width;
  mainCanvas.height = height;
  const mainCtx = mainCanvas.getContext("2d");
  if (mainCtx === null) throw new Error("Couldnt get context");

  const updateCanvas: VideoFrameRequestCallback = (now, _metadata) => {
    const currentTime = now * speed;

    if (currentTime - dt > (1 / FPS) * 1000) {
      log({ ct: video.currentTime, currentTime, dt });
      dt = currentTime;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx === null) throw new Error("Couldnt get context");

      ctx.drawImage(video, 0, 0, width, height);
      mainCtx.drawImage(video, 0, 0, width, height);
      const hash = "v" + hashCode(video.title + counter++);
      canvas.dataset.hash = hash;

      if (callback) callback(currentTime / (video.duration * 1000));

      frames.push(canvas);
    }
    video.requestVideoFrameCallback(updateCanvas);
  };

  video.requestVideoFrameCallback(updateCanvas);
};

const dedupFrames = (
  frames: HTMLCanvasElement[],
  video: HTMLVideoElement,
): Frames => {
  const f = Object.values(frames);
  let L = 0;
  let R = L + 1;
  // Will never happen
  const width = video.videoWidth;
  const height = video.videoHeight;
  const res: HTMLCanvasElement[] = [];

  while (R < f.length) {
    const diff = getDiff(frames[L], frames[R], width, height);
    const diffP = (diff / (width * height)) * 100;

    if (diffP > 0.5) {
      res.push(frames[L]);
    }

    // log(`diff ${R}: ${diffP}%`);
    L++;
    R++;
  }

  // Adding the last frame if its different;
  const diff = getDiff(frames[L], res[res.length - 1], width, height);
  const diffP = (diff / (width * height)) * 100;

  if (diffP > 0.5) {
    res.push(frames[L]);
  }

  return res.reduce<Frames>((acc, cur) => {
    if (cur.dataset.hash) {
      acc[cur.dataset.hash] = cur;
    }
    return acc;
  }, {});
};

export { drawFrame, dedupFrames };
