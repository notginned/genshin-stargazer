import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { WishHistory } from "../../../types/Wish.types.ts";
// import { preProcessImage } from "../utils/preProcessImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type { Images, ScannedImages } from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { useLocalStorage } from "../../../hooks/useLocalStorage.tsx";
import { isNull, logDebug } from "../../../utils/lib.ts";
import { type Nullable } from "../../../types/lib.types.ts";
import { isEmpty } from "../../../utils/isEmpty.ts";
import type { WorkerMessage } from "../../../types/WorkerMessage.ts";
// import { scanImages } from "../utils/scanImages.ts";
// import { preprocessImages } from "../utils/preProcessImage.ts";
// import { getDebugImages } from "../utils/getDebugImages.ts";
import { objectDifference } from "../../../utils/objectDifference.ts";

interface ScannerProps {
  images: Images;
  isScanning: Boolean;
  setIsScanning: Dispatch<SetStateAction<boolean>>;
  setImages: Dispatch<SetStateAction<Images>>;
  saveHistory: (newHistory: WishHistory) => void;
}

function Scanner({
  images,
  setImages,
  isScanning,
  setIsScanning,
  saveHistory,
}: ScannerProps) {
  const [error, setError] = useState<Nullable<ImageError | Error>>(null);
  const errorModalRef = useRef<Nullable<HTMLDialogElement>>(null);
  const errorCanvasRef = useRef<Nullable<HTMLCanvasElement>>(null);
  const progressRef = useRef<Nullable<HTMLProgressElement>>(null);
  const [scannedImages, setScannedImages] = useLocalStorage<ScannedImages>(
    "scannedImages",
    {},
  );

  const [scanResultTable, setScanResultTable] =
    useState<Nullable<WishHistory>>(null);
  const resultsModalRef = useRef<Nullable<HTMLDialogElement>>(null);

  const handleErrorModalClose = () => {
    if (!error) return;
    setError(() => null);
  };

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../utils/scan.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
      switch (e.data.type) {
        case "result": {
          logDebug("reply from worker", e.data);
          const newHistory = e.data.newHistory;
          const scannedHashes = e.data.scannedHashes;

          // Saving history to browser storage
          saveHistory(newHistory);

          // Showing the modal with scan results
          setScanResultTable(newHistory);

          // Set scanned images only after data state is set
          // to avoid inconsistent cache
          setScannedImages((oldImages) => ({
            ...oldImages,
            ...scannedHashes,
          }));

          resultsModalRef.current?.show();
          setImages({});
          setIsScanning(false);

          break;
        }
        case "progress": {
          if (progressRef.current) progressRef.current.value = e.data.value;
          break;
        }
        case "error": {
          const error = new ImageError(e.data.error, e.data.image!);
          setError(error);

          if (!errorCanvasRef.current) return;
          if (!(error instanceof ImageError)) return;
          const ctx = errorCanvasRef.current.getContext("2d");
          errorCanvasRef.current.width = error.image.width!;
          errorCanvasRef.current.height = error.image.height!;
          ctx?.drawImage(error.image, 0, 0);
          setIsScanning(false);
        }
      }
    });
    workerRef.current = worker;
  }, [setIsScanning, saveHistory, setScannedImages, setImages]);

  // Only there for debug purposes
//     const handleClick = async () => {
//       const processed = await preprocessImages(Object.values(images));
//       const canvases = await getDebugImages(processed);
//
//       document.querySelector("main")?.append(...canvases);
//
//       console.log("scanning");
//       const res = await scanImages(processed);
//       console.log(res);
//       // const res = await scanImages(processed, (result) => console.log(result))
//       // console.log(res);
//       // console.timeEnd();
//     };

  const handleWorkerClick = async () => {
    if (isScanning) return;
    const newImages = objectDifference(images, scannedImages);
    if (isEmpty(newImages)) setImages({});
    if (isNull(workerRef.current)) {
      return setError(new Error("Could not create worker"));
    }

    setIsScanning(true);
    workerRef.current.postMessage({
      type: "process",
      images: newImages,
      scannedImages,
    });
  };

  return (
    <>
      {!isEmpty(images) && !isScanning && (
        <button
          type="button"
          className="btn btn-scan"
          onClick={handleWorkerClick}
        >
          {!isEmpty(images) ? "Process" : "Scan"} Images
        </button>
      )}
      {isScanning && <progress ref={progressRef} value="0" max="1" />}

      <Modal
        title="Error"
        className="error-modal"
        ref={errorModalRef}
        onClose={handleErrorModalClose}
        open={error ? true : false}
      >
        <p>There was an error processing the image</p>
        {!isNull(error) && <p>{error.message}</p>}
        <p>Please retry</p>
        {error instanceof ImageError && (
          <canvas ref={errorCanvasRef} className="error-image" />
        )}
        <div className="error-modal-btn-wrapper">
          <button
            className="btn"
            onClick={async () =>
              error &&
              navigator.clipboard.writeText(
                error.message + "\n\n" + error?.stack,
              )
            }
          >
            Copy error
          </button>

          <button
            className="btn"
            onClick={() => errorModalRef.current?.close()}
          >
            Okay
          </button>
        </div>
      </Modal>

      <ScanResultsModal
        ref={resultsModalRef}
        scanResultTable={scanResultTable}
        setScanResultTable={setScanResultTable}
      />
    </>
  );
}

export default Scanner;
