import type { Images } from "../../../types/State.type";
import { drawDebugRegions } from "./drawBoxes";
import { preprocessImages } from "./preProcessImage";
import type { Rectangle, ScanRegions } from "./scan.types";

const getSingleDebugImage = async (region: ScanRegions) => {
  const bitmap = await createImageBitmap(region.image);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");

  ctx?.drawImage(bitmap, 0, 0);
  drawDebugRegions(canvas, Object.values(region.rectangles));
  return canvas;
};

const getDebugImages = async (regions: ScanRegions[]) =>
  await Promise.all(regions.map(getSingleDebugImage));

export { getDebugImages };
