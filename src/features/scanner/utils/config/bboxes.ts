import type { bbox } from "../scan.types.ts";

// Bounding Boxes for scan regions
const TOP_RATIO = 0.199;
const HEIGHT_RATIO = 0.655;

const ITEM_NAME_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.192,
  WIDTH_RATIO: 0.247,
  HEIGHT_RATIO,
};

const WISH_TYPE_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.443,
  WIDTH_RATIO: 0.223,
  HEIGHT_RATIO,
};

const TIME_RECEIVED_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.675,
  WIDTH_RATIO: 0.26,
  HEIGHT_RATIO,
};

const PAGE_COUNT_BBOX: bbox = {
  TOP_RATIO: 0.87,
  LEFT_RATIO: 0.47,
  WIDTH_RATIO: 0.082,
  HEIGHT_RATIO: 0.082,
};

export {
  TOP_RATIO,
  HEIGHT_RATIO,
  ITEM_NAME_BBOX,
  WISH_TYPE_BBOX,
  TIME_RECEIVED_BBOX,
  PAGE_COUNT_BBOX,
};
