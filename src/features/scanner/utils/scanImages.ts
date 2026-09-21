import type { ScanRegions, ScanResult } from "./scan.types";

import { PaddleOCR } from "@paddleocr/paddleocr-js";
import * as ort from "onnxruntime-node";
import { ocr, PaddleOcrService, RecognitionService } from "ppu-paddle-ocr/web";

const myOcr = PaddleOCR.create({
  lang: "en",
  ocrVersion: "PP-OCRv5",
  worker: true,
  ortOptions: {
    backend: "auto",
    wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",
    numThreads: 4,
    simd: true
  }
});

const service = new PaddleOcrService({
  debugging: {
    debug: false,
    verbose: true,
  },
});


const infS = await ort.InferenceSession.create("./models/PP-OCRv6_tiny_rec.onnx");
const recS = new RecognitionService(infS);


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

const cropRegion = (img, rectangle, canvas) => {
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
};

const ocrRegions = async (region: ScanRegions) => {
  const canvas = document.createElement("canvas");
  const res: ScanResult = {} as ScanResult;

  cropRegion(region.image, region.itemNameRectangle, canvas);
  // res.itemName = (await o.predict(canvas))[0].items.map((it) => it.text + "\n");
  const rect = region.itemNameRectangle;
 
  res.itemName = (await recS.run(canvas, {x: rect.left, y: rect.top, width: rect.width, height: rect.height }))[0].text.split("\n");

  cropRegion(region.image, region.typeRectangle, canvas);
  // res.wishType = (await o.predict(canvas))[0].items.map((it) => it.text + "\n");
  res.wishType = (await service.recognize(canvas)).text.split('\n');

  cropRegion(region.image, region.timeRectangle, canvas);
  res.timeReceived = (await service.recognize(canvas)).text.split('\n');
  // res.timeReceived = (await o.predict(canvas))[0].items.map((it) => it.text + "\n");

  cropRegion(region.image, region.pageRectangle, canvas);
  res.pageNumber = (await service.recognize(canvas)).text.split('\n');
  // res.pageNumber = (await o.predict(canvas))[0].items.map((it) => it.text + "\n");

  console.log(res);
  return res;
};

export async function scanImages(
  regions: ScanRegions[],
  callback: (region: ScanRegions) => void,
): Promise<ScanResult[]> {
  await service.initialize();

  const res = await Promise.all(
    regions.map(async (region) => {
      callback(region);
      return ocrRegions(region);
    }),
  );


  
  console.log("res", res);

  return res;
}
