// room.ts: How outdoor air gets into a room: in through the window and through leaks, and a
// purifier cleaning the air inside. The list beside it gives the computed share of outdoor PM2.5
// indoors (FACTORS.md section 4) for windows open, shut, and shut with a purifier.
import { escapeHtml } from "../../../shared/escape.js";
import { formatIndianNumber } from "../../app/format.js";
import { t } from "../../home/i18n.js";

export interface RoomShares {
  windowsOpen: number;
  windowsShut: number;
  shutWithPurifier: number;
}

const ROOM_SVG = `
  <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" class="room-svg">
    <rect class="d-wall" x="40" y="20" width="240" height="160" rx="4" />
    <rect class="d-window" x="34" y="60" width="12" height="56" />
    <path class="d-flow-in" d="M4 72 H58 M48 64 l10 8 l-10 8" />
    <path class="d-flow-in" d="M4 104 H58 M48 96 l10 8 l-10 8" />
    <path class="d-leak" d="M300 150 H268 M276 144 l-8 6 l8 6" />
    <path class="d-leak" d="M160 4 V34 M154 26 l6 8 l6 -8" />
    <rect class="d-purifier" x="206" y="122" width="48" height="44" rx="4" />
    <path class="d-clean" d="M196 112 a30 30 0 1 1 -28 30 M168 142 l-6 -8 M168 142 l8 -6" />
  </svg>`;

function shareRow(label: string, share: number, isKey: boolean): string {
  const pct = Math.round(share * 100);
  return `
    <li class="share-row${isKey ? " is-key" : ""}">
      <span class="share-label">${escapeHtml(label)}</span>
      <svg class="share-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="share-track" width="100" height="8" /><rect class="share-fill" width="${pct}" height="8" /></svg>
      <span class="share-value tabular-nums">${escapeHtml(t("room.share", { percent: formatIndianNumber(pct), pm: "PM2.5" }))}</span>
    </li>`;
}

export function roomDiagramHtml(s: RoomShares): string {
  return `
    <figure class="diagram room">
      <figcaption class="diagram-title">${escapeHtml(t("room.title"))}</figcaption>
      <div class="room-layout">
        ${ROOM_SVG}
        <div>
          <p class="room-legend"><span class="legend-key key-dirty" aria-hidden="true"></span>${escapeHtml(t("room.legendIn"))}</p>
          <p class="room-legend"><span class="legend-key key-clean" aria-hidden="true"></span>${escapeHtml(t("room.legendClean"))}</p>
          <ul class="share-rows">
            ${shareRow(t("room.open"), s.windowsOpen, false)}
            ${shareRow(t("room.shut"), s.windowsShut, false)}
            ${shareRow(t("room.purifier"), s.shutWithPurifier, true)}
          </ul>
        </div>
      </div>
    </figure>`;
}
