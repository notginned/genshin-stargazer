import type { ScanResult } from "../scanner/utils/scan.types.ts";
import { createEmptyWishHistory } from "../../utils/createEmptyWishHistory.ts";
import { historyReducer, sortWishHistory } from "./historyReducer.ts";
import type { WishHistory } from "../../types/Wish.types.ts";
import { parseScanResults } from "./parseData.ts";

function processHistory(history: ScanResult[]) {
  return sortWishHistory(
    history
      .map(parseScanResults)
      .reduce<WishHistory>(historyReducer, createEmptyWishHistory())
  );
}

export { processHistory };
