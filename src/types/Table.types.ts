import type { Nullable } from "./lib.types.ts";
import type { WishHistory } from "./Wish.types.ts";

export type EventToTable = {
  [key in keyof WishHistory]: Nullable<HTMLTableElement>;
};
