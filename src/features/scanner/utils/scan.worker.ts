import type { Images, ProcessedImages } from "../../../types/State.type";
import { logDebug } from "../../../utils/lib";
import { preProcessImage } from "./preProcessImage";
import type { ScanRegions } from "./scan.types";

self.onmessage = async (e: MessageEvent) => {
  const { type, images, processedImages } = e.data;
  console.log("worker", { type, images, processedImages });
  const result = await startProcessing(images, processedImages);
  console.log('inside worker', result);
  postMessage(result);
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
