import { createEmptyWishHistory } from "../../utils/createEmptyWishHistory.ts";
import type { Wish, WishHistory } from "../../types/Wish.types.ts";

// We store the pages from newest to oldest as they are in game
function wishComparator(w1: Wish, w2: Wish): -1 | 0 | 1 {
  if (w1.wishType !== w2.wishType)
    throw new Error("Trying to compare different wish types");

  // w1 is newer than w2 so w1 should come first
  // (Higher timestamp is newer)
  if (w1.timeReceived > w2.timeReceived) return -1;

  // w2 is newer than w1 so w2 should come first
  if (w1.timeReceived < w2.timeReceived) return 1;

  // If both are same or either is undefined, then we rely on the page numbers
  // lower = newer
  if (w1.pageNumber < w2.pageNumber) return -1;

  if (w1.pageNumber > w2.pageNumber) return 1;

  // If in the rare case page numbers are undefined
  // we return zero since the order is undeterminable
  return 0;
}

function convertToKey(wishType: Wish["wishType"]): keyof WishHistory {
  return wishType
    .toLowerCase()
    .split(" ")
    .join("_")
    .replaceAll("'", "")
    .replaceAll("-", "_") as keyof WishHistory;
}

function historyReducer(acc: WishHistory, cur: Wish[]): WishHistory {
  cur.forEach((wish) => {
    const wishType = convertToKey(wish.wishType);

    // Lightrace wishes share pity with chronicled
    if (wishType === "lightrace_wish") {
      acc.chronicled_wish.push(wish);
    } else {
      acc[wishType].push(wish);
    }
  });

  return acc;
}

function sortWishHistory(history: WishHistory): WishHistory {
  const res = createEmptyWishHistory();

  for (const type of Object.keys(history)) {
    res[type] = history[type].toSorted(wishComparator);
  }

  return res;
}

// This is only to be used in sorted lists
function isSameWish(w1: Wish, w2: Wish) {
  return w1.itemName === w2.itemName && w1.timeReceived === w2.timeReceived;
}

// Adapted from the merge algorithm in merge sort
function mergeList(oldList: Wish[], newList: Wish[]): Wish[] {
  // The list is sorted from newest to oldest
  const mergedList = [];

  let i = 0;
  let j = 0;

  while (i < newList.length && j < oldList.length) {
    // New list has newer wish
    if (newList[i].timeReceived > oldList[j].timeReceived) {
      mergedList.push(newList[i]);
      ++i;
      continue;
    }

    // Old list has newer wish
    if (newList[i].timeReceived < oldList[j].timeReceived) {
      mergedList.push(oldList[j]);
      ++j;
      continue;
    }

    // Same time and same wish
    if (isSameWish(newList[i], oldList[j])) {
      mergedList.push(newList[i]);
      ++i;
      ++j;
      continue;
    }

    // Same time but different wishes
    mergedList.push(newList[i]);
    mergedList.push(oldList[j]);
    ++i;
    ++j;
  }

  // If the earlier loop exists early
  // Taking care of leftovers
  // Only one of the following loops will ever excute
  // So we don't check for timestamps since they're individually sorted
  for (; i < newList.length; ++i) {
    mergedList.push(newList[i]);
  }

  for (; j < oldList.length; ++j) {
    mergedList.push(oldList[j]);
  }

  return mergedList;
}

function mergeHistories(
  oldHistory: WishHistory,
  newHistory: WishHistory,
): WishHistory {
  const res = createEmptyWishHistory();

  for (const type of Object.keys(res)) {
    const oldList = oldHistory[type as keyof typeof oldHistory];
    const newList = newHistory[type as keyof typeof oldHistory];
    
    res[type as keyof typeof res] = mergeList(oldList ?? [], newList ?? []);
  }

  return res;
}

export { sortWishHistory, historyReducer, mergeHistories };
