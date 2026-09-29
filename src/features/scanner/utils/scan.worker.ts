import type { Images } from "../../../types/State.type";
import { log } from "../../../utils/lib";
import { processHistory } from "../../dataParser/processHistory";
import { preprocessImages } from "./preProcessImage";
import type { ScanRegions } from "./scan.types";
import { scanImages, service } from "./scanImages";

const serviceLoaded = async () => {
  await service.initialize();
  await service.destroy();
  return true;
};

self.onmessage = async (e: MessageEvent<{ type: string; images: Images }>) => {
  // console.log("worker", { type, images, processedImages });
  try {
    const { type } = e.data;
    switch (type) {
      case "process": {
        // Warming up the service
        await serviceLoaded();
        // log("From worker", e.data);
        const images = e.data.images;

        // Cannot use a cache because the Bitmaps get consumed upon scanning
        // plus processing is cheap anyways
        const arr = Object.values(images);
        let counter = 0;
        const total = arr.length * 2;
        const preprocessed = await preprocessImages(arr, () =>
          postMessage({ type: "progress", value: ++counter / total }),
        );
        const newHistory = await startScan(preprocessed, () =>
          postMessage({ type: "progress", value: ++counter / total }),
        );

        // log("From worker", newHistory);
        self.postMessage({ type: "result", newHistory });
        break;
      }
    }
  } catch (error) {
    self.postMessage({ type: "error", error });
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
