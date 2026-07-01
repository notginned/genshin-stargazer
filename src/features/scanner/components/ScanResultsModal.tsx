import type { Dispatch, RefObject, SetStateAction } from "react";
import { Modal } from "../../../components/Modal.tsx";
import type { WishHistory } from "../../../types/Wish.types.ts";
import { createEmptyWishHistory } from "../../../utils/createEmptyWishHistory.ts";

interface ScanResultsModalProps {
  ref: RefObject<HTMLDialogElement | null>;
  scanResultTable: WishHistory | null;
  setScanResultTable: Dispatch<SetStateAction<WishHistory | null>>;
}
function ScanResultsModal({
  ref,
  scanResultTable,
  setScanResultTable,
}: ScanResultsModalProps) {
  // This should never happen but we have to avoid early return so that the ref is set properly
  if (!scanResultTable) scanResultTable = createEmptyWishHistory();

  const characterCount = scanResultTable.character_event_wish.length;
  const weaponCount = scanResultTable.weapon_event_wish.length;
  const permanentCount = scanResultTable.permanent_wish.length;
  const beginnersCount = scanResultTable.beginners_wish.length;
  const chronicledCount = scanResultTable.chronicled_wish.length;

  const total =
    characterCount +
    weaponCount +
    permanentCount +
    beginnersCount +
    chronicledCount;

  return (
    <Modal
      title="Scan results"
      className="results-modal"
      ref={ref}
      onClose={() => setScanResultTable(null)}
    >
      <table>
        <caption>{total === 0 ? "No New Wishes" : "Wishes Added"}</caption>
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Wish Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Character Event Wish</td>
            <td>{characterCount}</td>
          </tr>
          <tr>
            <td>Weapon Event Wish</td>
            <td>{weaponCount}</td>
          </tr>
          <tr>
            <td>Permanent Wish</td>
            <td>{permanentCount}</td>
          </tr>
          <tr>
            <td>Beginners' Wish</td>
            <td>{beginnersCount}</td>
          </tr>
          <tr>
            <td>Chronicled Wish</td>
            <td>{chronicledCount}</td>
          </tr>
          <tr>
            <th>Total</th>
            <td>{total}</td>
          </tr>
        </tbody>
      </table>
      <button className="btn" onClick={() => ref.current?.close()}>
        Okay
      </button>
    </Modal>
  );
}

export { ScanResultsModal };
