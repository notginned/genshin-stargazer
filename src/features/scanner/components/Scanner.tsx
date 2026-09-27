import {
  use,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { scanImages, service } from "../utils/scanImages.ts";
import { processHistory } from "../../dataParser/processHistory.ts";
import type { WishHistory } from "../../../types/Wish.types.ts";
import { preProcessImage } from "../utils/preProcessImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type {
  Images,
  ProcessedImages,
  ScannedImages,
} from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { useLocalStorage } from "../../../hooks/useLocalStorage.tsx";
import { isNull, log, logDebug } from "../../../utils/lib.ts";
import { type Nullable } from "../../../types/lib.types.ts";
import type { Rectangle, ScanRegions } from "../utils/scan.types.ts";
import { isEmpty } from "../../../utils/isEmpty.ts";

// const loadScanner = async () => {
//   await service.initialize();
//   return service.destroy();
// };

// const scannerLoaded: Promise<void> = loadScanner();

const colors = [
  "#FF5733", // Bright Red-Orange
  "#FFBD33", // Bright Yellow-Orange
  "#DBFF33", // Bright Lime
  "#75FF33", // Neon Green
  "#33FF57", // Bright Green
  "#33FFBD", // Bright Aqua
  "#33DBFF", // Bright Sky Blue
  "#3375FF", // Bright Blue
  "#5733FF", // Bright Indigo
  "#BD33FF", // Bright Violet
  "#FF33DB", // Bright Pink-Magenta
  "#FF3375", // Bright Hot Pink
];

function genRandomColor() {
  const color = colors[Math.round(Math.random() * (colors.length - 1))];
  return color;
}

function drawBoxes(canvasEl: HTMLCanvasElement, rectangles: Rectangle[]) {
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;

  rectangles.forEach(({ top, left, height, width }) => {
    const newCol = genRandomColor();
    ctx.strokeStyle = newCol;
    ctx.rect(left, top, width, height);
    ctx.stroke();
  });
}

interface ScannerProps {
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
  processedImages: ProcessedImages;
  setProcessedImages: Dispatch<SetStateAction<ProcessedImages>>;
  saveHistory: (newHistory: WishHistory) => void;
}

function Scanner({
  images,
  setImages,
  processedImages,
  setProcessedImages,
  saveHistory,
}: ScannerProps) {
  // use(scannerLoaded);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Nullable<ImageError | Error>>(null);
  const errorModalRef = useRef<Nullable<HTMLDialogElement>>(null);
  const [_scannedImages, setScannedImages] = useLocalStorage<ScannedImages>(
    "scannedImages",
    {},
  );
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../utils/scan.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (e) => {
      console.log("reply from worker", e.data);
    });
    workerRef.current = worker;
  }, []);

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
    if (!(error instanceof ImageError)) {
      clearScanQueue();
      setError(() => null);
      return;
    }

    setProcessedImages((prevImages) => {
      const newImages = { ...prevImages };
      delete newImages[error.image.id];
      return newImages;
    });
    clearScanQueue();
    setError(() => null);
  };

  // Image Processing
  const startProcessing = async (
    images: Images,
    processedImages: ProcessedImages,
  ) => {
    // console.log(isScanning);
    const entries = Object.entries(images);
    // logDebug({ entries });
    // logDebug(processedImages);

    //       for (const [hash, src] of entries) {
    //         const out = await gammaProcess(src);
    //         drawBoxes(out.image, Object.values(out.rectangles));
    //         document.querySelector("header")?.appendChild(out.image);
    //         globalThis.drawBoxes = drawBoxes;
    //         out.image.addEventListener("click", (e: MouseEvent) => {
    //           if (!(e.currentTarget instanceof HTMLCanvasElement)) return;
    //           const rect = e.currentTarget.getBoundingClientRect();
    //           const { left, top, width, height } = rect;
    //           console.log({
    //             x: (e.clientX - left) / width,
    //             y: (e.clientY - top) / height,
    //           });
    //         });
    //
    //         log(hash);
    //         const out = await preProcessImage(src, hash);
    //         console.log(out);
    //
    //         if (processedImages[hash]) {
    //           logDebug("Already processed this image", hash);
    //           continue;
    //         }
    //
    //         const newScanRegion = await preProcessImage(src, hash);
    //         drawBoxes(newScanRegion.image, Object.values(newScanRegion.rectangles));
    //         document.querySelector("header")?.appendChild(newScanRegion.image);
    //         result[hash] = newScanRegion;
    //         console.log("result", { result });
    //       }

    const promises: [string, ScanRegions][] = await Promise.all(
      entries.map(async ([hash, src]) => {
        // log(hash);
        // const out = await preProcessImage(src, hash);
        // console.log(out);

        if (processedImages[hash]) {
          logDebug("Already processed this image", hash);
          return [hash, processedImages[hash]];
        }

        const newScanRegion = await preProcessImage(src, hash);
        // drawBoxes(newScanRegion.image, Object.values(newScanRegion.rectangles));
        // document.querySelector("header")?.appendChild(newScanRegion.image);

        return [hash, newScanRegion];
      }),
    );
    const result = Object.fromEntries(promises);

    return { ...processedImages, ...result };

    // setProcessedImages((prevHashes) => ({
    //   ...prevHashes,
    //   ...result,
    // }));
    // setImages({});
  };

  // Function to handle scanning
  const startScan = async (queue: ScanRegions[]) => {
    // TODO: Change ScanRegion canvases to image urls for serialization
    const scanResults = await scanImages(queue);

    if (scanResults.some((r) => r.itemName.length === 0)) {
      throw new Error("Could not scan image");
    }

    const newHistory = processHistory(scanResults);
    return newHistory;
  };

  const handleClick = async () => {
    try {
      if (isScanning) return;

      // Use existing cache if no new images to process
      // otherwise process new images and add them to queue
      const pIms = isEmpty(processedImages)
        ? await startProcessing(images, processedImages)
        : processedImages;
      setProcessedImages((previous) => ({ ...previous, ...pIms }));
      setImages({});

      logDebug("Processing done", { pIms });
      const scanQueue = Object.values(pIms);

      const newHistory = await startScan(scanQueue);
      // Saving history to browser storage
      saveHistory(newHistory);

      // Showing the modal with scan results
      setScanResultTable(newHistory);

      // Set scanned images only after data state is set
      // to avoid inconsistent cache
      setScannedImages((oldImages) => ({
        ...oldImages,
        // Reducing our array of newly scanned images into a object of hashes
        ...scanQueue.reduce<{ [hash: string]: boolean }>((acc, cur) => {
          acc[cur.image.dataset.hash!] = true;
          return acc;
        }, {}),
      }));

      resultsModalRef.current?.show();
    } catch (e) {
      console.error(e);
    } finally {
      clearScanQueue();
    }
  };

  const handleWorkerClick = async () => {
    if (isScanning) return;

    // Use existing cache if no new images to process
    // otherwise process new images and add them to queue
    const pIms = isEmpty(processedImages)
      ? await startProcessing(images, processedImages)
      : processedImages;

    workerRef.current?.postMessage({type: "scan", images, processedImages});
  };

  return (
    <>
      {!isEmpty(images) && (
        <button type="button" className="btn btn-scan" onClick={handleWorkerClick}>
          {isEmpty(processedImages) ? "Process" : "Scan"} Images
        </button>
      )}

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
