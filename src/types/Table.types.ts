import type { Nullable } from "./lib.types.ts";
import type { WishHistory } from "./Wish.types.ts";

export interface EventToTable {
  [key: keyof WishHistory]: Nullable<HTMLTableElement>;
}
