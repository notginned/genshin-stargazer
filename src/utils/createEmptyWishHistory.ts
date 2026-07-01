import type { WishHistory } from "../types/Wish.types.ts";

export function createEmptyWishHistory() {
  return {
    character_event_wish: [],
    weapon_event_wish: [],
    permanent_wish: [],
    beginners_wish: [],
    chronicled_wish: [],
  } as WishHistory;
}
