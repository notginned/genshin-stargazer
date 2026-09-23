import { BKTree } from "../../utils/BKTree.ts";
import type { ScanResult } from "../scanner/utils/scan.types.ts";
import type { Wish } from "../../types/Wish.types.ts";
import { itemNamesDict, wishTypesDict } from "./config/dictionaries.ts";

// all whitespace + a digit + all whitespace + dash + all whitespace + wildcard
const rarityRegex = /\W+\d\W*-\W*.*/;

function correctName(name: string, tree: BKTree): [string, number] {
  const [result, distance] = tree
    // More tolerant towards longer strings
    .search(name, Math.ceil(name.length / 5))
    .sort(([, d1], [, d2]) => d1 - d2)[0] || [name, Infinity];

  return [result, distance];
}

function prepareColumn(data: string): string[] {
  const [, ...items ] = data.split('\n');
  return items;

}

function sanitizeSingleItem(name: string, dict: BKTree): [string, number] {
  const cleaned = name?.trim().replace(rarityRegex, "").trim();

  if (!cleaned) return [cleaned, Infinity];

  return correctName(cleaned, dict);
}

function sanitizeItems(items: string[], dict: BKTree) {
  const res = [];

  for (let i = 0; i < items.length; ++i) {
    const [cleaned, distance] = sanitizeSingleItem(items[i], dict);

    if (distance <= Math.ceil(cleaned.length / 5)) {
      res.push(cleaned);
      continue;
    }

    // Our item name is partial
    // so we try joining it with the next item
    // Genshin only has item names upto 2 rows AFAIK
    const [joined, joinedDistance] = sanitizeSingleItem(
      cleaned + " " + items[i + 1]?.trim(),
      dict
    );

    if (joinedDistance <= 2) {
      res.push(joined);
      i += 1;
    }
  }
  return res;
}

function pad(n: number, maxLength = 2, fillString = "0"): string {
  return n.toString().padStart(maxLength, fillString);
}

function parseDate(timestamp: number) {
  const dateObj = new Date(timestamp);
  const date = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
    dateObj.getDate()
  )}`;

  const time = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(
    dateObj.getSeconds()
  )}`;

  return `${date} ${time}`;
}

function parseScanResults(data: ScanResult): Wish[] {
  const pageNumber = Number(data.pageNumber[0]?.trim());

  const itemNamesCol = prepareColumn(data.itemName);
  const itemNames = sanitizeItems(itemNamesCol, itemNamesDict);

  const wishTypesCol = prepareColumn(data.wishType);
  const wishTypes = sanitizeItems(wishTypesCol, wishTypesDict);

  // First 10 characters are YY-MM-DD
  // Rest are hh:mm:ss
  const timeReceived = prepareColumn(data.timeReceived).map(
    (time) =>
      new Date(time.substring(0, 10) + " " + time.substring(10)).valueOf()
  );

  const wishes = itemNames.map<Wish>((itemName, i) => {
    return {
      id: crypto.randomUUID(),
      itemName,
      pageNumber,
      wishType: wishTypes[i].replace("-2", ""),
      part: wishTypes[i].includes("-2") ? "Wish 2" : "",
      timeReceived: timeReceived[i],
    };
  });

  console.debug("data", data);
  console.debug("wish", wishes);
  return wishes;
}

export { parseScanResults, parseDate };
