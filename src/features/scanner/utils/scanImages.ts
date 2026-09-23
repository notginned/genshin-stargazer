// import { PaddleOCR } from "@paddleocr/paddleocr-js";
import { logDebug } from "../../../utils/lib";
import type { Rectangle, ScanRegions, ScanResult } from "./scan.types";

import { PaddleOcrService } from "ppu-paddle-ocr/web";

const service = new PaddleOcrService({
  debugging: {
    debug: false,
    verbose: true,
  },
  session: {
    executionMode: "parallel",
    // Removing other backends breaks parallel processing for some reason??
    executionProviders: ["wasm", "webgpu", "cuda"],
  },
});

const cropRegion = (img: HTMLCanvasElement, rectangle: Rectangle) => {
  const canvas = document.createElement("canvas");
  canvas.width = rectangle.width;
  canvas.height = rectangle.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    rectangle.left,
    rectangle.top,
    rectangle.width,
    rectangle.height, // Destination canvas
    0,
    0,
    rectangle.width,
    rectangle.height, // Destination canvas
  );

  return canvas;
};

const scanSingleImage = async (region: ScanRegions) => {
  const res: ScanResult = {} as ScanResult;

  const canvases = [
    region.rectangles.itemNameRectangle,
    region.rectangles.typeRectangle,
    region.rectangles.timeRectangle,
    region.rectangles.pageRectangle,
  ].map((r) => cropRegion(region.image, r));

  await service.initialize();
  const rps = await service.batchRecognize(canvases);
  await service.destroy();

  res.itemName = rps[0].text;
  res.wishType = rps[1].text;
  res.timeReceived = rps[2].text;
  res.pageNumber = rps[3].text;

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

  return res;
}
