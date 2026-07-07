// Orchestration: updateAll fans state changes out to every view.
import { renderAnalysis } from "./analysis.js";
import { renderDesignPlan } from "./design-plan.js";
import { constrainPlacedPieces } from "./geometry.js";
import { saveState } from "./persistence.js";
import { renderPricing } from "./pricing.js";
import { renderSelected } from "./selection.js";
import { els, state } from "./state.js";
import { resizeThree, updateThreeScene } from "./three-scene.js";
import { clampNumber, formatFeet, normalizeColor } from "./utils.js";
import { render2d } from "./view2d.js";

function updateAll() {
  syncDynamicInputs();
  constrainPlacedPieces();
  render2d();
  renderSelected();
  renderPricing();
  renderAnalysis();
  renderDesignPlan();
  updateThreeScene();
  saveState(false);
}

function setMode(mode) {
  state.mode = mode;
  els.stage.classList.toggle("is-2d", mode === "2d");
  els.stage.classList.toggle("is-3d", mode === "3d");
  els.mode2d.classList.toggle("is-active", mode === "2d");
  els.mode3d.classList.toggle("is-active", mode === "3d");
  els.mode2d.setAttribute("aria-selected", String(mode === "2d"));
  els.mode3d.setAttribute("aria-selected", String(mode === "3d"));
  els.stageHint.textContent = mode === "2d" ? "2D layout canvas" : "3D room preview";
  resizeThree();
  saveState(false);
}

function syncDynamicInputs() {
  els.wallLabel.textContent = `${formatFeet(state.wall.width)} x ${formatFeet(state.wall.height)} wall`;
  els.cornerDepthField.hidden = !state.wall.corner;
  els.cornerStrip.classList.toggle("is-visible", state.wall.corner);
  els.wall2d.classList.toggle("has-pieces", state.placed.length > 0);
  els.stage.classList.toggle("has-pieces", state.placed.length > 0);
  state.wall.color = normalizeColor(state.wall.color, "#f0eadc");
  state.wall.material = state.wall.material || "paint";
  state.design = {
    style: ["natural", "minimal", "modern", "playful"].includes(state.design?.style) ? state.design.style : "natural",
    goal: ["enrichment", "smallSpace", "multiCat", "floorSpace"].includes(state.design?.goal) ? state.design.goal : "enrichment",
    budget: clampNumber(state.design?.budget ?? 350, 0, 20000)
  };
  els.wall2d.dataset.material = state.wall.material;
  document.documentElement.style.setProperty("--wall-color", state.wall.color);
  document.documentElement.style.setProperty("--cat-w", `${Math.max(42, state.cat.length * 3)}px`);
  document.documentElement.style.setProperty("--cat-h", `${Math.max(22, state.cat.height * 3)}px`);
  if (state.wall.photoDataUrl) {
    els.wall2d.style.setProperty("--room-photo", `url("${state.wall.photoDataUrl}")`);
  } else {
    els.wall2d.style.removeProperty("--room-photo");
  }
}

function syncInputs() {
  els.catalogSearch.value = state.search;
  els.wallWidth.value = state.wall.width;
  els.wallHeight.value = state.wall.height;
  els.wallDepth.value = state.wall.depth;
  els.wallColor.value = normalizeColor(state.wall.color, "#f0eadc");
  els.wallMaterial.value = state.wall.material || "paint";
  els.cornerEnabled.checked = state.wall.corner;
  els.cornerDepth.value = state.wall.cornerDepth;
  els.catLength.value = state.cat.length;
  els.catHeight.value = state.cat.height;
  els.catWeight.value = state.cat.weight;
  els.designStyle.value = state.design.style;
  els.designGoal.value = state.design.goal;
  els.designBudget.value = state.design.budget;
  setMode(state.mode);
}

export { updateAll, setMode, syncDynamicInputs, syncInputs };
