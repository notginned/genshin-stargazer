import { BKTree } from "../../utils/BKTree.ts";
import type { ScanResult } from "../scanner/utils/scan.types.ts";
import type { Wish } from "../../types/Wish.types.ts";
import { headersDict, itemNamesDict, wishTypesDict } from "./config/dictionaries.ts";
import { log, logDebug } from "../../utils/lib.ts";

// all whitespace + a digit + all whitespace + dash + all whitespace + wildcard
const rarityRegex = /\W+\d\W*-\W*.*/;

function correctName(name: string, tree: BKTree, tolerance: number): [string, number] {
  const [result, distance] = tree
    // More tolerant towards longer strings
    .search(name, Math.ceil(name.length / tolerance))
    .sort(([, d1], [, d2]) => d1 - d2)[0] || [name, Infinity];

  return [result, distance];
}

function prepareColumn(data: string, header: string, tolerance: number): string[] {
  const splitted = data.split('\n');
  // Excluding the searched header
  const items = splitted.slice(1 + splitted.findIndex(x => header === correctName(x, headersDict, tolerance)[0]));
  
  return items;
}

function sanitizeSingleItem(name: string, dict: BKTree, tolerance: number): [string, number] {
  const cleaned = name?.trim().replace(rarityRegex, "").trim();

  if (!cleaned) return [cleaned, Infinity];

  return correctName(cleaned, dict, tolerance);
}

function sanitizeItems(items: string[], dict: BKTree, tolerance = 5) {
  const res = [];

  for (let i = 0; i < items.length; ++i) {
    const [cleaned, distance] = sanitizeSingleItem(items[i], dict, tolerance);

    if (distance <= Math.ceil(cleaned.length / tolerance)) {
      res.push(cleaned);
      continue;
    }

    // Our item name is partial
    // so we try joining it with the next item
    // Genshin only has item names upto 2 rows AFAIK
    const [joined, joinedDistance] = sanitizeSingleItem(
      cleaned + " " + items[i + 1]?.trim(),
      dict,
      tolerance
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

  const itemNamesCol = prepareColumn(data.itemName, "Item Name", 5);
  const itemNames = sanitizeItems(itemNamesCol, itemNamesDict);

  const wishTypesCol = prepareColumn(data.wishType, "Wish Type", 5);
  const wishTypes = sanitizeItems(wishTypesCol, wishTypesDict, 3);

  // First 10 characters are YY-MM-DD
  // Rest are hh:mm:ss
  const timeReceived = prepareColumn(data.timeReceived, "Time Received", 5).map(
    (time) =>
      new Date(time.substring(0, 10) + " " + time.substring(10)).valueOf()
  );

  log("cols", {itemNamesCol, wishTypesCol, timeReceived})
  log("sanitized", {itemNames, wishTypes, timeReceived})


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

  logDebug("wish", wishes);
  return wishes;
}

export { parseScanResults, parseDate };
