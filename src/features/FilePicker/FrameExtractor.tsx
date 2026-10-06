import {
  useRef,
  useState,
  type Dispatch,
  type ReactEventHandler,
  type RefObject,
  type SetStateAction,
  type SubmitEventHandler,
} from "react";
import { dedupFrames, drawFrame } from "./utils/processFrames";
import { Modal } from "../../components/Modal";
import type { Frames, Images } from "../../types/State.type";
import { fileFromCanvas } from "./utils/fileFromCanvas";
import { isNull, logDebug } from "../../utils/lib";

interface FrameExtractorProps {
  setImages: Dispatch<SetStateAction<Images>>;
  src: string;
  setSrc: Dispatch<SetStateAction<string | null>>;
}

const showElement = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  if (!ref.current) return;
  ref.current.style.display = "initial";
};

const hideElement = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  if (!ref.current) return;
  ref.current.style.display = "none";
};

const FrameExtractor = ({ setImages, src, setSrc }: FrameExtractorProps) => {
  const [screens, setScreens] = useState<Frames>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLProgressElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const frames: HTMLCanvasElement[] = [];

  const handleLoadedData: ReactEventHandler<HTMLVideoElement> = (e) => {

    drawFrame(
      e.currentTarget,
      canvasRef.current!,
      frames,
      (p) => progressRef.current && (progressRef.current.value = p),
    );
    showElement(canvasRef);
    showElement(progressRef);
  };

  const handleEnded: ReactEventHandler<HTMLVideoElement> = (e) => {
    // workaround for onended not triggering because
    // Chrome does not fire ended event when manually seeking
    if (!e.currentTarget.ended) return;

    const uniqueFrames = dedupFrames(frames, e.currentTarget);
    setScreens(() => uniqueFrames);
    logDebug(uniqueFrames);
    if (!isNull(modalRef.current)) modalRef.current.showModal();
    if (!isNull(progressRef.current)) progressRef.current.value = 0;

    // Hide canvas and progress bar after processing
    hideElement(canvasRef);
    hideElement(progressRef);
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (formRef.current === null) return;
    const results = [...new FormData(e.currentTarget).entries()].reduce<Frames>(
      (acc, [, hash]) => {
        acc[hash as string] = screens[hash as string];
        return acc;
      },
      {},
    );

    const files = await Promise.all(
      Object.values(results).map((frame, i) => {
        return fileFromCanvas(frame, frame.dataset.hash || `frame ${i}`);
      }),
    );

    const images = files.reduce<Images>((acc, cur) => {
      acc[cur.name] = { file: cur, hash: cur.name };
      return acc;
    }, {});

    modalRef.current?.close();
    setImages((previousImages) => ({ ...previousImages, ...images }));
    setSrc(null);
  };

  const resultEntries = Object.entries(screens);

  return (
    <div>
      <label className="scan-progressbar">
        <canvas ref={canvasRef} />
        <progress ref={progressRef} value="0" max="1" />
      </label>
      <Modal
        className="video-result-modal"
        ref={modalRef}
        title={`Select screenshots to upload (${resultEntries.length})`}
      >
        <form ref={formRef} name="video-frames" onSubmit={handleSubmit}>
          <div className="video-result-frames">
            {resultEntries.map(([hash, url], i) => (
              <label key={hash} title="Click or tap to toggle selection">
                <div className="screen-count">
                  <span>{i + 1}</span>
                  <div className="input-container">
                    <input
                      type="checkbox"
                      name="frame"
                      value={hash}
                      defaultChecked
                    />
                  </div>
                </div>
                <img data-hash={hash} src={url.toDataURL("image/png")} />
              </label>
            ))}
          </div>
          <button className="btn" type="submit">
            Select
          </button>
        </form>
      </Modal>
    </div>
  );
};

export { FrameExtractor };
