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
  const FPS = 1;
  mainCanvas.width = video.videoWidth;
  mainCanvas.height = video.videoHeight;
  const mainCtx = mainCanvas.getContext("2d");
  if (mainCtx === null) throw new Error("Couldnt get context");

  const updateCanvas: VideoFrameRequestCallback = (_now, _metadata) => {
    const currentTime = video.currentTime;

    if (currentTime - dt > 1 / FPS) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx === null) throw new Error("Couldnt get context");

      log(currentTime);
      dt = currentTime;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      mainCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const hash = "v" + hashCode(video.title + currentTime);
      canvas.dataset.hash = hash;

      if(callback) callback(currentTime / video.duration);

      frames.push(canvas);
    }
    video.requestVideoFrameCallback(updateCanvas);
  };

  video.requestVideoFrameCallback(updateCanvas);
};

const dedupFrames = async (
  frames: HTMLCanvasElement[],
  video: HTMLVideoElement,
) => {
  const f = Object.values(frames);
  let L = 0;
  let R = L + 1;
  // Will never happen
  const width = video.videoWidth;
  const height = video.videoHeight;
  const res: HTMLCanvasElement[] = [];

  while (R < f.length) {
    const diff = await getDiff(frames[L], frames[R], width, height);
    const diffP = (diff / (width * height)) * 100;

    if (diffP > 0.5) {
      res.push(frames[L]);
    }

    log(`diff ${R}: ${diffP}%`);
    L++;
    R++;
  }

  // Adding the last frame if its different;
  const diff = await getDiff(frames[L], res[res.length - 1], width, height);
  const diffP = (diff / (width * height)) * 100;

  if (diffP > 0.5) {
    res.push(frames[L]);
  }

  return res;
};

export { drawFrame, dedupFrames };
