// 2D wall stage: rendering placed pieces and pointer dragging.
import { analyzeDesign } from "./analysis.js";
import { getPieceMaxX, getWallBounds } from "./geometry.js";
import { updateAll } from "./render.js";
import { renderSelected, updateSelectedPositionFields } from "./selection.js";
import { dragState, els, state } from "./state.js";
import { clamp, compactName, showToast } from "./utils.js";

function render2d() {
  const existing = els.wall2d.querySelectorAll(".placed-piece");
  existing.forEach((node) => node.remove());

  const bounds = getWallBounds();
  if (!bounds.width || !bounds.height) return;
  const analysis = analyzeDesign();
  const reachable = new Set(analysis.reachableIds);
  const warnings = new Set(analysis.warningIds);

  state.placed.forEach((piece) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "placed-piece";
    item.dataset.type = piece.type;
    item.dataset.model = piece.model || piece.type;
    item.textContent = compactName(piece.shortName || piece.name);
    applyPiece2dStyle(item, piece, bounds);
    item.classList.toggle("is-selected", piece.id === state.selectedId);
    item.classList.toggle("is-warning", warnings.has(piece.id));
    item.classList.toggle("is-reachable", reachable.has(piece.id));
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      if (dragState.suppressClickId === piece.id) {
        dragState.suppressClickId = null;
        return;
      }
      state.selectedId = piece.id;
      updateAll();
    });
    attachDrag(item, piece);
    els.wall2d.appendChild(item);
  });

  els.wall2d.onclick = () => {
    state.selectedId = null;
    updateAll();
  };
}

function attachDrag(node, piece) {
  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    beginPieceDrag(event, node, piece);
  });
}

function beginPieceDrag(event, node, piece) {
  dragState.active = true;
  dragState.node = node;
  dragState.piece = piece;
  dragState.bounds = getWallBounds();
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originX = piece.x;
  dragState.originY = piece.y;
  dragState.pointerId = event.pointerId;
  dragState.moved = false;

  state.selectedId = piece.id;
  node.classList.add("is-dragging");
  els.wall2d.classList.add("is-dragging");
  els.wall2d.querySelectorAll(".placed-piece").forEach((item) => {
    item.classList.toggle("is-selected", item === node);
  });
  renderSelected();

  try {
    node.setPointerCapture(event.pointerId);
  } catch {
    // Document-level listeners still keep the drag alive.
  }

  document.addEventListener("pointermove", movePieceDrag, { passive: false });
  document.addEventListener("pointerup", finishPieceDrag, { passive: false });
  document.addEventListener("pointercancel", finishPieceDrag, { passive: false });
}

function movePieceDrag(event) {
  if (!dragState.active || (dragState.pointerId !== null && event.pointerId !== dragState.pointerId)) return;
  event.preventDefault();
  const { node, piece, bounds } = dragState;
  const dx = ((event.clientX - dragState.startX) / bounds.width) * state.wall.width;
  const dy = (-(event.clientY - dragState.startY) / bounds.height) * state.wall.height;
  dragState.moved = dragState.moved || Math.abs(event.clientX - dragState.startX) > 2 || Math.abs(event.clientY - dragState.startY) > 2;
  piece.x = clamp(Math.round(dragState.originX + dx), 0, getPieceMaxX(piece));
  piece.y = clamp(Math.round(dragState.originY + dy), 0, Math.max(0, state.wall.height - piece.height));
  applyPiece2dStyle(node, piece, bounds);
  updateSelectedPositionFields(piece);
}

function finishPieceDrag(event) {
  if (!dragState.active || (dragState.pointerId !== null && event.pointerId !== dragState.pointerId)) return;
  event.preventDefault();
  const { node, piece, moved } = dragState;
  try {
    node.releasePointerCapture(event.pointerId);
  } catch {
    // Some browsers release automatically.
  }
  node.classList.remove("is-dragging");
  els.wall2d.classList.remove("is-dragging");
  document.removeEventListener("pointermove", movePieceDrag);
  document.removeEventListener("pointerup", finishPieceDrag);
  document.removeEventListener("pointercancel", finishPieceDrag);
  if (moved) {
    dragState.suppressClickId = piece.id;
    showToast("Piece moved");
  }
  dragState.active = false;
  dragState.node = null;
  dragState.piece = null;
  dragState.bounds = null;
  dragState.pointerId = null;
  updateAll();
}

function applyPiece2dStyle(item, piece, bounds) {
  item.style.width = `${Math.max(22, (piece.width / state.wall.width) * bounds.width)}px`;
  item.style.height = `${Math.max(18, (Math.max(piece.height, piece.type === "scratcher" ? piece.height : 7) / state.wall.height) * bounds.height)}px`;
  item.style.left = `${bounds.left + (piece.x / state.wall.width) * bounds.width}px`;
  item.style.bottom = `${bounds.bottom + (piece.y / state.wall.height) * bounds.height}px`;
  item.style.transform = `rotate(${piece.rotation}deg)`;
}

export {
  render2d,
  attachDrag,
  beginPieceDrag,
  movePieceDrag,
  finishPieceDrag,
  applyPiece2dStyle
};
