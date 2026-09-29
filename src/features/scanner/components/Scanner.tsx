import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { processHistory } from "../../dataParser/processHistory.ts";
import type { WishHistory } from "../../../types/Wish.types.ts";
// import { preProcessImage } from "../utils/preProcessImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type { Images, ScannedImages } from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { useLocalStorage } from "../../../hooks/useLocalStorage.tsx";
import { isNull } from "../../../utils/lib.ts";
import { type Nullable } from "../../../types/lib.types.ts";
import { isEmpty } from "../../../utils/isEmpty.ts";
import type { WorkerMessage } from "../../../types/WorkerMessage.ts";
import { scanImages, scanSingleImage, service } from "../utils/scanImages.ts";
import { gammaProcess, preprocessImages } from "../utils/preProcessImage.ts";
import { drawDebugRegions } from "../utils/drawBoxes.ts";
import { getDebugImages } from "../utils/getDebugImages.ts";

interface ScannerProps {
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
  saveHistory: (newHistory: WishHistory) => void;
}

function Scanner({ images, setImages, saveHistory }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Nullable<ImageError | Error>>(null);
  const errorModalRef = useRef<Nullable<HTMLDialogElement>>(null);
  const progressRef = useRef<Nullable<HTMLProgressElement>>(null);
  const [scannedImages, setScannedImages] = useLocalStorage<ScannedImages>(
    "scannedImages",
    {},
  );
  // logDebug("processedImages", processedImages);
  // logDebug("scannedImages", scannedImages);

  const [scanResultTable, setScanResultTable] =
    useState<Nullable<WishHistory>>(null);
  const resultsModalRef = useRef<Nullable<HTMLDialogElement>>(null);

  const clearScanQueue = () => {
    setIsScanning(false);
    setImages({});
  };

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
      console.log("reply from worker", e.data);
      switch (e.data.type) {
        case "result": {
          console.log(e.data);
          // const newHistory = e.data.newHistory;
          // const processedHashes = e.data.processedHashes;

          //           // Saving history to browser storage
          //           saveHistory(newHistory);
          //
          //           // Showing the modal with scan results
          //           setScanResultTable(newHistory);
          //
          //           // Set scanned images only after data state is set
          //           // to avoid inconsistent cache
          //           setScannedImages((oldImages) => ({
          //             ...oldImages,
          //             // Reducing our array of newly scanned images into a object of hashes
          //             ...processedHashes.reduce<{ [hash: string]: boolean }>(
          //               (acc, cur) => {
          //                 acc[cur] = true;
          //                 return acc;
          //               },
          //               {},
          //             ),
          //           }));

          resultsModalRef.current?.show();

          setIsScanning(false);
          break;
        }
        case "progress": {
          if (progressRef.current) progressRef.current.value = e.data.value;
          break;
        }
        case "error": {
          const error = new Error(e.data.error);
          setError(error);
          setIsScanning(false);
        }
      }
    });
    workerRef.current = worker;
  }, []);

  const handleClick = async () => {
    const processed = await preprocessImages(Object.values(images));
    const canvases = await getDebugImages(processed);

    document.querySelector("main")?.append(...canvases);

    console.log("scanning");
    // const res = await scanSingleImage(processed[0]);
    console.time();
    const res = await scanImages(processed, (result) => console.log(result))
    console.log(res);
    console.timeEnd();

    // const res = service.recognize(, options)
  };

  const handleWorkerClick = async () => {
    if (isScanning) return;

    setIsScanning(true);
    workerRef.current?.postMessage({
      type: "process",
      images,
      scannedImages,
    });
  };

  return (
    <>
      {!isEmpty(images) && !isScanning && (
        <button type="button" className="btn btn-scan" onClick={handleClick}>
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
          <img
            src={error?.image.src}
            alt="error-image"
            className="error-image"
          />
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
