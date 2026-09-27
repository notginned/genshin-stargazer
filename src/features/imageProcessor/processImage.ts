import { getOpenCv, translateException } from "./lib/opencv/opencv.ts";
import type {
  bbox,
  Rectangle,
  ScanRegions,
} from "../scanner/utils/scan.types.ts";
import {
  ITEM_NAME_BBOX,
  PAGE_COUNT_BBOX,
  TIME_RECEIVED_BBOX,
  WISH_TYPE_BBOX,
} from "../scanner/utils/config/bboxes.ts";
import { log } from "../../utils/lib.ts";
import { ImageError } from "../../utils/ImageError.ts";
import { createImageFromUrl } from "../../utils/imageFromUrl.ts";
import { Operation } from "gammacv";
import * as gm from "gammacv";

const gammaProcess = async (src: string) => {
  const height = 886;
  const width = 1920;
  const input = await gm.imageTensorFromURL(src, "uint8", [height, width, 4]);
  const whiteTensor = new gm.Tensor("uint8", [height, width, 4]);
  whiteTensor.data.fill(255);

  let pipeline: typeof input | Operation = input;
  pipeline = gm.grayscale(pipeline);
  pipeline = gm.threshold(pipeline, 0.76);
  pipeline = gm.sub(whiteTensor, pipeline);
  const output = gm.tensorFrom(pipeline);

  if (output === null) throw new Error("Error procesing");

  const sess = new gm.Session();
  sess.init(pipeline);

  sess.runOp(pipeline, 0, output);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  gm.canvasFromTensor(canvas, output);
  return canvas;
};

function getRectangle(bbox: bbox, image: HTMLCanvasElement): Rectangle {
  return {
    top: bbox.TOP_RATIO * image.height,
    left: bbox.LEFT_RATIO * image.width,
    width: bbox.WIDTH_RATIO * image.width,
    height: bbox.HEIGHT_RATIO * image.height,
  };
}

function calcRegions(image: HTMLCanvasElement): ScanRegions {
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

async function getScanRegion(src: string, hash: string): Promise<ScanRegions> {
  const output = await gammaProcess(src);
  output.dataset.hash = hash;

  if (!output) throw new Error("No offset found. Couldn't process image");
  log("processing", output);

  const region = calcRegions(output);
  log("region", region);
  // TODO: Implement diffing based scan

  return region;
}

export { gammaProcess, getScanRegion };
