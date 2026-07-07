// Entry point: element binding, event wiring, URL presets, boot.
import { runCatSimulation } from "./analysis.js";
import {
  createPlacedPieces,
  hydrateImportFromUrl,
  importProduct,
  lookupProductUrl,
  markImportTypeTouched,
  openMarketplaceSearch,
  renderCatalog,
  setImportImageFromFile,
  setImportImageFromUrl
} from "./catalog.js";
import { constrainPlacedPieces, getPieceMaxX } from "./geometry.js";
import {
  exportDesign,
  importDesign,
  restoreState,
  saveState
} from "./persistence.js";
import { setMode, syncInputs, updateAll } from "./render.js";
import {
  removeSelectedPiece,
  updateSelectedFromControls
} from "./selection.js";
import { els, state, three } from "./state.js";
import {
  beginThreePieceDrag,
  finishThreePieceDrag,
  getPieceHitAtPointer,
  initThree,
  moveThreePieceDrag,
  resizeThree,
  updateCamera
} from "./three-scene.js";
import { clamp, clampNumber, normalizeColor, showToast } from "./utils.js";
import { render2d } from "./view2d.js";

const layoutPresets = {
  "small-space": {
    label: "Small Space Climb",
    corner: false,
    products: [
      {
        id: "frisco-wall-mounted-cat-steps",
        positions: [
          { x: 10, y: 8 },
          { x: 24, y: 20 },
          { x: 38, y: 32 },
          { x: 54, y: 44 }
        ]
      },
      { id: "frisco-cushioned-wall-shelf", positions: [{ x: 70, y: 58 }] },
      { id: "frisco-acrylic-bowl-wall-shelf", positions: [{ x: 47, y: 74 }] }
    ]
  },
  "wall-run": {
    label: "Wall Run",
    corner: false,
    products: [
      { id: "trixie-wall-set-1-post-perch", positions: [{ x: 5, y: 8 }] },
      {
        id: "frisco-cat-silhouette-bridge-set",
        positions: [
          { x: 28, y: 38 },
          { x: 42, y: 44 },
          { x: 72, y: 38 }
        ]
      },
      { id: "refined-feline-lotus-leaf-shelf", positions: [{ x: 95, y: 58 }] },
      { id: "frisco-cushioned-wall-shelf", positions: [{ x: 116, y: 74 }] }
    ]
  },
  "multi-cat": {
    label: "Multi-Cat Flow",
    corner: false,
    products: [
      {
        id: "armarkat-real-wood-wall-additions",
        positions: [
          { x: 12, y: 18 },
          { x: 12, y: 46 }
        ]
      },
      {
        id: "frisco-cat-silhouette-bridge-set",
        positions: [
          { x: 40, y: 52 },
          { x: 55, y: 58 },
          { x: 85, y: 52 }
        ]
      },
      {
        id: "frisco-wall-mounted-cat-steps",
        positions: [
          { x: 116, y: 16 },
          { x: 104, y: 30 },
          { x: 116, y: 44 },
          { x: 104, y: 60 }
        ]
      },
      { id: "frisco-acrylic-bowl-wall-shelf", positions: [{ x: 48, y: 74 }] },
      { id: "refined-feline-lotus-leaf-shelf", positions: [{ x: 92, y: 76 }] }
    ]
  },
  "corner-nook": {
    label: "Corner Nook",
    corner: true,
    products: [
      {
        id: "frisco-wall-mounted-cat-steps",
        positions: [
          { x: 14, y: 9 },
          { x: 28, y: 22 },
          { x: 42, y: 35 },
          { x: 56, y: 48 }
        ]
      },
      { id: "frisco-cushioned-wall-shelf", positions: [{ x: 72, y: 62 }] },
      {
        id: "armarkat-real-wood-wall-additions",
        positions: [
          { x: 8, y: 24, face: "right" },
          { x: 32, y: 48, face: "right" }
        ]
      },
      { id: "frisco-acrylic-bowl-wall-shelf", positions: [{ x: 24, y: 70, face: "right" }] }
    ]
  }
};

const wizardSteps = [
  {
    id: "start",
    label: "Start",
    title: "Start with a layout",
    subtitle: "Pick a starter route to place a set of pieces — or skip ahead and add your own."
  },
  {
    id: "tune",
    label: "Tune",
    title: "Tune the space",
    subtitle: "Set wall size, cat size, style, and budget — the constraints your build fits inside."
  },
  {
    id: "build",
    label: "Build",
    title: "Build the wall",
    subtitle: "Add pieces, drag them on the wall, and switch between 2D and 3D."
  },
  {
    id: "review",
    label: "Review",
    title: "Review the plan",
    subtitle: "Check price, fit warnings, measurements, and shopping summary."
  }
];

const stepAliases = {
  homePage: "home",
  layoutStarters: "start",
  catalogPanel: "build",
  wallDesigner: "build",
  designBrief: "tune",
  wallSettings: "tune",
  catSettings: "tune",
  planPanel: "review",
  pricePanel: "review"
};

function init() {
  bindElements();
  restoreState();
  applyUrlPreset();
  bindEvents();
  syncInputs();
  forceHomeOnLoad();
  renderCatalog();
  render2d();
  initThree();
  updateAll();
  installDebugApi();
}

function forceHomeOnLoad() {
  setWizardStep("home", false);
  if (window.location.hash !== "#home") {
    history.replaceState(null, "", "#home");
  }
}

function applyUrlPreset() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1" && !state.placed.length) {
    [
      ["frisco-wall-mounted-cat-steps", 10, 8],
      ["frisco-cushioned-wall-shelf", 44, 27],
      ["frisco-cat-silhouette-bridge-set", 52, 42],
      ["frisco-acrylic-bowl-wall-shelf", 96, 58],
      ["refined-feline-lotus-leaf-shelf", 86, 75]
    ].forEach(([productId, x, y]) => {
      const product = state.catalog.find((item) => item.id === productId);
      if (!product) return;
      const pieces = createPlacedPieces(product).map((piece, index) => ({
        ...piece,
        id: `${piece.productId}-demo-${state.placed.length}-${index}`,
        x: clamp(x + Number(product.packageParts?.[index]?.offsetX || 0), 0, Math.max(0, state.wall.width - piece.width)),
        y: clamp(y + Number(product.packageParts?.[index]?.offsetY || 0), 0, Math.max(0, state.wall.height - piece.height)),
        face: "front"
      }));
      state.placed.push(...pieces);
    });
  }
  const view = params.get("view");
  if (view === "3d" || view === "2d") state.mode = view;
}

function bindElements() {
  [
    "catalogCount",
    "catalogSearch",
    "catalogList",
    "importUrl",
    "importName",
    "importType",
    "importPrice",
    "importRating",
    "importWidth",
    "importDepth",
    "importHeight",
    "lookupUrl",
    "lookupStatus",
    "importImageUrl",
    "importImageFile",
    "importImagePreview",
    "importDetect",
    "importProduct",
    "openSearch",
    "stepKicker",
    "stepTitle",
    "stepSubtitle",
    "prevStep",
    "nextStep",
    "mode2d",
    "mode3d",
    "simulateCat",
    "clearDesign",
    "stage",
    "wall2d",
    "cornerStrip",
    "catGhost",
    "catRunner",
    "emptyStage",
    "threeStage",
    "threeCanvas",
    "wallLabel",
    "stageHint",
    "fitScore",
    "quickPieces",
    "quickTotal",
    "quickFit",
    "pieceCount",
    "subtotal",
    "hardware",
    "totalPrice",
    "wallWidth",
    "wallHeight",
    "wallDepth",
    "wallColor",
    "wallMaterial",
    "cornerEnabled",
    "cornerDepth",
    "cornerDepthField",
    "photoUpload",
    "catLength",
    "catHeight",
    "catWeight",
    "designStyle",
    "designGoal",
    "designBudget",
    "analysisList",
    "planStatus",
    "moodBoard",
    "planList",
    "selectedStatus",
    "selectedEmpty",
    "selectedControls",
    "selectedName",
    "selectedX",
    "selectedY",
    "selectedPrice",
    "selectedFace",
    "selectedRotation",
    "removeSelected",
    "saveDesign",
    "exportDesign",
    "importDesign",
    "toast"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.catalogSearch.addEventListener("input", () => {
    state.search = els.catalogSearch.value;
    renderCatalog();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCatalog();
    });
  });

  els.importUrl.addEventListener("input", hydrateImportFromUrl);
  els.lookupUrl.addEventListener("click", lookupProductUrl);
  els.importProduct.addEventListener("click", importProduct);
  els.openSearch.addEventListener("click", openMarketplaceSearch);
  els.importImageUrl.addEventListener("change", setImportImageFromUrl);
  els.importImageFile.addEventListener("change", setImportImageFromFile);
  els.importType.addEventListener("change", markImportTypeTouched);

  document.querySelectorAll("[data-step-nav]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setWizardStep(link.dataset.stepNav);
    });
  });
  els.prevStep.addEventListener("click", () => moveWizardStep(-1));
  els.nextStep.addEventListener("click", () => moveWizardStep(1));

  document.querySelectorAll("[data-layout-preset]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyLayoutPreset(button.dataset.layoutPreset);
    });
  });

  els.mode2d.addEventListener("click", () => setMode("2d"));
  els.mode3d.addEventListener("click", () => setMode("3d"));
  els.simulateCat.addEventListener("click", runCatSimulation);
  els.clearDesign.addEventListener("click", clearDesign);

  [
    ["wallWidth", "width"],
    ["wallHeight", "height"],
    ["wallDepth", "depth"],
    ["cornerDepth", "cornerDepth"]
  ].forEach(([id, key]) => {
    els[id].addEventListener("input", () => {
      state.wall[key] = clampNumber(els[id].value, Number(els[id].min), Number(els[id].max));
      constrainPlacedPieces();
      updateAll();
    });
  });

  els.wallColor.addEventListener("input", () => {
    state.wall.color = normalizeColor(els.wallColor.value, "#f0eadc");
    updateAll();
  });

  els.wallMaterial.addEventListener("change", () => {
    state.wall.material = els.wallMaterial.value;
    updateAll();
  });

  els.cornerEnabled.addEventListener("change", () => {
    state.wall.corner = els.cornerEnabled.checked;
    if (!state.wall.corner) {
      state.placed.forEach((piece) => {
        if (piece.face === "right") piece.face = "front";
      });
    }
    updateAll();
  });

  [
    ["catLength", "length"],
    ["catHeight", "height"],
    ["catWeight", "weight"]
  ].forEach(([id, key]) => {
    els[id].addEventListener("input", () => {
      state.cat[key] = clampNumber(els[id].value, Number(els[id].min), Number(els[id].max));
      updateAll();
    });
  });

  els.photoUpload.addEventListener("change", loadRoomPhoto);

  els.designStyle.addEventListener("change", () => {
    state.design.style = els.designStyle.value;
    updateAll();
  });
  els.designGoal.addEventListener("change", () => {
    state.design.goal = els.designGoal.value;
    updateAll();
  });
  els.designBudget.addEventListener("input", () => {
    state.design.budget = clampNumber(els.designBudget.value, Number(els.designBudget.min), Number(els.designBudget.max));
    updateAll();
  });

  els.selectedName.addEventListener("input", updateSelectedFromControls);
  els.selectedX.addEventListener("input", updateSelectedFromControls);
  els.selectedY.addEventListener("input", updateSelectedFromControls);
  els.selectedPrice.addEventListener("input", updateSelectedFromControls);
  els.selectedFace.addEventListener("change", updateSelectedFromControls);
  els.selectedRotation.addEventListener("change", updateSelectedFromControls);
  els.removeSelected.addEventListener("click", removeSelectedPiece);

  els.saveDesign.addEventListener("click", saveState);
  els.exportDesign.addEventListener("click", exportDesign);
  els.importDesign.addEventListener("change", importDesign);

  els.threeCanvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    const hit = getPieceHitAtPointer(event);
    if (hit) {
      beginThreePieceDrag(event, hit);
      return;
    }
    three.orbit.dragging = true;
    three.orbit.startX = event.clientX;
    three.orbit.startY = event.clientY;
    els.threeStage.classList.add("is-orbiting");
    els.threeCanvas.setPointerCapture(event.pointerId);
  });
  els.threeCanvas.addEventListener("pointermove", (event) => {
    if (three.drag.active) {
      moveThreePieceDrag(event);
      return;
    }
    if (!three.orbit.dragging) return;
    event.preventDefault();
    const dx = event.clientX - three.orbit.startX;
    const dy = event.clientY - three.orbit.startY;
    three.orbit.startX = event.clientX;
    three.orbit.startY = event.clientY;
    three.orbit.yaw += dx * 0.006;
    three.orbit.pitch = clamp(three.orbit.pitch + dy * 0.004, -0.45, 0.8);
    updateCamera();
  });
  els.threeCanvas.addEventListener("pointerup", (event) => {
    if (three.drag.active) {
      finishThreePieceDrag(event);
      return;
    }
    three.orbit.dragging = false;
    els.threeStage.classList.remove("is-orbiting");
    try {
      els.threeCanvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released on touch browsers.
    }
  });
  els.threeCanvas.addEventListener("pointercancel", (event) => {
    if (three.drag.active) {
      finishThreePieceDrag(event);
      return;
    }
    three.orbit.dragging = false;
    els.threeStage.classList.remove("is-orbiting");
  });
  els.threeCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    three.orbit.distance = clamp(three.orbit.distance + event.deltaY * 0.12, 120, 360);
    updateCamera();
  }, { passive: false });

  window.addEventListener("resize", () => {
    resizeThree();
    render2d();
  });
  window.addEventListener("hashchange", () => setWizardStep(getStepFromLocation(), false));
}

function getStepFromLocation() {
  const key = window.location.hash.replace(/^#/, "");
  if (!key) return "home";
  const mapped = stepAliases[key] || key;
  if (mapped === "home") return "home";
  return wizardSteps.some((step) => step.id === mapped) ? mapped : "home";
}

function setWizardStep(stepId, updateHash = true) {
  if (stepId === "home") {
    state.step = "home";
    document.body.dataset.step = "home";
    document.querySelectorAll("[data-step-nav]").forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
    if (updateHash && window.location.hash !== "#home") {
      history.pushState(null, "", "#home");
    }
    window.setTimeout(() => {
      resizeThree();
      render2d();
    }, 0);
    return;
  }

  const step = wizardSteps.find((item) => item.id === stepId) || wizardSteps[0];
  state.step = step.id;
  document.body.dataset.step = step.id;
  const index = wizardSteps.indexOf(step);
  els.stepKicker.textContent = `Step ${index + 1} of ${wizardSteps.length}`;
  els.stepTitle.textContent = step.title;
  els.stepSubtitle.textContent = step.subtitle;
  els.prevStep.disabled = index === 0;
  els.nextStep.textContent = index === wizardSteps.length - 1 ? "Save Design" : `Next: ${wizardSteps[index + 1].label}`;

  document.querySelectorAll("[data-step-nav]").forEach((link) => {
    const active = link.dataset.stepNav === step.id;
    link.classList.toggle("is-active", active);
    if (active) {
      link.setAttribute("aria-current", "step");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (step.id === "review") setMode("3d");
  if (updateHash && window.location.hash !== `#${step.id}`) {
    history.pushState(null, "", `#${step.id}`);
  }
  window.setTimeout(() => {
    resizeThree();
    render2d();
  }, 0);
}

function moveWizardStep(delta) {
  if (state.step === "home") {
    setWizardStep("start");
    return;
  }
  const index = wizardSteps.findIndex((step) => step.id === state.step);
  if (index === wizardSteps.length - 1 && delta > 0) {
    saveState();
    return;
  }
  const next = wizardSteps[clamp(index + delta, 0, wizardSteps.length - 1)];
  setWizardStep(next.id);
}

function clearDesign() {
  state.placed = [];
  state.selectedId = null;
  updateAll();
  showToast("Design cleared");
}

function applyLayoutPreset(presetId) {
  const preset = layoutPresets[presetId];
  if (!preset) return;
  const shouldAdvance = state.step === "start";
  state.placed = [];
  state.selectedId = null;
  state.wall.corner = Boolean(preset.corner);

  preset.products.forEach((entry, productIndex) => {
    const product = state.catalog.find((item) => item.id === entry.id);
    if (!product) return;
    const pieces = createPlacedPieces(product);
    const batchId = `${product.id}-${presetId}-${Date.now()}-${productIndex}`;
    pieces.forEach((piece, pieceIndex) => {
      const position = entry.positions[pieceIndex] || entry.positions[entry.positions.length - 1] || { x: 0, y: 0 };
      piece.id = pieces.length > 1 ? `${batchId}-part-${pieceIndex + 1}` : batchId;
      piece.packageId = pieces.length > 1 ? batchId : "";
      piece.face = position.face === "right" && state.wall.corner ? "right" : "front";
      piece.x = clamp(Math.round(position.x), 0, getPieceMaxX(piece));
      piece.y = clamp(Math.round(position.y), 0, Math.max(0, state.wall.height - piece.height));
      piece.rotation = Number(position.rotation || 0);
      state.placed.push(piece);
    });
  });

  state.selectedId = state.placed[0]?.id || null;
  updateAll();
  if (shouldAdvance) setWizardStep("tune");
  showToast(`${preset.label} loaded`);
}

function loadRoomPhoto() {
  const file = els.photoUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.wall.photoDataUrl = String(reader.result);
    updateAll();
    showToast("Room photo added as wall background");
  };
  reader.readAsDataURL(file);
}

function installDebugApi() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("debug")) return;
  window.catWallDesignerDebug = {
    placed: () => state.placed.map((piece) => ({
      id: piece.id,
      name: piece.name,
      shortName: piece.shortName,
      x: piece.x,
      y: piece.y,
      face: piece.face
    })),
    projectPiece: (query) => {
      if (!three.ready) return null;
      const piece = state.placed.find((item) => item.id === query || item.shortName === query || item.name.includes(query));
      if (!piece) return null;
      const model = three.piecesGroup.children.find((child) => child.userData?.pieceId === piece.id);
      if (!model) return null;
      const rect = els.threeCanvas.getBoundingClientRect();
      const vector = model.position.clone().project(three.camera);
      return {
        id: piece.id,
        x: rect.left + ((vector.x + 1) / 2) * rect.width,
        y: rect.top + ((-vector.y + 1) / 2) * rect.height
      };
    },
    modelStats: () => ({
      placed: state.placed.length,
      meshCount: three.piecesGroup.children.reduce((sum, model) => {
        let count = 0;
        model.traverse((object) => {
          if (object.isMesh) count += 1;
        });
        return sum + count;
      }, 0),
      generated: three.piecesGroup.children.filter((model) => model.userData?.archetype).length,
      imageMeshes: three.piecesGroup.children.reduce((sum, model) => {
        let count = 0;
        model.traverse((object) => {
          if (object.userData?.photo) count += 1;
        });
        return sum + count;
      }, 0),
      wall: { ...state.wall }
    })
  };
}

init();
