import type { bbox } from "../scan.types.ts";

// Bounding Boxes for scan regions
const TOP_RATIO = 0.260;
const HEIGHT_RATIO = 0.53;

const ITEM_NAME_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.286,
  WIDTH_RATIO: 0.150,
  HEIGHT_RATIO,
};

const WISH_TYPE_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.443,
  WIDTH_RATIO: 0.135,
  HEIGHT_RATIO,
};

const TIME_RECEIVED_BBOX: bbox = {
  TOP_RATIO,
  LEFT_RATIO: 0.596,
  WIDTH_RATIO: 0.185,
  HEIGHT_RATIO,
};

const PAGE_COUNT_BBOX: bbox = {
  TOP_RATIO: 0.59,
  LEFT_RATIO: 0.46,
  WIDTH_RATIO: 0.060,
  HEIGHT_RATIO: 0.470,
};

export {
  TOP_RATIO,
  HEIGHT_RATIO,
  ITEM_NAME_BBOX,
  WISH_TYPE_BBOX,
  TIME_RECEIVED_BBOX,
  PAGE_COUNT_BBOX,
};
