import {
  useRef,
  useState,
  type Dispatch,
  type ReactEventHandler,
  type SetStateAction,
  type SubmitEventHandler,
} from "react";
import { dedupFrames, drawFrame } from "./utils/processFrames";
import { Modal } from "../../components/Modal";
import type { Frames, Images } from "../../types/State.type";
import { fileFromCanvas } from "./utils/fileFromCanvas";
import { isNull } from "../../utils/lib";

interface FrameExtractorProps {
  setImages: Dispatch<SetStateAction<Images>>;
  src: string;
}
const FrameExtractor = ({ setImages, src }: FrameExtractorProps) => {
  const [screens, setScreens] = useState<Frames>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLProgressElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const frames: HTMLCanvasElement[] = [];
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  const handleLoadedData: ReactEventHandler<HTMLVideoElement> = (e) => {
    e.currentTarget.defaultPlaybackRate = 4;
    e.currentTarget.playbackRate = 4;
    drawFrame(
      e.currentTarget,
      canvasRef.current!,
      frames,
      (p) => progressRef.current && (progressRef.current.value = p),
    );
  };

  const handleEnded: ReactEventHandler<HTMLVideoElement> = (e) => {
    const uniqueFrames = dedupFrames(frames, e.currentTarget);
    setScreens(() => uniqueFrames);
    console.log(uniqueFrames);
    if (!isNull(modalRef.current)) modalRef.current.showModal();
    if (!isNull(progressRef.current)) progressRef.current.value = 0;
    // Hide canvas after processing
    setIsProcessing(() => false);
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
  };

  return (
    <div>
      <video
        src={src}
        muted
        autoPlay
        onLoadedData={handleLoadedData}
        onEnded={handleEnded}
      />
      {isProcessing && (
        <>
          <canvas ref={canvasRef} />
          <progress ref={progressRef} max="1" />
        </>
      )}
      <Modal
        className="video-result-modal"
        ref={modalRef}
        title="Video Upload results"
      >
        <form ref={formRef} name="video-frames" onSubmit={handleSubmit}>
          <div className="video-result-frames">
            {Object.entries(screens).map(([hash, url]) => (
              <label key={hash}>
                <img data-hash={hash} src={url.toDataURL("image/png")} />
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
    </div>
  );
};

export { FrameExtractor };
