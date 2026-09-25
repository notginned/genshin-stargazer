import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { hashCode } from "../utils/hash.ts";
import type { Images, Videos } from "../types/State.type.ts";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import { log } from "../utils/lib.ts";
import pixelmatch from "pixelmatch";

interface VideoPickerProps {
  video: Videos;
  setVideo: Dispatch<SetStateAction<Videos>>;
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
}

const drawFrame = (
  video: HTMLVideoElement,
  mainCanvas: HTMLCanvasElement,
  frames: HTMLCanvasElement[],
) => {
  let dt = video.currentTime = 1.5;
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
      // const hash = "v" + hashCode(video.title + currentTime);

      frames.push(canvas);
    }
    video.requestVideoFrameCallback(updateCanvas);
  };

  video.requestVideoFrameCallback(updateCanvas);
};

// eslint-disable-next-line
function VideoPicker({ video, setVideo, images, setImages }: VideoPickerProps) {
  // TODO: Implement discarding dupes
  // set images from frames
  const [src, setSrc] = useState<string | null>(null);
  const vRef = useRef<HTMLVideoElement | null>(null);
  const cRef = useRef<HTMLCanvasElement | null>(null);
  const frames: HTMLCanvasElement[] = [];

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const res: Videos = {};

    Array.from(e.target.files, (f) => {
      const src = URL.createObjectURL(f);
      const hash = "h" + hashCode(f.name + f.size + f.lastModified);
      res[hash] = src;

      setSrc(src);
    });
  }

  const getDiff = async (
    img1: HTMLCanvasElement,
    img2: HTMLCanvasElement,
    width: number,
    height: number,
  ) => {
    const r1 = img1.getContext("2d")!.getImageData(0, 0, width, height);
    const r2 = img2.getContext("2d")!.getImageData(0, 0, width, height);

    return pixelmatch(r1.data, r2.data, undefined, width, height, { threshold: 0.1 });
  };

  const handleOnPause = async () => {
    // setImages((images) => ({ ...images, ...frames }));
    const f = Object.values(frames);
    let L = 0;
    let R = Math.min(L + 1, f.length);
    const width = vRef.current?.videoWidth!;
    const height = vRef.current?.videoHeight!;
    const res = frames.slice();

    while (R < f.length) {
      const diff = await getDiff(res[L], res[R], width, height);
      const diffP = (diff / (width * height)) * 100;

      if (diffP < 0.5) {
        delete res[L];
      }

      console.log(`diff ${R}: ${diffP}%`);
      L++;
      R++;
    }

    console.log(res);
  };

  return (
    <>
      <label className="btn btn-add">
        <InsertPhotoIcon /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      {src && (
        <video
          ref={vRef}
          onLoadedMetadata={() => drawFrame(vRef.current!, cRef.current!, frames)}
          onPause={handleOnPause}
          playsInline
          muted
          autoPlay
          src={src ?? undefined}
          controls
        ></video>
      )}
      {src && <canvas ref={cRef}></canvas>}
    </>
  );
}

export { VideoPicker };
