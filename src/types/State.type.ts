import type { ScanRegions } from "../features/scanner/utils/scan.types.ts";
import type { SerializedImage } from "./DeserializedImage.ts";

export type ScannedImages = { [hash: string]: boolean };

export type ProcessedImages = { [hash: string]: ScanRegions };

export type Images = { [hash: string]: SerializedImage };
