import type { Images, ScannedImages } from "../../types/State.type";
import type { WishHistory } from "../../types/Wish.types";

type WorkerMessage =
  | { type: "result"; newHistory: WishHistory; scannedHashes: ScannedImages }
  | { type: "error"; error: string, image?: ImageBitmap }
  | { type: "progress"; value: number };

type ServerMessage = {
  type: "process";
  images: Images;
};

export type { WorkerMessage, ServerMessage };
