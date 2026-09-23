export interface Rectangle {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ScanRegions {
  image: HTMLCanvasElement;
  rectangles: {
    itemNameRectangle: Rectangle;
    typeRectangle: Rectangle;
    timeRectangle: Rectangle;
    pageRectangle: Rectangle;
  };
}

export interface bbox {
  TOP_RATIO: number;
  LEFT_RATIO: number;
  WIDTH_RATIO: number;
  HEIGHT_RATIO: number;
}

export interface ScanResult {
  itemName: string;
  wishType: string;
  timeReceived: string;
  pageNumber: string;
}
