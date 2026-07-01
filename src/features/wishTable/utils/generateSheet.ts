import { utils, writeFileXLSX } from "xlsx";
import type { EventToTable } from "../../../types/Table.types.ts";
import { getMaxColumnWidths } from "./getMaxColumnWidth.ts";
import { parseDate } from "../../dataParser/parseData.ts";

function tablesToSheets(tables: EventToTable) {
  return {
    character_event_wish: utils.table_to_sheet(tables.character_event_wish),
    weapon_event_wish: utils.table_to_sheet(tables.weapon_event_wish),
    beginners_wish: utils.table_to_sheet(tables.beginners_wish),
    permanent_wish: utils.table_to_sheet(tables.permanent_wish),
    chronicled_wish: utils.table_to_sheet(tables.chronicled_wish),
  };
}

export function generateSheet(tables: EventToTable | null) {
  if (tables === null) throw new Error("Couldnt get tables");

  const workbook = utils.book_new();

  // Preserving chronicled just in case it's fixed in the future
  const {
    character_event_wish,
    weapon_event_wish,
    beginners_wish,
    permanent_wish,
    chronicled_wish,
  } = tablesToSheets(tables);

  const information = utils.aoa_to_sheet([
    ["Paimon.moe Wish History Export"],
    ["Version", 3],
    ["Export Date", "2025-09-15 08:47:17"],
  ]);

  /*   [
    character_event_wish,
    weapon_event_wish,
    beginners_wish,
    permanent_wish,
    chronicled_wish,
  ].forEach(
    (worksheet) => (worksheet["!cols"] = getMaxColumnWidths(worksheet))
  ); */

  utils.book_append_sheet(workbook, character_event_wish, "Character Event");
  utils.book_append_sheet(workbook, weapon_event_wish, "Weapon Event");
  utils.book_append_sheet(workbook, permanent_wish, "Standard");
  utils.book_append_sheet(workbook, beginners_wish, "Beginners' Wish");
  utils.book_append_sheet(workbook, chronicled_wish, "Chronicled Wish");
  utils.book_append_sheet(workbook, information, "Information");

  // Adjusting widths
  Object.values(workbook.Sheets).forEach((sheet) => {
    sheet["!cols"] = getMaxColumnWidths(sheet);
  });

  // Colons may cause problems in filenames
  const today = parseDate(new Date().valueOf()).replaceAll(":", "_");

  writeFileXLSX(workbook, "genshin-wish-export " + today + ".xlsx");
}
