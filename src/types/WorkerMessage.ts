import type { Images, ScannedImages } from "./State.type";
import type { WishHistory } from "./Wish.types";

type WorkerMessage =
  | { type: "result"; newHistory: WishHistory; processedHashes: string[] }
  | { type: "error"; error: string }
  | { type: "progress"; value: number };

type ServerMessage = {
  type: "process";
  images: Images;
  scannedImages: ScannedImages;
};

export type { WorkerMessage, ServerMessage };
