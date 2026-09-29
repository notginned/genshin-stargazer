// import { PaddleOCR } from "@paddleocr/paddleocr-js";
import type { Rectangle, ScanRegions, ScanResult } from "./scan.types";

import { ocr, PaddleOcrService } from "ppu-paddle-ocr/web";

export const service = new PaddleOcrService({
  debugging: {
    debug: false,
    verbose: false,
  },

  session: {
    // executionMode: "parallel",
    // Removing other backends breaks parallel processing for some reason??
    // executionProviders: ["wasm", "webgpu", "cpu", "cuda"],
  },
});

const cropRegion = async (image: OffscreenCanvas, rectangle: Rectangle) => {
  const canvas = new OffscreenCanvas(rectangle.width, rectangle.height);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(
    image, // source image
    rectangle.left, // source start x
    rectangle.top, // source start y
    rectangle.width, // crop width
    rectangle.height, // crop height
    0, // dest start x
    0, // dest start y
    rectangle.width, // dest width
    rectangle.height, // dest height
  );

  return canvas;
};

export const scanSingleImage = async (region: ScanRegions) => {
  const canvas = new OffscreenCanvas(region.image.width, region.image.height);
  const ctx = canvas.getContext("bitmaprenderer");
  ctx?.transferFromImageBitmap(region.image);

  const rects = await Promise.all(
    [
      region.rectangles.itemNameRectangle,
      region.rectangles.typeRectangle,
      region.rectangles.timeRectangle,
      region.rectangles.pageRectangle,
    ].map((r) => cropRegion(canvas, r)),
  );

  // Concurrency is a lie
  const rps = await service.batchRecognize(rects, { concurrency: 1 });
  // const rps = await Promise.all(rects.map((r) => ocr(r)));

  const res = {
    itemName: rps[0].text,
    wishType: rps[1].text,
    timeReceived: rps[2].text,
    pageNumber: rps[3].text,
  } satisfies ScanResult;

  return res;
};

export async function scanImages(
  regions: ScanRegions[],
  callback?: (result: ScanResult) => void,
): Promise<ScanResult[]> {
  try {
    const res = [];
    await service.initialize();
    for (const region of regions) {
      const result = await scanSingleImage(region);
      if (callback) callback(result);
      res.push(result);
    }
    await service.destroy();
    //     const res = await Promise.all(
    //       regions.map(async (region) => {
    //         const scanRes = await scanSingleImage(region);
    //         if (callback) callback();
    //
    //         return scanRes;
    //       }),
    //     );
    // await service.destroy();

    // const filtered = Object.values(
    //   res.reduceRight<{ [pageNumber: string]: ScanResult }>((acc, cur) => {
    //     acc[cur.pageNumber] = cur;
    //     return acc;
    //   }, {}),
    // );

    return res;
  } catch (e) {
    if (!(e instanceof Error)) throw new Error("Unable to scan an image");

    throw new Error(`Unable able to scan an image: ${e.message}`);
  }
}
