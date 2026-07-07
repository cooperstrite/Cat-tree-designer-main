// localStorage save/restore and JSON export/import.
import { renderCatalog } from "./catalog.js";
import { syncInputs, updateAll } from "./render.js";
import { seedCatalog } from "./seed-catalog.js";
import { STORAGE_KEY, els, state } from "./state.js";
import { showToast } from "./utils.js";

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && Array.isArray(saved.placed)) {
      state.catalog = Array.isArray(saved.catalog) ? mergeCatalog(seedCatalog, saved.catalog) : [...seedCatalog];
      state.placed = saved.placed.map(upgradePlacedPiece);
      state.wall = { ...state.wall, ...saved.wall };
      state.cat = { ...state.cat, ...saved.cat };
      state.design = { ...state.design, ...saved.design };
      state.mode = saved.mode === "3d" ? "3d" : "2d";
      state.selectedId = null;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function mergeCatalog(base, extra) {
  const map = new Map();
  [...base, ...extra].forEach((product) => map.set(product.id, product));
  return [...map.values()];
}

function upgradePlacedPiece(piece) {
  const product = state.catalog.find((item) => item.id === piece.productId);
  if (!product) return piece;
  return {
    ...piece,
    imageUrl: piece.imageUrl || product.imageUrl,
    source: piece.source || product.source,
    url: piece.url || product.url
  };
}

function saveState(show = true) {
  const payload = {
    catalog: state.catalog.filter((product) => !seedCatalog.some((seed) => seed.id === product.id)),
    placed: state.placed,
    wall: state.wall,
    cat: state.cat,
    design: state.design,
    mode: state.mode
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (show) showToast("Design saved in this browser");
}

function exportDesign() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    catalog: state.catalog.filter((product) => !seedCatalog.some((seed) => seed.id === product.id)),
    placed: state.placed,
    wall: state.wall,
    cat: state.cat,
    design: state.design,
    mode: state.mode
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "cat-wall-design.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importDesign() {
  const file = els.importDesign.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      state.catalog = mergeCatalog(seedCatalog, payload.catalog || []);
      state.placed = Array.isArray(payload.placed) ? payload.placed.map(upgradePlacedPiece) : [];
      state.wall = { ...state.wall, ...payload.wall };
      state.cat = { ...state.cat, ...payload.cat };
      state.design = { ...state.design, ...payload.design };
      state.mode = payload.mode === "3d" ? "3d" : "2d";
      state.selectedId = null;
      syncInputs();
      renderCatalog();
      updateAll();
      showToast("Design imported");
    } catch {
      showToast("That design file could not be imported");
    }
  };
  reader.readAsText(file);
}

export {
  restoreState,
  mergeCatalog,
  upgradePlacedPiece,
  saveState,
  exportDesign,
  importDesign
};
