import weapons from "../../../../data/weapons.json";
import characters from "../../../../data/characters.json";
import { BKTree } from "../../../utils/BKTree.ts";

const itemNamesDict = new BKTree(Object.keys(weapons).concat(Object.keys(characters)));

const wishTypesDict = new BKTree([
  "Character Event Wish",
  "Character Event Wish-2",
  "Beginners' Wish",
  "Permanent Wish",
  "Chronicled Wish",
  "Lightrace Wish",
  "Weapon Event Wish",
]);

const headersDict = new BKTree(["Item Name", "Wish Type", "Time Received"]);

export { itemNamesDict, wishTypesDict, headersDict };
