import {
  useRef,
  useState,
  type ChangeEvent,
  // type Dispatch,
  // type SetStateAction,
  type SubmitEventHandler,
} from "react";
import { hashCode } from "../../utils/hash.ts";
import type { Frames, Images, Videos } from "../../types/State.type.ts";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import { dedupFrames, drawFrame } from "./utils/processFrames.ts";
// import { log } from "../../utils/lib.ts";
import { Modal } from "../../components/Modal.tsx";
import type { FilePickerProps } from "../../types/FilePickerProps.tsx";
import { fileFromCanvas } from "./utils/fileFromCanvas.ts";
import { FrameExtractor } from "./FrameExtractor.tsx";
import { log } from "../../utils/lib.ts";

// eslint-disable-next-line
function VideoPicker({ setImages }: FilePickerProps) {
  const [src, setSrc] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const res: Videos = {};

    Array.from(e.target.files, (file) => {
      const newSrc = URL.createObjectURL(file);
      const hash = "h" + hashCode(file.name + file.size + file.lastModified);
      res[hash] = newSrc;

      setSrc(newSrc);
    });
  }

  return (
    <>
      <label className="btn btn-add">
        <InsertPhotoIcon /> Add video
        <input type="file" accept="video/*" onChange={handleChange} />
      </label>
      {src && <FrameExtractor src={src} setImages={setImages} />}
    </>
  );
}

export { VideoPicker };
