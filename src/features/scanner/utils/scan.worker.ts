import { type ScannedImages } from "../../../types/State.type";
import type {
  ServerMessage,
  WorkerMessage,
} from "../../../types/WorkerMessage";
import { ImageError } from "../../../utils/ImageError";
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

        const raws = Object.values(images);
        const scannedHashes = Object.keys(images).reduce<ScannedImages>(
          (acc, cur) => {
            acc[cur] = true;
            return acc;
          },
          {},
        );

        let counter = 0;
        const total = raws.length * 3;

        // More weight to scanning because it's slower
        const preprocessed = await preprocessImages(raws, () => {
          sendMessage({
            type: "progress",
            value: (counter = counter + 1) / total,
          });
        });

        const newHistory = await startScan(preprocessed, () =>
          sendMessage({
            type: "progress",
            value: (counter = counter + 2) / total,
          }),
        );

        // log("From worker", newHistory);
        sendMessage({ type: "result", newHistory, scannedHashes });
        break;
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      logError(error);
      return;
    }

    // Our error has an image :D
    if (error instanceof ImageError)
      return sendMessage({
        type: "error",
        error: error.message,
        image: error.image,
      });

    // no image :(
    sendMessage({ type: "error", error: error.message });
  }
};

async function startScan(queue: ScanRegions[], callback?: () => void) {
  const scanResults = await scanImages(queue, callback);

  if (scanResults.some((r) => r.itemName.length === 0)) {
    throw new Error("Could not scan image");
  }

  const newHistory = processHistory(scanResults);
  return newHistory;
}
