// Cost estimate panel.
import { els, state } from "./state.js";
import { money } from "./utils.js";

function renderPricing() {
  const subtotal = state.placed.reduce((sum, piece) => sum + Number(piece.price || 0), 0);
  const hardware = state.placed.length ? Math.max(18, Math.round(subtotal * 0.08)) : 0;
  const total = subtotal + hardware;
  els.subtotal.textContent = money.format(subtotal);
  els.hardware.textContent = money.format(hardware);
  els.totalPrice.textContent = money.format(total);
  els.pieceCount.textContent = `${state.placed.length} piece${state.placed.length === 1 ? "" : "s"}`;
  els.quickPieces.textContent = String(state.placed.length);
  els.quickTotal.textContent = money.format(total);
}

export { renderPricing };
