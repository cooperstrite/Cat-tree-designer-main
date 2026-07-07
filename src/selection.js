// Selected-piece inspector controls.
import { getPieceMaxX } from "./geometry.js";
import { updateAll } from "./render.js";
import { els, state } from "./state.js";
import { clamp, clampNumber, showToast } from "./utils.js";

function renderSelected() {
  const piece = getSelectedPiece();
  els.selectedEmpty.hidden = Boolean(piece);
  els.selectedControls.hidden = !piece;
  els.selectedStatus.textContent = piece ? "editing" : "none";
  if (!piece) return;
  els.selectedName.value = piece.name;
  els.selectedX.value = Math.round(piece.x);
  els.selectedY.value = Math.round(piece.y);
  els.selectedPrice.value = Math.round(piece.price);
  els.selectedFace.value = piece.face;
  els.selectedFace.disabled = !state.wall.corner;
  els.selectedRotation.value = String(piece.rotation);
}

function updateSelectedFromControls() {
  const piece = getSelectedPiece();
  if (!piece) return;
  piece.name = els.selectedName.value;
  piece.x = clampNumber(els.selectedX.value, 0, getPieceMaxX(piece));
  piece.y = clampNumber(els.selectedY.value, 0, Math.max(0, state.wall.height - piece.height));
  piece.price = clampNumber(els.selectedPrice.value, 0, 5000);
  piece.face = state.wall.corner ? els.selectedFace.value : "front";
  piece.x = clamp(piece.x, 0, getPieceMaxX(piece));
  piece.rotation = Number(els.selectedRotation.value);
  updateAll();
}

function removeSelectedPiece() {
  if (!state.selectedId) return;
  state.placed = state.placed.filter((piece) => piece.id !== state.selectedId);
  state.selectedId = null;
  updateAll();
  showToast("Piece removed");
}

function getSelectedPiece() {
  return state.placed.find((piece) => piece.id === state.selectedId);
}

function updateSelectedPositionFields(piece) {
  if (piece.id !== state.selectedId) return;
  els.selectedX.value = Math.round(piece.x);
  els.selectedY.value = Math.round(piece.y);
}

export {
  renderSelected,
  updateSelectedFromControls,
  removeSelectedPiece,
  getSelectedPiece,
  updateSelectedPositionFields
};
