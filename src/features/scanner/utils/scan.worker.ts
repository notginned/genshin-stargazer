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

        const arr = Object.values(images);
        const processedHashes = Object.keys(images);
        let counter = 0.25;
        const total = arr.length + 0.25;

        const preprocessed = await preprocessImages(arr);
        sendMessage({ type: "progress", value: 0.25 });

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

async function startScan(queue: ScanRegions[], callback?: () => void) {
  const scanResults = await scanImages(queue, callback);

  if (scanResults.some((r) => r.itemName.length === 0)) {
    throw new Error("Could not scan image");
  }

  const newHistory = processHistory(scanResults);
  return newHistory;
}
