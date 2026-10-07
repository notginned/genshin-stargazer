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

interface FramePickerProps {
  setImages: Dispatch<SetStateAction<Images>>;
  frames: File[];
}

const showElement = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  if (!ref.current) return;
  ref.current.style.display = "initial";
};

const hideElement = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  if (!ref.current) return;
  ref.current.style.display = "none";
};

const FramePicker = ({ setImages, frames }: FramePickerProps) => {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const framesObj = frames.reduce<Images>((acc, cur) => {
      acc[cur.name] = { file: cur, hash: cur.name };
      return acc;
    }, {});

    if (formRef.current === null) return;
    const results = [...new FormData(e.currentTarget).values()] as string[];

    const images = results.reduce<Images>((acc, cur) => {
      acc[cur] = framesObj[cur];
      return acc;
    }, {});

    console.log({ framesObj, images, frames, results });

    modalRef.current?.close();
    setImages((previousImages) => ({ ...previousImages, ...images }));
  };

  return (
    <div>
      <Modal
        className="video-result-modal"
        ref={modalRef}
        title={`Select screenshots to upload (${frames.length})`}
        open
      >
        <form ref={formRef} name="video-frames" onSubmit={handleSubmit}>
          <div className="video-result-frames">
            {frames.map((frame, i) => (
              <label key={frame.name} title="Click or tap to toggle selection">
                <div className="screen-count">
                  <span>{i + 1}</span>
                  <div className="input-container">
                    <input
                      type="checkbox"
                      name="frame"
                      value={frame.name}
                      defaultChecked
                    />
                  </div>
                </div>
                <img data-hash={frame.name} src={URL.createObjectURL(frame)} />
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

export { FramePicker };
