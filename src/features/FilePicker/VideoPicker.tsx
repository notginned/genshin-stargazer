import { useEffect, useState, type ChangeEvent } from "react";
// import { hashCode } from "../../utils/hash.ts";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";
// import { FrameExtractor } from "./FrameExtractor.tsx";
import VideoFile from "@mui/icons-material/VideoFile";

const worker = new Worker(
  new URL("./utils/thumbnail.worker.ts", import.meta.url),
  {
    type: "module",
  },
);

function VideoPicker({ setImages }: FilePickerProps) {
  // const [src, setSrc] = useState<string | null>(null);
  const [blobs, setBlobs] = useState<Blob[]>([]);

  useEffect(() => {
    worker.onmessage = (e) => {
      const type = e.data.type;
      console.log(e.data);

      switch (type) {
        case "progress":
          break;
        case "frames":
          setBlobs(() => e.data.frames);
      }
    };
  }, []);
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    Array.from(e.target.files, (file) => {
      // const newSrc = URL.createObjectURL(file);
      // const hash = "h" + hashCode(file.name + file.size + file.lastModified);
      worker.postMessage({ type: "file", file });

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
      {blobs.map((blob, i) => (
        <img key={i} src={URL.createObjectURL(blob)} />
      ))}
      {/*{src && <FrameExtractor src={src} setImages={setImages} setSrc={setSrc} />}*/}
    </>
  );
}

export { VideoPicker };
