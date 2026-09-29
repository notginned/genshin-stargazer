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
import type { Images } from "../../../types/State.type.ts";

const tensorFromBitmap = async (image: ImageBitmap) => {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Couldnt create tensor");

  ctx.drawImage(image, width, height);
  const data = ctx?.getImageData(0, 0, width, height);
  const tensorData = new Uint8Array(data.data.buffer);

  return new gm.Tensor("uint8", [height, width, 4], tensorData);
};

const gammaProcess = async (image: ImageBitmap, hash: string) => {
  const { height, width } = image;
  const newWidth = 1920;
  const newHeight = Math.round((height * 1920) / width);

  const bitmapCanvas = new OffscreenCanvas(width, height);
  const bitmapCtx = bitmapCanvas.getContext("bitmaprenderer");
  bitmapCtx?.transferFromImageBitmap(image);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmapCanvas, 0, 0);

  const input = new gm.Tensor("uint8", [height, width, 4]);

  // @ts-expect-error
  gm.canvasToTensor(canvas, input);

  const whiteTensor = new gm.Tensor("uint8", [newHeight, newWidth, 4]);
  whiteTensor.data.fill(255);

  let pipeline: typeof input | Operation = input;
  pipeline = gm.resize(pipeline, newWidth, newHeight, "bicubic");
  pipeline = gm.gaussianBlur(pipeline, 3, 1);
  pipeline = gm.grayscale(pipeline);
  pipeline = gm.threshold(pipeline, 0.78);
  pipeline = gm.erode(pipeline, [1, 1]);
  pipeline = gm.dilate(pipeline, [2, 2]);
  pipeline = gm.sub(whiteTensor, pipeline);
  const output = gm.tensorFrom(pipeline);

  if (output === null) {
    throw new Error("Error procesing");
  }

  const sess = new gm.Session();
  sess.init(pipeline);

  sess.runOp(pipeline, 0, output);

  // log(output.data);

  const outputCanvas = new OffscreenCanvas(newWidth, newHeight);
  // @ts-expect-error
  gm.canvasFromTensor(outputCanvas, output);

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

  // output.dataset.hash = hash;

  if (!output) throw new Error("No offset found. Couldn't process image");
  // log("processing", output);

  const region = calcRegions(output.data, output.hash);
  // log("region", region);
  // TODO: Implement diffing based scan

  return region;
}

async function preprocessImages(
  images: SerializedImage[],
  callback?: (idx: number) => void,
): Promise<ScanRegions[]> {
  const res = await Promise.all(
    images.map(async (img, idx) => {
      const bitmap = await createImageBitmap(img.file);
      const processed = await preprocessSingleImage(bitmap, img.hash);

      if (callback) callback(idx);
      return processed;
    }),
  );
  return res;
}

export { gammaProcess, preprocessImages };
