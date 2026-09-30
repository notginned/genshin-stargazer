import type { bbox, Rectangle, ScanRegions } from "./scan.types.ts";
import {
  ITEM_NAME_BBOX,
  PAGE_COUNT_BBOX,
  TIME_RECEIVED_BBOX,
  WISH_TYPE_BBOX,
} from "./config/bboxes.ts";
import { log } from "../../../utils/lib.ts";
// import { ImageError } from "../../utils/ImageError.ts";
import { Operation } from "gammacv";
import * as gm from "gammacv";
import type { SerializedImage } from "../../../types/DeserializedImage.ts";

const getBounds = (canvas: OffscreenCanvas) => {
  const input = new gm.Tensor("uint8", [canvas.height, canvas.width, 4]);
  // OffscreenCanvas works just fine
  // @ts-expect-error
  gm.canvasToTensor(canvas, input);

  let pipeline: typeof input | Operation = input;

  pipeline = gm.gaussianBlur(pipeline, 13, 1);
  pipeline = gm.grayscale(pipeline);
  pipeline = gm.sobelOperator(pipeline);
  pipeline = gm.cannyEdges(pipeline, 0.4, 0.5);

  const output = gm.tensorFrom(pipeline);

  if (output === null) {
    throw new Error("Error procesing");
  }

  const sess = new gm.Session();
  sess.init(pipeline);
  sess.runOp(pipeline, 0, output);

  let minX = Infinity;
  let maxX = 0;

  let minY = Infinity;
  let maxY = 0;

  console.log("78, 232", output.get(78, 232, 4));
  for (let x = 0; x < output.shape[1]; ++x) {
    for (let y = 0; y < output.shape[0]; ++y) {
      const pix = output.get(x, y, 4);
      if (pix !== 255) continue;

      minX = Math.min(x, minX);
      maxX = Math.max(x, maxX);

      minY = Math.min(y, minY);
      maxY = Math.max(y, maxY);
    }
  }

  sess.destroy();

  return { minX, maxX, minY, maxY };
};

const gammaProcess = async (image: ImageBitmap, hash: string) => {
  const { height, width } = image;

  const newWidth = 1920;
  const newHeight = Math.round((height * 1920) / width);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(image, 0, 0, image.width, image.height);

  const input = new gm.Tensor("uint8", [height, width, 4]);

  // OffscreenCanvas works just fine
  // @ts-expect-error
  gm.canvasToTensor(canvas, input);

  const whiteTensor = new gm.Tensor("uint8", [newHeight, newWidth, 4]);
  whiteTensor.data.fill(255);

  let pipeline: typeof input | Operation = input;

  // pipeline = gm.resize(pipeline, newWidth, newHeight, "bicubic");
  // pipeline = gm.gaussianBlur(pipeline, 3, 1);
  // pipeline = gm.grayscale(pipeline);
  // pipeline = gm.threshold(pipeline, 0.78);
  // pipeline = gm.sub(whiteTensor, pipeline);
  // pipeline = gm.erode(pipeline, [1, 1]);
  // pipeline = gm.dilate(pipeline, [1, 1]);


  pipeline = gm.resize(pipeline, newWidth, newHeight, "bicubic");
  pipeline = gm.gaussianBlur(pipeline, 13, 1);
  pipeline = gm.grayscale(pipeline);
  pipeline = gm.sobelOperator(pipeline);
  pipeline = gm.cannyEdges(pipeline, 0.4, 0.5);


  const output = gm.tensorFrom(pipeline);
  if (output === null) {
    throw new Error("Error procesing");
  }

  const sess = new gm.Session();
  sess.init(pipeline);
  sess.runOp(pipeline, 0, output);

  const outputCanvas = new OffscreenCanvas(newWidth, newHeight);
  // OffscreenCanvas works just fine
  // @ts-expect-error
  gm.canvasFromTensor(outputCanvas, output);

  const bounds = getBounds(canvas);
  console.log(bounds);

  // Free up memory
  sess.destroy();

  const imageBitmap = await createImageBitmap(outputCanvas);

  return { hash: hash, data: imageBitmap };
};

function getRectangle(bbox: bbox, image: ImageBitmap): Rectangle {
  return {
    top: bbox.TOP_RATIO * image.height,
    left: bbox.LEFT_RATIO * image.width,
    width: bbox.WIDTH_RATIO * image.width,
    height: bbox.HEIGHT_RATIO * image.height,
  };
}

function calcRegions(image: ImageBitmap, hash: string): ScanRegions {
  const pageRectangle = getRectangle(PAGE_COUNT_BBOX, image);
  const itemNameRectangle = getRectangle(ITEM_NAME_BBOX, image);
  const typeRectangle = getRectangle(WISH_TYPE_BBOX, image);
  const timeRectangle = getRectangle(TIME_RECEIVED_BBOX, image);

  return {
    image,
    hash,
    rectangles: {
      itemNameRectangle,
      typeRectangle,
      timeRectangle,
      pageRectangle,
    },
  } satisfies ScanRegions;
}

async function preprocessSingleImage(
  image: ImageBitmap,
  hash: string,
): Promise<ScanRegions> {
  const output = await gammaProcess(image, hash);

  if (!output) throw new Error("No offset found. Couldn't process image");

  const region = calcRegions(output.data, output.hash);
  // TODO: Implement diffing based scan

  return region;
}

async function preprocessImages(
  images: SerializedImage[],
  callback?: (region: ScanRegions, idx: number) => void,
): Promise<ScanRegions[]> {
  const res = await Promise.all(
    images.map(async (img, idx) => {
      const bitmap = await createImageBitmap(img.file);
      const region = await preprocessSingleImage(bitmap, img.hash);

      if (callback) callback(region, idx);
      return region;
    }),
  );
  return res;
}

export { gammaProcess, preprocessImages };
