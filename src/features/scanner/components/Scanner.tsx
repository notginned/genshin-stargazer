import { use, useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { scanImages, service } from "../utils/scanImages.ts";
import { processHistory } from "../../dataParser/processHistory.ts";
import type { WishHistory } from "../../../types/Wish.types.ts";
import { getScanRegion } from "../../imageProcessor/processImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type { Images, ProcessedImages, ScannedImages } from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { ProgressIndicator } from "../../../components/ProgressIndicator.tsx";
import { useLocalStorage } from "../../../hooks/useLocalStorage.tsx";
import { isNull, logDebug } from "../../../utils/lib.ts";
import { type Nullable } from "../../../types/lib.types.ts";
import type { Rectangle } from "../utils/scan.types.ts";

let scannerLoaded: null | Promise<void> = null;

const loadScanner = async () => {
  await service.initialize();
  return service.destroy();
};

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

function drawBoxes(
  canvasEl: HTMLCanvasElement,
  rectangles: Rectangle[]
) {
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
  saveHistory: (newHistory: WishHistory) => void;
}

function Scanner({ images, setImages, saveHistory }: ScannerProps) {
  if (!scannerLoaded) {
    scannerLoaded = loadScanner();
  }

  use(scannerLoaded);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Nullable<ImageError | Error>>(null);
  const errorModalRef = useRef<Nullable<HTMLDialogElement>>(null);
  const [scannedImages, setScannedImages] = useLocalStorage<ScannedImages>("scannedImages", {});

  const [processedImages, setProcessedImages] = useState<ProcessedImages>({});

  // There was an error processing the image
  if (error) {
    console.error(error);
    errorModalRef.current?.showModal();
  }

  // Happy path
  const scanQueue = Object.values(processedImages).filter(
    (region) => !scannedImages[region.image.dataset.hash!],
  );
  logDebug("scanQueue", scanQueue);
  logDebug("processedImages", processedImages);
  logDebug("scannedImages", scannedImages);

  const [scanResultTable, setScanResultTable] = useState<Nullable<WishHistory>>(null);
  const resultsModalRef = useRef<Nullable<HTMLDialogElement>>(null);

  if (scanResultTable) {
    resultsModalRef.current?.showModal();
  }

  const allImagesProcessed = Object.keys(images).every((hash) => processedImages[hash]);

  const allImagesScanned = scanQueue.length === 0;

  if (allImagesProcessed) {
    logDebug("Processed all images");
  }

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
  }, [setImages, scanQueue, setProcessedImages, error]);

  const clearScanQueue = useCallback(() => {
    setIsScanning(false);
    setImages({});
  }, [setImages]);

  // Image Processing
  const handleLoad = useCallback(
    async (hash: string) => {
      try {
        if (processedImages[hash]) {
          logDebug("Already processed");

          setImages((prevImages) => {
            const res = { ...prevImages };
            delete res[hash];
            return res;
          });

          return;
        }

        const inputEl = document.querySelector<HTMLImageElement>(`img[data-hash=${hash}]`);

        if (isNull(inputEl)) throw new Error("Can't find image to process");

        const newScanRegion = await getScanRegion(inputEl);
        drawBoxes(newScanRegion.image, Object.values(newScanRegion.rectangles));
        document.querySelector('header')?.appendChild(newScanRegion.image);

        setProcessedImages((prevHashes) => ({
          ...prevHashes,
          [hash]: newScanRegion,
        }));
      } catch (e) {
        if (e instanceof ImageError) {
          setError(e);
        }
      }
    },
    [setImages, processedImages, setProcessedImages],
  );

  // Function to handle scanning
  const handleClick = useCallback(async () => {
    if (isScanning) {
      logDebug("Already scanning");
      return;
    }
    logDebug("clicked", { scanQueue });

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
      logDebug("scan results", scanResults);

      if (scanResults.some((r) => r.itemName.length === 0)) {
        throw new Error("Could not scan image");
      }

      const newHistory = processHistory(scanResults);
      logDebug("newHistory", newHistory);

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

  return (
    <>
      {!allImagesProcessed && <ProgressIndicator />}

      {allImagesProcessed && !isScanning && !allImagesScanned && (
        <button type="button" className="btn btn-scan" onClick={handleClick}>
          Scan ({scanQueue.length})
        </button>
      )}
      {isScanning && <ProgressIndicator />}

      <section className="images">
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
      </section>

      <Modal
        title="Error"
        className="error-modal"
        ref={errorModalRef}
        onClose={handleErrorModalClose}
      >
        <p>There was an error processing the image</p>
        {!isNull(error) && <p>{error.message}</p>}
        <p>Please retry</p>
        {error instanceof ImageError && (
          <img src={error?.image.src} alt="error-image" className="error-image" />
        )}
        <div className="error-modal-btn-wrapper">
          <button
            className="btn"
            onClick={async () =>
              error && navigator.clipboard.writeText(error.message + "\n\n" + error?.stack)
            }
          >
            Copy error
          </button>

          <button className="btn" onClick={() => errorModalRef.current?.close()}>
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
