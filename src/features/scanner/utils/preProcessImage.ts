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

const gammaProcess = async (
  image: SerializedImage,
): Promise<SerializedImage> => {
  const { height, width } = image.data;
  const newWidth = 1920;
  const newHeight = Math.round((height * 1920) / width);
  // const input = await gm.imageTensorFromURL(image, "uint8", [height, width, 4]);
  const input = await tensorFromBitmap(image.data);

  const whiteTensor = new gm.Tensor<Uint8Array<ArrayBufferLike>>("uint8", [
    newHeight,
    newWidth,
    4,
  ]);
  whiteTensor.data.fill(255);

  let pipeline: typeof input | Operation = input;
  pipeline = gm.resize(pipeline, newWidth, newHeight, "nearest");
  pipeline = gm.grayscale(pipeline);
  pipeline = gm.threshold(pipeline, 0.76);
  pipeline = gm.sub(whiteTensor, pipeline);
  const output = gm.tensorFrom(pipeline);

  if (output === null) {
    throw new Error("Error procesing");
  }

  const sess = new gm.Session();
  sess.init(pipeline);

  sess.runOp(pipeline, 0, output);

  log(output.data);

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  // @ts-expect-error
  gm.canvasFromTensor(canvas, output);

  const imageBitmap = await createImageBitmap(canvas);

  return { hash: image.hash, data: imageBitmap } satisfies SerializedImage;
};

function getRectangle(bbox: bbox, image: SerializedImage): Rectangle {
  return {
    top: bbox.TOP_RATIO * image.data.height,
    left: bbox.LEFT_RATIO * image.data.width,
    width: bbox.WIDTH_RATIO * image.data.width,
    height: bbox.HEIGHT_RATIO * image.data.height,
  };
}

function calcRegions(image: SerializedImage): ScanRegions {
  const pageRectangle = getRectangle(PAGE_COUNT_BBOX, image);
  const itemNameRectangle = getRectangle(ITEM_NAME_BBOX, image);
  const typeRectangle = getRectangle(WISH_TYPE_BBOX, image);
  const timeRectangle = getRectangle(TIME_RECEIVED_BBOX, image);

  return {
    image,
    rectangles: {
      itemNameRectangle,
      typeRectangle,
      timeRectangle,
      pageRectangle,
    },
  } satisfies ScanRegions;
}

async function preProcessImage(image: SerializedImage): Promise<ScanRegions> {
  const output = await gammaProcess(image);

  // output.dataset.hash = hash;

  if (!output) throw new Error("No offset found. Couldn't process image");
  log("processing", output);

  const region = calcRegions(output);
  log("region", region);
  // TODO: Implement diffing based scan

  return region;
}

export { preProcessImage };
