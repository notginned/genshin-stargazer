import type { RecognizeResult } from "tesseract.js";
import type { ScanRegions } from "./scan.types";
import type { Scheduler } from "./Scheduler.ts";
import { ImageError } from "../../../utils/ImageError.ts";

import { PaddleOCR } from "@paddleocr/paddleocr-js";

const ocr = PaddleOCR.create({
  worker: true,
  ortOptions: {
    numThreads: 2,
    simd: true
  }
});

async function scanSingleRegion(region: ScanRegions, scheduler: Scheduler) {
  try {
    return Promise.all(region.rectangles
      .map((rectangle) =>
        scheduler.scheduler.addJob(
          "recognize",
          region.image,
          { rectangle },
          { blocks: true, text: false }
        )
      )
      .concat(
        scheduler.pageWorker.recognize(
          region.image,
          { rectangle: region.pageRectangle },
          { blocks: true, text: false }
        )
      ));
  } catch (error) {
    const srcImage = document.querySelector<HTMLImageElement>(
      "#" + region.image.id.substring(7)
    );
    if (!srcImage) throw new Error("No image found to scan", { cause: error });

    throw new ImageError("There was an error scanning the image", srcImage);
  }
}

const ocrRegions = async (region: ScanRegions) => {
  const o = await ocr;
  const canvas = document.createElement("canvas");
  const rectangle = region.rectangles[0]
  canvas.width = rectangle.width;
  canvas.height = rectangle.height;
  
  const ctx = canvas.getContext("2d")!;  
  ctx.drawImage(
      region.image, 
      rectangle.left, rectangle.top, rectangle.width, rectangle.height,         // Destination canvas
      0, 0, rectangle.width, rectangle.height         // Destination canvas
  );

  console.log(region);
  const text = await o.predict(canvas);      
  console.log(text);
}

export async function scanImages(
  regions: ScanRegions[],
  scheduler: Scheduler,
  callback: (region: ScanRegions) => void
): Promise<RecognizeResult[][]> {
  const results = await Promise.all(
    regions.map(async (region) => {
      await ocrRegions(region);
      return scanSingleRegion(region, scheduler).then((data) => {
        callback(region);
        return data;
      })
    }
    )
  );
  
  return results;
}
