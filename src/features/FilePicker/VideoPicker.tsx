import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { hashCode } from "../../utils/hash.ts";
import type { Images, Videos } from "../../types/State.type.ts";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import { dedupFrames, drawFrame } from "./utils/processFrames.ts";
import { log } from "../../utils/lib.ts";
import { Modal } from "../../components/Modal.tsx";

interface VideoPickerProps {
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
}

// eslint-disable-next-line
function VideoPicker({ images, setImages }: VideoPickerProps) {
  // TODO: Implement discarding dupes
  // set images from frames
  const cRef = useRef<HTMLCanvasElement | null>(null);
  const [screens, setScreens] = useState<HTMLCanvasElement[]>([]);
  const pRef = useRef<HTMLProgressElement | null>(null);
  const mRef = useRef<HTMLDialogElement | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const res: Videos = {};
    const video = document.createElement("video");

    Array.from(e.target.files, (f) => {
      const src = URL.createObjectURL(f);
      const hash = "h" + hashCode(f.name + f.size + f.lastModified);
      res[hash] = src;

      video.src = src;
      // setSrc(src);
    });

    video.muted = true;
    video.autoplay = true;
    video.playbackRate = 4;

    const frames: HTMLCanvasElement[] = [];
    video.addEventListener("loadeddata", () =>
      drawFrame(
        video,
        cRef.current!,
        frames,
        (p) => pRef.current && (pRef.current.value = p),
      ),
    );

    video.addEventListener("playing", () => console.log("playing"));

    video.addEventListener("ended", async () => {
      console.log(frames);
      setScreens(await dedupFrames(frames, video));
      if (mRef.current) mRef.current.showModal();
      if (pRef.current) pRef.current.value = 0;
    });
  }

  return (
    <>
      <label className="btn btn-add">
        <InsertPhotoIcon /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      <progress max="1" ref={pRef}></progress>
      <canvas ref={cRef}></canvas>
      <Modal ref={mRef} title="Video Upload results">
        <div className="video-result-frames">
          {screens.map((x) => (
            <img
              key={x.dataset.hash}
              width="320px"
              data-hash={x.dataset.hash}
              src={x.toDataURL("image/png")}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}

export { VideoPicker };
