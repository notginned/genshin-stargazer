import { type Frames } from "../../../types/State.type";
import { logDebug } from "../../../utils/lib";
import { getDiff } from "./getDiff";

const drawFrame = (
  video: HTMLVideoElement,
  mainCanvas: HTMLCanvasElement,
  frames: HTMLCanvasElement[],
  callback?: (time: number) => void,
) => {
  const FPS = 2;
  const width = video.videoWidth;
  const height = video.videoHeight;
  mainCanvas.width = width;
  mainCanvas.height = height;
  const mainCtx = mainCanvas.getContext("2d");
  if (mainCtx === null) throw new Error("Couldnt get context");

  const updateCanvas: VideoFrameRequestCallback = (_now, _metadata) => {
    if (video.currentTime >= video.duration) {
      logDebug("video ended", video.ended);
      return;
    };

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("Couldnt get context");

    ctx.drawImage(video, 0, 0, width, height);
    mainCtx.drawImage(video, 0, 0, width, height);
    // We don't care about a reproducible hash here, but we do want to avoid collision during deduplication
    const hash = "v" + crypto.randomUUID();
    canvas.dataset.hash = hash;

    if (callback) callback(video.currentTime / video.duration);

    frames.push(canvas);
    video.currentTime = video.currentTime + 1 / FPS;
    video.requestVideoFrameCallback(updateCanvas);
  };

  // Starting video and initialzing callback
  video.currentTime = 0;
  video.requestVideoFrameCallback(updateCanvas);
};

const dedupFrames = (
  frames: HTMLCanvasElement[],
  video: HTMLVideoElement,
  tolerance: number = 0.2,
): Frames => {
  const f = Object.values(frames);
  let L = 0;
  let R = L + 1;
  const width = video.videoWidth;
  const height = video.videoHeight;
  const res: HTMLCanvasElement[] = [];

  // Comparing 0 - N-1 frames
  while (R < f.length) {
    const diff = getDiff(frames[L], frames[R], width, height);
    const diffP = (diff / (width * height)) * 100;

    if (diffP > tolerance) {
      res.push(frames[L]);
    }

    // logDebug(`diff ${L + 1} - ${R + 1}: ${diffP}%`);
    L++;
    R++;
  }

  // Adding the last frame if its different;
  const diff = getDiff(frames[L], res[res.length - 1], width, height);
  const diffP = (diff / (width * height)) * 100;

  if (diffP > tolerance) {
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
