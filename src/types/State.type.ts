import type { ScanRegions } from "../features/scanner/utils/scan.types.ts";

export type ScannedImages = { [hash: string]: boolean };

export type ProcessedImages = { [hash: string]: ScanRegions };

export type Images = { [hash: string]: string };

export type Videos = { [hash: string]: string };
