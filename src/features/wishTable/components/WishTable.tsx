import type { RefCallback } from "react";
import type { Wish } from "../../../types/Wish.types.ts";
import { generateTableData, type WishRow } from "../utils/generateTable.ts";

function getClassName(wishRow: WishRow) {
  const rarity = wishRow.rarity;

  if (rarity === "5 Stars") return "five-stars";
  if (rarity === "4 Stars") return "four-stars";

  return "three-star";
}

function WishTable({
  wishes,
  isActive,
  ref,
}: {
  wishes: Wish[];
  isActive: boolean;
  ref: RefCallback<HTMLTableElement>;
}) {
  return (
    <div className={"table-container " + (isActive ? "active-tab" : "inactive-tab")}>
      <table ref={ref}>
        <caption>{wishes[0]?.wishType}</caption>
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Time</th>
            <th>⭐</th>
            <th>Pity</th>
            <th>#Roll</th>
            <th>Group</th>
            <th>Banner</th>
            <th>Part</th>
          </tr>
        </thead>
        <tbody>
          {generateTableData(wishes).map((wish) => (
            <tr key={wish.id} className={getClassName(wish)}>
              <td>{wish.type}</td>
              <td>{wish.name}</td>
              <td>{wish.timeReceived}</td>
              <td>{wish.rarity}</td>
              <td>{wish.pity}</td>
              <td>{wish.rollNum}</td>
              <td>{wish.group}</td>
              <td>{wish.banner}</td>
              <td>{wish.part}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span>{wishes.length === 0 && "No wishes recorded"}</span>
    </div>
  );
}

export { WishTable };
