import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { scanImages } from "../utils/scanImages.ts";
import type { ScanRegions } from "../utils/scan.types.ts";
import { processHistory } from "../../dataParser/processHistory.ts";
import type { WishHistory } from "../../../types/Wish.types.ts";
import { getScanRegion } from "../../imageProcessor/processImage.ts";
import { Modal } from "../../../components/Modal.tsx";
import type { Images, ProcessedImages, ScannedImages } from "../../../types/State.type.ts";
import { ImageError } from "../../../utils/ImageError.ts";
import { ScanResultsModal } from "./ScanResultsModal.tsx";
import { ProgressIndicator } from "../../../components/ProgressIndicator.tsx";

interface ScannerProps {
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
  scannedImages: ScannedImages;
  setScannedImages: Dispatch<SetStateAction<ScannedImages>>;
  saveHistory: (newHistory: WishHistory) => void;
  processedImages: ProcessedImages;
  setProcessedImages: Dispatch<SetStateAction<ProcessedImages>>;
}

function Scanner({
  images,
  setImages,
  scannedImages,
  setScannedImages,
  processedImages,
  setProcessedImages,
  saveHistory,
}: ScannerProps) {
  const [progress, setProgress] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<ImageError | null>(null);
  const errorModalRef = useRef<HTMLDialogElement | null>(null);

  // There was an error processing the image
  if (error) {
    console.error(error);
    errorModalRef.current?.showModal();
  }

  // Happy path
  const scanQueue = Object.values(processedImages).filter(
    (region) => !scannedImages[region.image.id],
  );

  // +1 so that the progress isn't 100% from the start for single images
  const progressPercent = Math.round((progress * 100) / (scanQueue.length + 1));

  const [scanResultTable, setScanResultTable] = useState<WishHistory | null>(null);
  const resultsModalRef = useRef<HTMLDialogElement | null>(null);

  if (scanResultTable) {
    if (resultsModalRef.current) resultsModalRef.current.showModal();
  }

  const allImagesLoaded = Object.keys(images).every((hash) => processedImages[hash]);

  const allImagesScanned = scanQueue.length === 0;

  if (allImagesLoaded) {
    console.debug("Loaded all images");
  }

  const handleErrorModalClose = useCallback(() => {
    if (!error) return;

    setImages({});
    setProcessedImages((prevImages) => {
      const newImages = { ...prevImages };
      delete newImages[error.image.id];
      return newImages;
    });
    setError(null);
  }, [setImages, setProcessedImages, error]);

  const clearScanQueue = useCallback(() => {
    setIsScanning(false);
    setImages({});
    setProgress(1);
  }, [setImages]);

  // Image Processing
  const handleLoad = useCallback(
    async (hash: string) => {
      try {
        if (processedImages[hash]) {
          console.debug("Already processed");

          setImages((prevImages) => {
            const res = { ...prevImages };
            delete res[hash];
            return res;
          });

          return;
        }

        const inputEl = document.querySelector<HTMLImageElement>("#" + hash);

        if (inputEl === null) throw new Error("Can't find image to process");

        const newScanRegion = await getScanRegion(inputEl);

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
      console.debug("Already scanning");
      return;
    }
    console.debug("clicked", { scanQueue });

    // No new images
    if (scanQueue.length === 0) {
      console.debug("There are no new images");
      clearScanQueue();
      return;
    }

    // Critical Section
    setIsScanning(true);
    try {
      const scanResults = await scanImages(scanQueue, (region: ScanRegions) => {
        console.debug("Scanning image", region.image.id);
        setProgress((p) => (p += 1));
      });
      console.log("scan results", scanResults);

      const newHistory = processHistory(scanResults);
      console.log("newHistory", newHistory);

      saveHistory(newHistory);
      setScanResultTable(newHistory);

      // Set scanned images only after data state is set
      // to avoid inconsistent cache
      setScannedImages((oldImages) => ({
        ...oldImages,
        // Reducing our array of newly scanned rectangles into a object of hashes
        ...scanQueue.reduce<{ [hash: string]: boolean }>((acc, cur) => {
          acc[cur.image.id] = true;
          return acc;
        }, {}),
      }));
    } catch (error) {
      if (error instanceof ImageError) setError(error);
    }

    // Cleanup
    // Reset scan state
    clearScanQueue();
    setIsScanning(false);
  }, [isScanning, saveHistory, scanQueue, setScannedImages, clearScanQueue]);

  return (
    <>
      {!allImagesLoaded && <ProgressIndicator />}

      {allImagesLoaded && !isScanning && !allImagesScanned && (
        <button type="button" className="btn btn-scan" onClick={handleClick}>
          Scan ({scanQueue.length})
        </button>
      )}
      {isScanning && <ProgressIndicator value={progressPercent.toString()} />}

      <section className="images">
        {Object.entries(images).map(([hash, src]) => (
          <Fragment key={hash}>
            <img
              className="src_image"
              id={hash}
              src={src}
              alt="sample"
              onLoad={() => handleLoad(hash)}
            ></img>
          </Fragment>
        ))}
      </section>

      <Modal
        title="Error"
        className="error-modal"
        ref={errorModalRef}
        onClose={handleErrorModalClose}
      >
        <span>
          {(error?.message || "There was an error processing the image") +
            " Please reupload the images"}
        </span>
        <img src={error?.image.src} alt="error-image" className="error-image" />
        <button className="btn" onClick={() => errorModalRef.current?.close()}>
          Okay
        </button>
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
