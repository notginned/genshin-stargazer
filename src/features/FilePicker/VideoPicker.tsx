import {
  useRef,
  useState,
  type ChangeEvent,
  // type Dispatch,
  // type SetStateAction,
} from "react";
import { hashCode } from "../../utils/hash.ts";
// import { log } from "../../utils/lib.ts";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";
import { FrameExtractor } from "./FrameExtractor.tsx";
import VideoFile from "@mui/icons-material/VideoFile";

// eslint-disable-next-line
function VideoPicker({ setImages }: FilePickerProps) {
  const [src, setSrc] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    Array.from(e.target.files, (file) => {
      const newSrc = URL.createObjectURL(file);
      const hash = "h" + hashCode(file.name + file.size + file.lastModified);
      console.log(hash);

      setSrc(newSrc);
    });
  }

  return (
    <>
      <label className="btn btn-add">
        <VideoFile /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      {src && <FrameExtractor src={src} setImages={setImages} />}
    </>
  );
}

export { VideoPicker };
