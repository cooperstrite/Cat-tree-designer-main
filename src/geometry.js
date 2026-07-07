// Wall-space math shared by the 2D and 3D views.
import { els, state } from "./state.js";
import { clamp } from "./utils.js";

function getPieceMaxX(piece) {
  const wallSpan = piece.face === "right" && state.wall.corner ? state.wall.cornerDepth : state.wall.width;
  return Math.max(0, wallSpan - piece.width);
}

function constrainPlacedPieces() {
  state.placed.forEach((piece) => {
    if (!state.wall.corner && piece.face === "right") piece.face = "front";
    piece.x = clamp(Number(piece.x) || 0, 0, getPieceMaxX(piece));
    piece.y = clamp(Number(piece.y) || 0, 0, Math.max(0, state.wall.height - piece.height));
  });
}

function getWallBounds() {
  const rect = els.wall2d.getBoundingClientRect();
  const pad = Math.min(18, rect.width * 0.06);
  return {
    left: pad,
    bottom: pad,
    width: Math.max(1, rect.width - pad * 2),
    height: Math.max(1, rect.height - pad * 2)
  };
}

export { getPieceMaxX, constrainPlacedPieces, getWallBounds };
