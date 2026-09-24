import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { hashCode } from "../utils/hash.ts";
import type { Images, Videos } from "../types/State.type.ts";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import { log } from "../utils/lib.ts";

interface VideoPickerProps {
  video: Videos;
  setVideo: Dispatch<SetStateAction<Videos>>;
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
}

const drawFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement, frames: Videos) => {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Couldnt get context");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  let dt = 0;
  const FPS = 1;

  const updateCanvas: VideoFrameRequestCallback = (now, metadata) => {
    const currentTime = video.currentTime;

    if (currentTime - dt > 1 / FPS) {
      console.log(currentTime);
      dt = currentTime;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const hash = "v" + hashCode(video.title + currentTime);

      frames[hash] = canvas.toDataURL("image/png");
    }
    video.requestVideoFrameCallback(updateCanvas);
  };

  video.requestVideoFrameCallback(updateCanvas);
};

function VideoPicker({ video, setVideo, images, setImages }: VideoPickerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const vRef = useRef<HTMLVideoElement | null>(null);
  const cRef = useRef<HTMLCanvasElement | null>(null);
  const frames: Videos = {};

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

  const handleOnPause = () => {
    setImages((images) => ({ ...images, ...frames }));
    console.log(frames);
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
