import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";
import VideoFile from "@mui/icons-material/VideoFile";
import { FramePicker } from "./FramePicker.tsx";
import { Modal } from "../../components/Modal.tsx";

const worker = new Worker(
  new URL("./utils/thumbnail.worker.ts", import.meta.url),
  {
    type: "module",
  },
);

function VideoPicker({ setImages }: FilePickerProps) {
  const [frames, setFrames] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const progressRef = useRef<HTMLProgressElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    worker.onmessage = (e) => {
      const type = e.data.type;

      switch (type) {
        case "progress":
          if (progressRef.current) progressRef.current.value = e.data.value;
          break;
        case "frames":
          setFrames(() => e.data.frames);
          setIsProcessing(() => false);
      }
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    Array.from(e.target.files, (file) => {
      worker.postMessage({ type: "file", file });
      setIsProcessing(() => true);
    });
  };

  const userAgent = navigator.userAgent.toLowerCase();
  const isFirefoxOnAndroid =
    userAgent.includes("firefox") && userAgent.includes("android");

  if (isFirefoxOnAndroid) {
    return (
      <>
        <label>
          <button
            className="btn btn-add"
            onClick={() => modalRef.current?.showModal()}
          >
            {" "}
            <VideoFile /> Add video
          </button>
        </label>
        <Modal title="Unsupported browser" ref={modalRef}>
          <div>
            <span>
              Sorry, Firefox on android does not support video uploads.
            </span>
            <br />
            <span>Please use another browser or scan using image upload.</span>
          </div>
          <button className="btn" onClick={() => modalRef.current?.close()}>
            Okay
          </button>
        </Modal>
      </>
    );
  }

  return (
    <>
      <label className="btn btn-add">
        <VideoFile /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>

      {isProcessing && (
        <label className="scan-progressbar">
          <span>Processing video</span>
          <progress ref={progressRef} value="0" max="1" />
        </label>
      )}

      {frames.length !== 0 && (
        <FramePicker frames={frames} setImages={setImages} />
      )}
    </>
  );
}

export { VideoPicker };
