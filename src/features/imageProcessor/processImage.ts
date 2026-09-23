import type { Rectangle } from "tesseract.js";
import { getOpenCv, translateException } from "./lib/opencv/opencv.ts";
import type { bbox, ScanRegions } from "../scanner/utils/scan.types.ts";
import {
  ITEM_NAME_BBOX,
  PAGE_COUNT_BBOX,
  TIME_RECEIVED_BBOX,
  WISH_TYPE_BBOX,
} from "../scanner/utils/config/bboxes.ts";
// import { ImageError } from "../../utils/ImageError.ts";

async function preprocessImage(input: HTMLImageElement) {
  try {
    const output = document.createElement("canvas");
    // Should never happen
    if (input.dataset.hash === undefined) throw new Error("Image does not exist");

    // Copy image hash to our processed canvas
    output.dataset.hash = input.dataset.hash;


    const cv = await getOpenCv();
    const src = cv.imread(input);
    const dst = new cv.Mat();

    // Resizing while maintaining aspect ratio for faster OCR
    if (input.width > 1920)
      cv.resize(
        src,
        src,
        new cv.Size(1920, (1920 * input.height) / input.width),
        0,
        0,
        cv.INTER_AREA,
      );

    // Grayscaling
    cv.cvtColor(src, dst, cv.COLOR_BGR2GRAY);

    // Thresholding
    cv.threshold(dst, dst, 175, 255, cv.THRESH_BINARY);
    cv.bitwise_not(dst, dst);

    // Hough Line Transform
    // To crop the wish table
    const lines = new cv.Mat();
    const edges = new cv.Mat();
    cv.Canny(dst, edges, 50, 200, 3);
    cv.HoughLinesP(edges, lines, 1, Math.PI / 90, 5, 250, 4);

    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    for (let i = 0; i < lines.rows; ++i) {
      // x1: i * 4
      // y1: i * 4 + 1
      minX = Math.min(minX, lines.data32S[i * 4]);
      minY = Math.min(minY, lines.data32S[i * 4 + 1]);

      // x2: i * 4 + 2
      // y2: i * 4 + 3
      maxX = Math.max(maxX, lines.data32S[i * 4 + 2]);
      maxY = Math.max(maxY, lines.data32S[i * 4 + 3]);
    }

    const height = maxY - minY;
    const width = maxX - minX;

    cv.imshow(output, dst);

    // release resources
    edges.delete();
    lines.delete();
    src.delete();
    dst.delete();

    return {
      image: output,
      rectangle: {
        top: minY,
        left: minX,
        height,
        width,
      },
    };
  } catch (err: unknown) {
    // @ts-expect-error
    // it is probably fine
    console.error(translateException(cv, err));
  }
}

function getRectangle(
  bbox: bbox,
  offset: { top: number; left: number; height: number; width: number },
): Tesseract.Rectangle {
  return {
    top: offset.top + bbox.TOP_RATIO * offset.height,
    left: offset.left + bbox.LEFT_RATIO * offset.width,
    width: bbox.WIDTH_RATIO * offset.width,
    height: bbox.HEIGHT_RATIO * offset.height,
  };
}

function calcRegions(image: HTMLCanvasElement, offset: Rectangle): ScanRegions {
  const pageRectangle = getRectangle(PAGE_COUNT_BBOX, offset);
  const itemNameRectangle = getRectangle(ITEM_NAME_BBOX, offset);
  const typeRectangle = getRectangle(WISH_TYPE_BBOX, offset);
  const timeRectangle = getRectangle(TIME_RECEIVED_BBOX, offset);

  return {
    image,
    itemNameRectangle,
    typeRectangle,
    timeRectangle,
    pageRectangle,
  } satisfies ScanRegions;
}

async function getScanRegion(inputEl: HTMLImageElement) {
  const output = await preprocessImage(inputEl);

  if (!output) throw new Error("No offset found. Couldn't process image");
  console.log("processing", output);

  const region = calcRegions(output.image, output.rectangle);
  console.log("region", region);

  // There is a NaN or Infinity hidden in our rectangles' bounds
  // This means the image was not a valid wish history screenshot
  /*   if (
    Object.values(region).some((rect) =>
      Object.values(rect).some((value) => Number.isNaN(value) || !Number.isFinite(value)),
    )
  ) {
    throw new ImageError("There was a problem scanning this image.", inputEl);
  } */

  return region;
}

export { getScanRegion };
