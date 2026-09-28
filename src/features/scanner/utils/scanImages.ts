// import { PaddleOCR } from "@paddleocr/paddleocr-js";
import type { SerializedImage } from "../../../types/DeserializedImage";
import { logDebug } from "../../../utils/lib";
import type { Rectangle, ScanRegions, ScanResult } from "./scan.types";

import { PaddleOcrService } from "ppu-paddle-ocr/web";

export const service = new PaddleOcrService({
  debugging: {
    debug: false,
    verbose: false,
  },
  session: {
    executionMode: "parallel",
    // Removing other backends breaks parallel processing for some reason??
    executionProviders: ["wasm", "webgpu", "cpu", "cuda"],
  },
});

const cropRegion = async (img: SerializedImage, rectangle: Rectangle) => {
  // const canvas = document.createElement("canvas");
  // canvas.width = rectangle.width;
  // canvas.height = rectangle.height;
  // const ctx = canvas.getContext("2d")!;
  const canvas = new OffscreenCanvas(rectangle.width, rectangle.height);
  const ctx = canvas.getContext("bitmaprenderer");
  ctx?.transferFromImageBitmap(img.data);

  return canvas;
};

const scanSingleImage = async (region: ScanRegions) => {
  const canvases = await Promise.all(
    [
      region.rectangles.itemNameRectangle,
      region.rectangles.typeRectangle,
      region.rectangles.timeRectangle,
      region.rectangles.pageRectangle,
    ].map((r) => cropRegion(region.image, r)),
  );

  await service.initialize();
  const rps = await service.batchRecognize(canvases);
  await service.destroy();
  const res = {
    itemName: rps[0].text,
    wishType: rps[1].text,
    timeReceived: rps[2].text,
    pageNumber: rps[3].text,
  } satisfies ScanResult;

  logDebug("res", res);

  return res;
};

export async function scanImages(
  regions: ScanRegions[],
  callback: (region: ScanRegions) => void = (region) => logDebug(region),
): Promise<ScanResult[]> {
  const res = await Promise.all(
    regions.map(async (region) => {
      callback(region);
      return scanSingleImage(region);
    }),
  );
  const filtered = Object.values(
    res.reduce<{ [pageNumber: string]: ScanResult }>((acc, cur) => {
      acc[cur.pageNumber] = cur;
      return acc;
    }, {}),
  );

  console.error(filtered);

  return filtered;
}
