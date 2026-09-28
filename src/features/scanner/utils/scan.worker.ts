import type { Images, ProcessedImages } from "../../../types/State.type";
import { log, logDebug } from "../../../utils/lib";
import { processHistory } from "../../dataParser/processHistory";
import { gammaProcess, preProcessImage } from "./preProcessImage";
import type { ScanRegions } from "./scan.types";
import { scanImages } from "./scanImages";

self.onmessage = async (e: MessageEvent<{ type: string; images: Images, processedImages: ProcessedImages }>) => {
  // console.log("worker", { type, images, processedImages });
  const { type } = e.data;
  switch (type) {
    case "process": {
      log("From worker", e.data);
      const res = Object.values(e.data.images);
      const img = await createImageBitmap(res[0].file);
      const hash = res[0].hash;
      log("Images: From worker", img);
      // const preprocessed = await gammaProcess(img, hash);
      // log("Processed", preprocessed);
      const processed = await preProcessImage(img, hash);
      log("Processed", processed);
      // const scanQueue = await startProcessing(images, processedImages);
      // console.log("inside worker", { scanQueue });

      // const result = await startScan(Object.values(scanQueue));
      // console.log("inside worker result", { result });
      // return postMessage(result);
    }
  }
};

async function startProcessing(
  images: Images,
  processedImages: ProcessedImages,
) {
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

      const newScanRegion = await preProcessImage(src);
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
}

async function startScan(queue: ScanRegions[]) {
  const scanResults = await scanImages(queue);

  if (scanResults.some((r) => r.itemName.length === 0)) {
    throw new Error("Could not scan image");
  }

  const newHistory = processHistory(scanResults);
  return newHistory;
}
