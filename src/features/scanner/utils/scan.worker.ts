import type { Images } from "../../../types/State.type";
import type {
  ServerMessage,
  WorkerMessage,
} from "../../../types/WorkerMessage";
import { logError } from "../../../utils/lib";
import { processHistory } from "../../dataParser/processHistory";
import { preprocessImages } from "./preProcessImage";
import type { ScanRegions } from "./scan.types";
import { scanImages } from "./scanImages";

const sendMessage = (message: WorkerMessage) => {
  self.postMessage(message);
};

self.onmessage = async (e: MessageEvent<ServerMessage>) => {
  // console.log("worker", { type, images, processedImages });
  try {
    const { type } = e.data;
    switch (type) {
      case "process": {
        // log("From worker", e.data);
        const images = e.data.images;
        // const scannedImages = e.data.scannedImages;
        // TODO: Remove previously scanned images

        // Cannot use a cache because the Bitmaps get consumed upon scanning
        // plus processing is cheap anyways
        const arr = Object.values(images);
        const processedHashes = Object.keys(images);
        let counter = 0;
        const total = arr.length * 2;

        const preprocessed = await preprocessImages(arr, () =>
          sendMessage({ type: "progress", value: ++counter / total }),
        );
        const newHistory = await startScan(preprocessed, () =>
          sendMessage({ type: "progress", value: ++counter / total }),
        );

        // log("From worker", newHistory);
        sendMessage({ type: "result", newHistory, processedHashes });
        break;
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      logError(error);
      return;
    }
    sendMessage({ type: "error", error: error.message });
  }
};

// async function startProcessing(
//   images: Images,
//   processedImages: ProcessedImages,
// ) {
//   // console.log(isScanning);
//   const entries = Object.entries(images);
//   // logDebug({ entries });
//   // logDebug(processedImages);
//
//   const promises: [string, ScanRegions][] = await Promise.all(
//     entries.map(async ([hash, src]) => {
//       // log(hash);
//       // const out = await preProcessImage(src, hash);
//       // console.log(out);
//
//       if (processedImages[hash]) {
//         logDebug("Already processed this image", hash);
//         return [hash, processedImages[hash]];
//       }
//
//       const newScanRegion = await preProcessImage(src);
//       // drawBoxes(newScanRegion.image, Object.values(newScanRegion.rectangles));
//       // document.querySelector("header")?.appendChild(newScanRegion.image);
//
//       return [hash, newScanRegion];
//     }),
//   );
//   const result = Object.fromEntries(promises);
//
//   return { ...processedImages, ...result };
//
//   // setProcessedImages((prevHashes) => ({
//   //   ...prevHashes,
//   //   ...result,
//   // }));
//   // setImages({});
// }
//
async function startScan(queue: ScanRegions[], callback?: () => void) {
  const scanResults = await scanImages(queue, callback);

  if (scanResults.some((r) => r.itemName.length === 0)) {
    throw new Error("Could not scan image");
  }

  const newHistory = processHistory(scanResults);
  return newHistory;
}
