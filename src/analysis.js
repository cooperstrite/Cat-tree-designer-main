// Reach/load fit analysis and the cat-path simulation.
import { getWallBounds } from "./geometry.js";
import { els, state } from "./state.js";
import { animateThreeCat } from "./three-scene.js";
import { clamp, escapeHtml, showToast } from "./utils.js";

function renderAnalysis() {
  const analysis = analyzeDesign();
  els.fitScore.textContent = `Fit score ${analysis.score}%`;
  els.quickFit.textContent = `${analysis.score}%`;
  els.analysisList.innerHTML = "";
  analysis.messages.forEach((message) => {
    const item = document.createElement("div");
    item.className = `analysis-item ${message.kind}`;
    item.innerHTML = `<strong>${escapeHtml(message.title)}</strong>${escapeHtml(message.body)}`;
    els.analysisList.appendChild(item);
  });
}

function analyzeDesign() {
  const messages = [];
  const warningIds = [];
  if (!state.placed.length) {
    return {
      score: 0,
      reachableIds: [],
      warningIds: [],
      messages: [
        {
          kind: "warning",
          title: "No pieces placed",
          body: "Add shelves or bridges to start checking reach, spacing, and price."
        }
      ]
    };
  }

  const cat = state.cat;
  const jumpY = Math.max(22, cat.height * 3.2);
  const jumpX = Math.max(24, cat.length * 1.55);
  const sorted = [...state.placed].sort((a, b) => a.y - b.y);
  const reachable = new Set();

  sorted.forEach((piece) => {
    const centerX = piece.x + piece.width / 2;
    const centerY = piece.y + piece.height / 2;
    const fromFloor = centerY <= jumpY;
    const fromPiece = sorted.some((other) => {
      if (other.id === piece.id || !reachable.has(other.id)) return false;
      const ox = other.x + other.width / 2;
      const oy = other.y + other.height / 2;
      return Math.abs(centerX - ox) <= jumpX && centerY - oy <= jumpY && centerY >= oy - 8;
    });
    if (fromFloor || fromPiece) reachable.add(piece.id);
  });

  state.placed.forEach((piece) => {
    if (piece.maxLoad && piece.maxLoad < cat.weight) {
      warningIds.push(piece.id);
      messages.push({
        kind: "warning",
        title: `${piece.name} load warning`,
        body: `${piece.maxLoad} lb rating is below your ${cat.weight} lb cat.`
      });
    }
    if (piece.depth < Math.max(8, cat.length * 0.42) && ["shelf", "corner", "hammock"].includes(piece.type)) {
      warningIds.push(piece.id);
      messages.push({
        kind: "warning",
        title: `${piece.name} is narrow`,
        body: `${piece.depth}" deep may be tight for a ${cat.length}" long cat.`
      });
    }
  });

  const unreachable = state.placed.filter((piece) => !reachable.has(piece.id));
  if (unreachable.length) {
    unreachable.forEach((piece) => warningIds.push(piece.id));
    messages.push({
      kind: "warning",
      title: "Reach gap found",
      body: `${unreachable.length} placed piece${unreachable.length === 1 ? " is" : "s are"} outside the current jump model.`
    });
  } else {
    messages.push({
      kind: "good",
      title: "Reach path looks usable",
      body: `The current layout stays within about ${Math.round(jumpX)}" horizontal and ${Math.round(jumpY)}" vertical reach.`
    });
  }

  const highPieces = state.placed.filter((piece) => piece.y > state.wall.height - 18);
  if (highPieces.length) {
    messages.push({
      kind: "warning",
      title: "Top clearance",
      body: "One or more pieces are very close to the ceiling line. Leave room for mounting and cat posture."
    });
  }

  const base = Math.round((reachable.size / state.placed.length) * 82);
  const penalty = Math.min(32, warningIds.length * 8);
  const score = clamp(base + 18 - penalty, 0, 100);
  return {
    score,
    reachableIds: [...reachable],
    warningIds,
    messages: messages.slice(0, 5)
  };
}

function runCatSimulation() {
  const analysis = analyzeDesign();
  const reachable = new Set(analysis.reachableIds);
  const path = state.placed
    .filter((piece) => reachable.has(piece.id))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 8);
  if (!path.length) {
    showToast("Add a reachable shelf near the floor first");
    return;
  }
  state.simulateNonce += 1;
  const nonce = state.simulateNonce;
  const bounds = getWallBounds();
  els.catRunner.classList.add("is-running");
  path.forEach((piece, index) => {
    window.setTimeout(() => {
      if (nonce !== state.simulateNonce) return;
      const left = bounds.left + (piece.x / state.wall.width) * bounds.width + 4;
      const bottom = bounds.bottom + (piece.y / state.wall.height) * bounds.height + 8;
      els.catRunner.style.left = `${left}px`;
      els.catRunner.style.bottom = `${bottom}px`;
    }, index * 520);
  });
  window.setTimeout(() => {
    if (nonce === state.simulateNonce) els.catRunner.classList.remove("is-running");
  }, path.length * 520 + 800);
  animateThreeCat(path);
}

export { renderAnalysis, analyzeDesign, runCatSimulation };
