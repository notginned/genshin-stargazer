import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { scanImages, service } from "../utils/scanImages.ts";
import { processHistory } from "../../dataParser/processHistory.ts";
import type { WishHistory } from "../../../types/Wish.types.ts";
import { gammaProcess, getScanRegion } from "../../imageProcessor/processImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type {
  Images,
  ProcessedImages,
  ScannedImages,
} from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { ProgressIndicator } from "../../../components/ProgressIndicator.tsx";
import { useLocalStorage } from "../../../hooks/useLocalStorage.tsx";
import { isNull, log, logDebug } from "../../../utils/lib.ts";
import { type Nullable } from "../../../types/lib.types.ts";
import type { Rectangle } from "../utils/scan.types.ts";
import { isEmpty } from "../../../utils/isEmpty.ts";
import { createImageFromUrl } from "../../../utils/imageFromUrl.ts";
import { getOpenCv } from "../../imageProcessor/lib/opencv/opencv.ts";

// let scannerLoaded: null | Promise<void> = null;

// const loadScanner = async () => {
// await service.initialize();
// return service.destroy();
// return true;
// };

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
  //   if (!scannerLoaded) {
  //     scannerLoaded = loadScanner();
  //   }
  //
  //   use(scannerLoaded);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Nullable<ImageError | Error>>(null);
  const errorModalRef = useRef<Nullable<HTMLDialogElement>>(null);
  const [scannedImages, setScannedImages] = useLocalStorage<ScannedImages>(
    "scannedImages",
    {},
  );

  // Happy path
  const scanQueue = Object.values(processedImages).filter(
    (region) => !scannedImages[region.image.dataset.hash!],
  );
  // logDebug("scanQueue", scanQueue);
  // logDebug("processedImages", processedImages);
  logDebug("scannedImages", scannedImages);

  const [scanResultTable, setScanResultTable] =
    useState<Nullable<WishHistory>>(null);
  const resultsModalRef = useRef<Nullable<HTMLDialogElement>>(null);

  const allImagesProcessed = isEmpty(images);
  console.log({allImagesProcessed});

  const allImagesScanned = isEmpty(processedImages);

  if (allImagesProcessed) {
    logDebug("Processed all images");
  }

  const clearScanQueue = useCallback(() => {
    setIsScanning(false);
    setImages({});
  }, [setImages]);

  const handleErrorModalClose = useCallback(() => {
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
  }, [clearScanQueue, setProcessedImages, error]);

  // Image Processing
  const startProcessing = async () => {
    try {
      console.log(isScanning)
      const result: ProcessedImages = {};
      const entries = Object.entries(images);
      logDebug({ entries });
      logDebug(processedImages);
      const out = await gammaProcess(entries[0][1]);
      console.log(out);
      document.querySelector("header")?.appendChild(out);
      for (const [hash, src] of entries) {
        log(hash);
        // if (processedImages[hash]) {
        //   logDebug("Already processed this image", hash);
        //   continue;
        // }

        // const newScanRegion = await getScanRegion(src, hash);
        // drawBoxes(newScanRegion.image, Object.values(newScanRegion.rectangles));
        // document.querySelector("header")?.appendChild(newScanRegion.image);

        // result[hash] = newScanRegion;
      }
      log({ result });

      // setProcessedImages((prevHashes) => ({
      //   ...prevHashes,
      //   ...result,
      // }));
      // setImages({});
    } catch (e) {
      if (e instanceof ImageError) {
        setError(e);
      }
      console.error(e);
    }
  };

  // Function to handle scanning
  const startScan = useCallback(async () => {
    if (isScanning) {
      logDebug("Already scanning");
      return;
    }
    // logDebug("clicked", { scanQueue });

    // No new images
    if (scanQueue.length === 0) {
      logDebug("There are no new images");
      clearScanQueue();
      return;
    }

    // Critical Section
    setIsScanning(true);
    try {
      const scanResults = await scanImages(scanQueue);
      // logDebug("scan results", scanResults);

      if (scanResults.some((r) => r.itemName.length === 0)) {
        throw new Error("Could not scan image");
      }

      const newHistory = processHistory(scanResults);
      // logDebug("newHistory", newHistory);

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

      if (resultsModalRef.current) resultsModalRef.current.show();
    } catch (error) {
      console.error("Error scanning images", error);
      if (!(error instanceof Error)) return;
      setError(error);
    } finally {
      // Cleanup
      // Reset scan state
      clearScanQueue();
    }
  }, [isScanning, saveHistory, scanQueue, setScannedImages, clearScanQueue]);

  const handleClick = async () => {
    await startProcessing();
    // await startScan();
  }

  return (
    <>
      {/*{!allImagesProcessed && <ProgressIndicator />}

      {allImagesProcessed && !isScanning && !allImagesScanned && (
        <button type="button" className="btn btn-scan" onClick={handleClick}>
          Scan ({scanQueue.length})
        </button>
      )}
      {isScanning && <ProgressIndicator />}*/}

      {!isEmpty(images) && (
        <button type="button" className="btn btn-scan" onClick={handleClick}>
          Process Images ()
        </button>
      )}

      {/*<section className="images">
        {Object.entries(images).map(([hash, src]) => (
          <img
            key={hash}
            className="src_image"
            data-hash={hash}
            src={src}
            alt="sample"
            onLoad={() => handleLoad(hash)}
          ></img>
        ))}
      </section>*/}

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
