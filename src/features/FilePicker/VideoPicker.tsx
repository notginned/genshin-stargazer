import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  type SubmitEventHandler,
} from "react";
import { hashCode } from "../../utils/hash.ts";
import type { Images, Videos } from "../../types/State.type.ts";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import { dedupFrames, drawFrame } from "./utils/processFrames.ts";
import { log } from "../../utils/lib.ts";
import { Modal } from "../../components/Modal.tsx";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";

// eslint-disable-next-line
function VideoPicker({ images, setImages }: FilePickerProps) {
  // TODO: Implement discarding dupes
  // set images from frames
  const cRef = useRef<HTMLCanvasElement | null>(null);
  const [screens, setScreens] = useState<Images>({});
  const pRef = useRef<HTMLProgressElement | null>(null);
  const mRef = useRef<HTMLDialogElement | null>(null);
  const fRef = useRef<HTMLFormElement | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const res: Videos = {};
    const video = document.createElement("video");

    Array.from(e.target.files, (f) => {
      const src = URL.createObjectURL(f);
      const hash = "h" + hashCode(f.name + f.size + f.lastModified);
      res[hash] = src;

      video.src = src;
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

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (fRef.current === null) return;

    const results = [...new FormData(e.currentTarget).entries()].reduce<Images>(
      (acc, [, hash]) => {
        acc[hash as string] = screens[hash as string];
        return acc;
      },
      {},
    );

    mRef.current?.close();
    setImages((ims) => ({ ...ims, ...results }));
  };

  return (
    <>
      <label className="btn btn-add">
        <InsertPhotoIcon /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      <progress max="1" ref={pRef}></progress>
      <canvas ref={cRef}></canvas>
      <Modal
        className="video-result-modal"
        ref={mRef}
        title="Video Upload results"
      >
        <form ref={fRef} name="video-frames" onSubmit={handleSubmit}>
          <div className="video-result-frames">
            {Object.entries(screens).map(([hash, url]) => (
              <label key={hash}>
                <img data-hash={hash} src={url} />
                <input
                  type="checkbox"
                  name="frame"
                  value={hash}
                  defaultChecked
                />
              </label>
            ))}
          </div>
          <button type="submit">Okay</button>
        </form>
      </Modal>
    </>
  );
}

export { VideoPicker };
