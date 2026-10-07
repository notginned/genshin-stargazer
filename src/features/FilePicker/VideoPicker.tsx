import { useEffect, useRef, useState, type ChangeEvent } from "react";
// import { hashCode } from "../../utils/hash.ts";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";
// import { FrameExtractor } from "./FrameExtractor.tsx";
import VideoFile from "@mui/icons-material/VideoFile";
import { FramePicker } from "./FramePicker.tsx";

const worker = new Worker(
  new URL("./utils/thumbnail.worker.ts", import.meta.url),
  {
    type: "module",
  },
);

function VideoPicker({ setImages }: FilePickerProps) {
  // const [src, setSrc] = useState<string | null>(null);
  const [frames, setFrames] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const progressRef = useRef<HTMLProgressElement | null>(null);

  useEffect(() => {
    worker.onmessage = (e) => {
      const type = e.data.type;
      console.log(e.data);

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
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    Array.from(e.target.files, (file) => {
      // const newSrc = URL.createObjectURL(file);
      // const hash = "h" + hashCode(file.name + file.size + file.lastModified);
      worker.postMessage({ type: "file", file });
      setIsProcessing(() => true);

      // setSrc(newSrc);
    });
  }

  // const userAgent = navigator.userAgent.toLowerCase();
  // const isFirefoxOnAndroid = userAgent.includes('firefox') && userAgent.includes('android');

  return (
    <>
      <label className="btn btn-add">
        <VideoFile /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      {/*{frames.map((frame, i) => (
        <img key={i} src={URL.createObjectURL(frame)} />
      ))}*/}
      {isProcessing && <label className="scan-progressbar">
        <progress ref={progressRef} value="0" max="1" />
      </label>}
      {frames.length !== 0 && (
        <FramePicker frames={frames} setImages={setImages} />
      )}
      {}
      {/*{src && <FrameExtractor src={src} setImages={setImages} setSrc={setSrc} />}*/}
    </>
  );
}

export { VideoPicker };
