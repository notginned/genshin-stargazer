export interface Wish {
  id: ReturnType<typeof crypto.randomUUID>;
  itemName: string;
  wishType: string;
  part: "" | "Wish 2";
  timeReceived: number;
  pageNumber: number;
}

export interface WishHistory {
  [key: string]: Wish[];
  character_event_wish: Wish[];
  weapon_event_wish: Wish[];
  permanent_wish: Wish[];
  beginners_wish: Wish[];
  chronicled_wish: Wish[];
}
