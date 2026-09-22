// import { PaddleOCR } from "@paddleocr/paddleocr-js";
import type { ScanRegions, ScanResult } from "./scan.types";

import { PaddleOcrService } from "ppu-paddle-ocr/web";

/* const myOcr = PaddleOCR.create({
  lang: "en",
  ocrVersion: "PP-OCRv5",
  worker: true,
  ortOptions: {
    backend: "auto",
    wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",
    numThreads: 4,
    simd: true,
  },
}); */

const service = new PaddleOcrService({
  debugging: {
    debug: false,
    verbose: true,
  },
  session: {
    executionMode: "parallel",
    executionProviders: ["wasm", "cuda"],
  },
});

/* async function scanSingleRegion(region: ScanRegions, scheduler: Scheduler) {
  try {
    return Promise.all(
      region.rectangles
        .map((rectangle) =>
          scheduler.scheduler.addJob(
            "recognize",
            region.image,
            { rectangle },
            { blocks: true, text: false },
          ),
        )
        .concat(
          scheduler.pageWorker.recognize(
            region.image,
            { rectangle: region.pageRectangle },
            { blocks: true, text: false },
          ),
        ),
    );
  } catch (error) {
    const srcImage = document.querySelector<HTMLImageElement>("#" + region.image.id.substring(7));
    if (!srcImage) throw new Error("No image found to scan", { cause: error });

    throw new ImageError("There was an error scanning the image", srcImage);
  }
} */

const cropRegion = (img, rectangle) => {
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

const ocrRegions = async (region: ScanRegions) => {
  const res: ScanResult = {} as ScanResult;

  const canvases = [
    region.itemNameRectangle,
    region.typeRectangle,
    region.timeRectangle,
    region.pageRectangle,
  ].map((r) => cropRegion(region.image, r));

  await service.initialize();
  const rps = await service.batchRecognize(canvases);
  await service.destroy();

  res.itemName = rps[0].text.split("\n");
  res.wishType = rps[1].text.split("\n");
  res.timeReceived = rps[2].text.split("\n");
  res.pageNumber = rps[3].text.split("\n");

  return res;
};

export async function scanImages(
  regions: ScanRegions[],
  callback: (region: ScanRegions) => void,
): Promise<ScanResult[]> {

  const res = await Promise.all(
    regions.map(async (region) => {
      callback(region);
      return ocrRegions(region);
    }),
  );

  return res;
}
