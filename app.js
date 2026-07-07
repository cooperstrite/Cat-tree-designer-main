import * as THREE from "three";

const STORAGE_KEY = "cat-wall-designer-state-v1";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const seedCatalog = [
  {
    id: "frisco-cushioned-wall-shelf",
    sku: "399655",
    name: "Frisco Cushioned Wall Mounted Cat Wall Shelf",
    shortName: "Cushion Shelf",
    type: "shelf",
    model: "frisco-cushion-shelf",
    price: 29.99,
    rating: 4.6,
    reviews: 185,
    width: 15.74,
    depth: 12.2,
    height: 5.9,
    maxLoad: 20,
    material: "wood + removable cushion",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/frisco-cushioned-wall-mounted-cat/dp/399655"
  },
  {
    id: "frisco-acrylic-bowl-wall-shelf",
    sku: "399651",
    name: "Frisco Acrylic Bowl Wall Mounted Cat Wall Shelf",
    shortName: "Acrylic Bowl",
    type: "hideout",
    model: "frisco-acrylic-bowl",
    price: 52.59,
    rating: 4.5,
    reviews: 90,
    width: 18,
    depth: 15.75,
    height: 6,
    maxLoad: 20,
    material: "wood shelf + acrylic bowl + sisal mats",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/frisco-acrylic-bowl-wall-mounted-cat/dp/399651"
  },
  {
    id: "frisco-cat-silhouette-bridge-set",
    sku: "399653",
    name: "Frisco Cat Silhouette with Bridge Wall Mounted Shelves",
    shortName: "Bridge Set",
    type: "bridge",
    model: "frisco-silhouette-bridge",
    price: 66.29,
    rating: 4.4,
    reviews: 86,
    width: 52,
    depth: 9.65,
    height: 16,
    maxLoad: 20,
    material: "wood cubbies + chenille bridge + sisal mats",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/frisco-cat-silhouette-bridge-wall/dp/399653"
  },
  {
    id: "frisco-wall-mounted-cat-steps",
    sku: "2191294",
    name: "Frisco Wall Mounted Cat Steps, 4 pack",
    shortName: "Step Pack",
    type: "shelf",
    model: "frisco-four-steps",
    price: 29.99,
    rating: 4.5,
    reviews: 31,
    width: 34,
    depth: 8,
    height: 22,
    maxLoad: 15,
    material: "wood + sisal mats",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/frisco-wall-mounted-cat-steps/dp/2191294"
  },
  {
    id: "refined-feline-lotus-leaf-shelf",
    sku: "284856",
    name: "The Refined Feline Lotus Leaf Wall Mounted Shelf",
    shortName: "Lotus Leaf",
    type: "shelf",
    model: "lotus-leaf",
    price: 79.99,
    rating: 4.8,
    reviews: 50,
    width: 22,
    depth: 10.5,
    height: 9,
    maxLoad: null,
    material: "bent ply + solid wood + carpet pad",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/refined-feline-lotus-leaf-wall/dp/284856"
  },
  {
    id: "armarkat-real-wood-wall-additions",
    sku: "515630",
    name: "Armarkat Real Wood Cat Wall Additions, 2 count",
    shortName: "Armarkat 2-Level",
    type: "hideout",
    model: "armarkat-two-level",
    price: 74.25,
    rating: 4.4,
    reviews: 367,
    width: 20,
    depth: 12,
    height: 18,
    maxLoad: null,
    material: "solid poplar + removable mats",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/armarkat-real-wood-cat-wall-additions/dp/515630"
  },
  {
    id: "pawhut-10-level-wall-shelves",
    sku: "1621678",
    name: "PawHut 10 Level Wood Wall Mounted Cat Shelves",
    shortName: "PawHut 10-Level",
    type: "hideout",
    model: "pawhut-10-level",
    price: 124.99,
    rating: 4.8,
    reviews: 10,
    width: 15.75,
    depth: 12.75,
    height: 17.75,
    maxLoad: null,
    material: "wood + washable pads + cushioned house",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/pawhut-10-level-wood-wall-mounted-cat/dp/1621678"
  },
  {
    id: "trixie-wall-set-1-post-perch",
    sku: "822382",
    name: "TRIXIE Wall Set 1 Scratching Post with Perch",
    shortName: "TRIXIE Post",
    type: "scratcher",
    model: "trixie-post-perch",
    price: 40.99,
    rating: 3.5,
    reviews: 28,
    width: 13.8,
    depth: 9.8,
    height: 51.2,
    maxLoad: 15,
    material: "sisal post + jumping platform",
    source: "Chewy",
    sourceChecked: "2026-07-07",
    url: "https://www.chewy.com/trixie-wall-set-1-wall-mount-cat/dp/822382"
  }
];

const els = {};
const state = {
  catalog: [...seedCatalog],
  placed: [],
  selectedId: null,
  mode: "2d",
  filter: "all",
  search: "",
  simulateNonce: 0,
  wall: {
    width: 144,
    height: 96,
    depth: 48,
    corner: false,
    cornerDepth: 72,
    photoDataUrl: ""
  },
  cat: {
    length: 22,
    height: 11,
    weight: 12
  }
};

const dragState = {
  active: false,
  node: null,
  piece: null,
  bounds: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  pointerId: null,
  moved: false,
  suppressClickId: null
};

const three = {
  renderer: null,
  scene: null,
  camera: null,
  wallGroup: null,
  piecesGroup: null,
  catGroup: null,
  textures: {},
  animationFrame: 0,
  ready: false,
  orbit: {
    yaw: -0.35,
    pitch: 0.17,
    distance: 210,
    dragging: false,
    startX: 0,
    startY: 0
  }
};

function init() {
  bindElements();
  restoreState();
  applyUrlPreset();
  bindEvents();
  syncInputs();
  renderCatalog();
  render2d();
  initThree();
  updateAll();
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
      state.placed.push({
        ...product,
        id: `${product.id}-demo-${state.placed.length}`,
        productId,
        x,
        y,
        face: "front",
        rotation: 0
      });
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
    "importProduct",
    "openSearch",
    "mode2d",
    "mode3d",
    "simulateCat",
    "clearDesign",
    "stage",
    "wall2d",
    "cornerStrip",
    "catGhost",
    "catRunner",
    "threeCanvas",
    "wallLabel",
    "stageHint",
    "fitScore",
    "pieceCount",
    "subtotal",
    "hardware",
    "totalPrice",
    "wallWidth",
    "wallHeight",
    "wallDepth",
    "cornerEnabled",
    "cornerDepth",
    "cornerDepthField",
    "photoUpload",
    "catLength",
    "catHeight",
    "catWeight",
    "analysisList",
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
  els.importProduct.addEventListener("click", importProduct);
  els.openSearch.addEventListener("click", openMarketplaceSearch);

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
    three.orbit.dragging = true;
    three.orbit.startX = event.clientX;
    three.orbit.startY = event.clientY;
    els.threeCanvas.setPointerCapture(event.pointerId);
  });
  els.threeCanvas.addEventListener("pointermove", (event) => {
    if (!three.orbit.dragging) return;
    const dx = event.clientX - three.orbit.startX;
    const dy = event.clientY - three.orbit.startY;
    three.orbit.startX = event.clientX;
    three.orbit.startY = event.clientY;
    three.orbit.yaw += dx * 0.006;
    three.orbit.pitch = clamp(three.orbit.pitch + dy * 0.004, -0.45, 0.8);
    updateCamera();
  });
  els.threeCanvas.addEventListener("pointerup", (event) => {
    three.orbit.dragging = false;
    try {
      els.threeCanvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released on touch browsers.
    }
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
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && Array.isArray(saved.placed)) {
      state.catalog = Array.isArray(saved.catalog) ? mergeCatalog(seedCatalog, saved.catalog) : [...seedCatalog];
      state.placed = saved.placed;
      state.wall = { ...state.wall, ...saved.wall };
      state.cat = { ...state.cat, ...saved.cat };
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

function syncInputs() {
  els.catalogSearch.value = state.search;
  els.wallWidth.value = state.wall.width;
  els.wallHeight.value = state.wall.height;
  els.wallDepth.value = state.wall.depth;
  els.cornerEnabled.checked = state.wall.corner;
  els.cornerDepth.value = state.wall.cornerDepth;
  els.catLength.value = state.cat.length;
  els.catHeight.value = state.cat.height;
  els.catWeight.value = state.cat.weight;
  setMode(state.mode);
}

function renderCatalog() {
  const query = state.search.trim().toLowerCase();
  const filtered = state.catalog.filter((product) => {
    const matchesType = state.filter === "all" || product.type === state.filter;
    const haystack = `${product.name} ${product.type} ${product.material} ${product.source}`.toLowerCase();
    return matchesType && (!query || haystack.includes(query));
  });

  els.catalogCount.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;
  els.catalogList.innerHTML = "";

  filtered.forEach((product) => {
    const ratingText = product.reviews
      ? `${Number(product.rating).toFixed(1)} star (${product.reviews})`
      : `${Number(product.rating).toFixed(1)} star`;
    const loadText = product.maxLoad ? `${product.maxLoad} lb` : "load n/a";
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.innerHTML = `
      <div class="mini-model" data-type="${escapeHtml(product.type)}" data-model="${escapeHtml(product.model || product.type)}" aria-hidden="true"></div>
      <div class="catalog-content">
        <h3 class="catalog-title">${escapeHtml(product.name)}</h3>
        <div class="catalog-meta">
          <strong>${money.format(product.price)}</strong>
          <span>${escapeHtml(ratingText)}</span>
          <span>${escapeHtml(product.type)}</span>
        </div>
        <div class="catalog-specs">
          <span>${formatInches(product.width)}W</span>
          <span>${formatInches(product.depth)}D</span>
          <span>${formatInches(product.height)}H</span>
          <span>${escapeHtml(loadText)}</span>
        </div>
        <div class="catalog-source">${escapeHtml(product.source)} item</div>
        <div class="catalog-actions">
          <button type="button" data-add="${escapeHtml(product.id)}">Add</button>
          <a href="${escapeAttribute(product.url)}" target="_blank" rel="noreferrer">Source</a>
        </div>
      </div>
    `;
    card.querySelector("[data-add]").addEventListener("click", () => addPiece(product.id));
    els.catalogList.appendChild(card);
  });
}

function addPiece(productId) {
  const product = state.catalog.find((item) => item.id === productId);
  if (!product) return;
  const piece = {
    ...product,
    id: `${product.id}-${Date.now()}`,
    productId,
    x: clamp(24 + state.placed.length * 10, 0, Math.max(0, state.wall.width - product.width)),
    y: clamp(18 + state.placed.length * 8, 0, Math.max(0, state.wall.height - product.height)),
    face: product.type === "corner" && state.wall.corner ? "right" : "front",
    rotation: 0
  };
  state.placed.push(piece);
  state.selectedId = piece.id;
  updateAll();
  showToast(`${product.name} added to the wall`);
}

function hydrateImportFromUrl() {
  const url = els.importUrl.value.trim();
  if (!url) return;
  const known = findCatalogProductByUrl(url);
  if (known) {
    els.importName.value = known.name;
    els.importType.value = known.type;
    els.importPrice.value = known.price;
    els.importRating.value = known.rating;
    els.importWidth.value = known.width;
    els.importDepth.value = known.depth;
    els.importHeight.value = known.height;
    return;
  }
  if (els.importName.value.trim()) return;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const slug = parsed.pathname.split("/").filter(Boolean).pop() || "";
    const readableSlug = slug
      .replace(/\d+/g, " ")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    els.importName.value = titleCase(readableSlug || `${host} cat wall piece`);
  } catch {
    // Keep free-form entry available for pasted text that is not a valid URL.
  }
}

function importProduct() {
  const url = els.importUrl.value.trim();
  const known = findCatalogProductByUrl(url);
  if (known) {
    addPiece(known.id);
    showToast(`${known.name} matched from the known product library`);
    return;
  }
  const name = els.importName.value.trim() || "Imported Cat Wall Piece";
  const type = els.importType.value;
  const width = clampNumber(els.importWidth.value, 1, 120);
  const depth = clampNumber(els.importDepth.value, 1, 80);
  const height = clampNumber(els.importHeight.value, 1, 80);
  const price = clampNumber(els.importPrice.value || "49", 0, 5000);
  const rating = clampNumber(els.importRating.value || "4.5", 0, 5);
  const sourceHost = safeUrlHost(url);
  const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} cat wall furniture`)}`;
  const product = {
    id: `import-${slugify(name)}-${Date.now()}`,
    name,
    type,
    price,
    rating,
    width,
    depth,
    height,
    model: type,
    maxLoad: Math.max(18, Math.round(state.cat.weight * 2.5)),
    material: "imported placeholder",
    source: sourceHost || "manual import",
    url: sourceHost ? url : fallbackUrl
  };
  state.catalog.unshift(product);
  addPiece(product.id);
  renderCatalog();
  saveState(false);
  showToast("Imported piece added as an editable 3D placeholder");
}

function openMarketplaceSearch() {
  const query = els.catalogSearch.value.trim() || els.importName.value.trim() || "cat wall shelf bridge hammock";
  const urls = [
    `https://www.chewy.com/s?query=${encodeURIComponent(query)}`,
    `https://www.etsy.com/search?q=${encodeURIComponent(query)}`,
    `https://www.google.com/search?q=${encodeURIComponent(`${query} dimensions cat wall furniture`)}`
  ];
  urls.forEach((url) => window.open(url, "_blank", "noopener,noreferrer"));
}

function setMode(mode) {
  state.mode = mode;
  els.stage.classList.toggle("is-2d", mode === "2d");
  els.stage.classList.toggle("is-3d", mode === "3d");
  els.mode2d.classList.toggle("is-active", mode === "2d");
  els.mode3d.classList.toggle("is-active", mode === "3d");
  els.mode2d.setAttribute("aria-selected", String(mode === "2d"));
  els.mode3d.setAttribute("aria-selected", String(mode === "3d"));
  els.stageHint.textContent = mode === "2d"
    ? "Drag pieces to place them. Select a piece to edit exact dimensions."
    : "Drag the preview to orbit. Scroll to zoom. Select pieces in 2D to edit.";
  resizeThree();
  saveState(false);
}

function updateAll() {
  syncDynamicInputs();
  constrainPlacedPieces();
  render2d();
  renderSelected();
  renderPricing();
  renderAnalysis();
  updateThreeScene();
  saveState(false);
}

function syncDynamicInputs() {
  els.wallLabel.textContent = `${formatFeet(state.wall.width)} x ${formatFeet(state.wall.height)} wall`;
  els.cornerDepthField.hidden = !state.wall.corner;
  els.cornerStrip.classList.toggle("is-visible", state.wall.corner);
  document.documentElement.style.setProperty("--cat-w", `${Math.max(42, state.cat.length * 3)}px`);
  document.documentElement.style.setProperty("--cat-h", `${Math.max(22, state.cat.height * 3)}px`);
  if (state.wall.photoDataUrl) {
    els.wall2d.style.setProperty("--room-photo", `url("${state.wall.photoDataUrl}")`);
  } else {
    els.wall2d.style.removeProperty("--room-photo");
  }
}

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
  piece.x = clamp(Math.round(dragState.originX + dx), 0, Math.max(0, state.wall.width - piece.width));
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

function updateSelectedPositionFields(piece) {
  if (piece.id !== state.selectedId) return;
  els.selectedX.value = Math.round(piece.x);
  els.selectedY.value = Math.round(piece.y);
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
  piece.x = clampNumber(els.selectedX.value, 0, Math.max(0, state.wall.width - piece.width));
  piece.y = clampNumber(els.selectedY.value, 0, Math.max(0, state.wall.height - piece.height));
  piece.price = clampNumber(els.selectedPrice.value, 0, 5000);
  piece.face = state.wall.corner ? els.selectedFace.value : "front";
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

function renderPricing() {
  const subtotal = state.placed.reduce((sum, piece) => sum + Number(piece.price || 0), 0);
  const hardware = state.placed.length ? Math.max(18, Math.round(subtotal * 0.08)) : 0;
  els.subtotal.textContent = money.format(subtotal);
  els.hardware.textContent = money.format(hardware);
  els.totalPrice.textContent = money.format(subtotal + hardware);
  els.pieceCount.textContent = `${state.placed.length} piece${state.placed.length === 1 ? "" : "s"}`;
}

function renderAnalysis() {
  const analysis = analyzeDesign();
  els.fitScore.textContent = `Fit score ${analysis.score}%`;
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

function clearDesign() {
  state.placed = [];
  state.selectedId = null;
  updateAll();
  showToast("Design cleared");
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

function initThree() {
  three.renderer = new THREE.WebGLRenderer({
    canvas: els.threeCanvas,
    antialias: true,
    alpha: true
  });
  three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  three.renderer.outputColorSpace = THREE.SRGBColorSpace;
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.toneMappingExposure = 1.12;
  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0xdfe6e0);
  three.camera = new THREE.PerspectiveCamera(38, 1, 1, 1200);
  three.wallGroup = new THREE.Group();
  three.piecesGroup = new THREE.Group();
  three.catGroup = buildCatModel();
  three.scene.add(three.wallGroup);
  three.scene.add(three.piecesGroup);
  three.scene.add(three.catGroup);
  three.textures = buildTextures();

  const ambient = new THREE.HemisphereLight(0xffffff, 0xb7a184, 2.2);
  three.scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-80, 120, 150);
  three.scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ec3bf, 0.9);
  fill.position.set(120, 70, 80);
  three.scene.add(fill);

  three.ready = true;
  resizeThree();
  updateThreeScene();
  animate();
}

function buildTextures() {
  return {
    wood: makeTexture("#9b6337", "#d8a76b", 160, "wood"),
    carpet: makeTexture("#8f9b88", "#dbe1d2", 90, "noise"),
    sisal: makeTexture("#c89e61", "#f1d7a5", 120, "stripe"),
    canvas: makeTexture("#657c52", "#9eb48d", 120, "canvas"),
    wall: makeTexture("#e7dfd0", "#f8f4ea", 180, "wall")
  };
}

function makeTexture(colorA, colorB, size, type) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < size * 2; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = type === "stripe" ? size : Math.random() * 32 + 8;
    const h = type === "wood" ? Math.random() * 4 + 1 : Math.random() * 3 + 1;
    ctx.fillStyle = i % 2 ? colorB : "rgba(255,255,255,0.18)";
    if (type === "stripe") {
      ctx.fillRect(0, i * 6 % size, size, 2);
    } else if (type === "canvas") {
      ctx.fillRect(x, 0, 1, size);
      ctx.fillRect(0, y, size, 1);
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function resizeThree() {
  if (!three.ready) return;
  const rect = els.threeCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  three.renderer.setSize(rect.width, rect.height, false);
  three.camera.aspect = rect.width / rect.height;
  three.camera.updateProjectionMatrix();
  updateCamera();
}

function updateCamera() {
  if (!three.ready) return;
  const target = new THREE.Vector3(state.wall.width / 2, state.wall.height / 2, 0);
  const yaw = three.orbit.yaw;
  const pitch = three.orbit.pitch;
  const distance = three.orbit.distance;
  const x = target.x + Math.sin(yaw) * distance;
  const z = target.z + Math.cos(yaw) * distance;
  const y = target.y + Math.sin(pitch) * distance;
  three.camera.position.set(x, y, z);
  three.camera.lookAt(target);
}

function updateThreeScene() {
  if (!three.ready) return;
  clearGroup(three.wallGroup);
  clearGroup(three.piecesGroup);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0eadc,
    roughness: 0.86,
    metalness: 0.02,
    map: three.textures.wall
  });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(state.wall.width, state.wall.height, 2), wallMaterial);
  wall.position.set(state.wall.width / 2, state.wall.height / 2, -1);
  wall.receiveShadow = true;
  three.wallGroup.add(wall);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(state.wall.width, 3, state.wall.depth),
    new THREE.MeshStandardMaterial({ color: 0xb68d60, roughness: 0.7, map: three.textures.wood })
  );
  floor.position.set(state.wall.width / 2, -1.5, state.wall.depth / 2);
  three.wallGroup.add(floor);

  if (state.wall.corner) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(2, state.wall.height, state.wall.cornerDepth),
      wallMaterial.clone()
    );
    side.position.set(state.wall.width + 1, state.wall.height / 2, state.wall.cornerDepth / 2);
    three.wallGroup.add(side);
  }

  addGridLines();
  const analysis = analyzeDesign();
  const reachable = new Set(analysis.reachableIds);
  const warnings = new Set(analysis.warningIds);

  state.placed.forEach((piece) => {
    const model = buildPieceModel(piece);
    const centerX = piece.x + piece.width / 2;
    const centerY = piece.y + piece.height / 2;
    if (piece.face === "right" && state.wall.corner) {
      model.position.set(state.wall.width + piece.depth / 2, centerY, piece.x + piece.width / 2);
      model.rotation.y = Math.PI / 2;
    } else {
      model.position.set(centerX, centerY, piece.depth / 2);
    }
    model.rotation.z = THREE.MathUtils.degToRad(piece.rotation);
    if (piece.id === state.selectedId) addSelectionRing(model, piece);
    if (warnings.has(piece.id)) addWarningMarker(model, piece);
    if (reachable.has(piece.id)) addReachGlow(model, piece);
    three.piecesGroup.add(model);
  });

  updateCatModel();
  updateCamera();
}

function addGridLines() {
  const material = new THREE.LineBasicMaterial({ color: 0xbac4bb, transparent: true, opacity: 0.42 });
  const group = new THREE.Group();
  for (let x = 0; x <= state.wall.width; x += 12) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0, 0.4),
      new THREE.Vector3(x, state.wall.height, 0.4)
    ]);
    group.add(new THREE.Line(geo, material));
  }
  for (let y = 0; y <= state.wall.height; y += 12) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, y, 0.4),
      new THREE.Vector3(state.wall.width, y, 0.4)
    ]);
    group.add(new THREE.Line(geo, material));
  }
  three.wallGroup.add(group);
}

function buildPieceModel(piece) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98652, roughness: 0.62, map: three.textures.wood });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x7a4f2f, roughness: 0.68, map: three.textures.wood });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x8f9b88, roughness: 0.92, map: three.textures.carpet });
  const sisal = new THREE.MeshStandardMaterial({ color: 0xc89e61, roughness: 0.95, map: three.textures.sisal });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x657c52, roughness: 0.86, map: three.textures.canvas });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.72 });
  const black = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 });
  const acrylic = new THREE.MeshPhysicalMaterial({
    color: 0xbce9ef,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.55,
    transparent: true,
    opacity: 0.42
  });
  const materials = { wood, darkWood, carpet, sisal, canvas, white, black, acrylic };
  const profile = piece.model || piece.type;

  if (profile === "frisco-cushion-shelf") {
    buildFriscoCushionedShelf(group, piece, materials);
  } else if (profile === "frisco-acrylic-bowl") {
    buildFriscoAcrylicBowl(group, piece, materials);
  } else if (profile === "frisco-silhouette-bridge") {
    buildFriscoSilhouetteBridge(group, piece, materials);
  } else if (profile === "frisco-four-steps") {
    buildFriscoFourSteps(group, piece, materials);
  } else if (profile === "lotus-leaf") {
    buildLotusLeafShelf(group, piece, materials);
  } else if (profile === "armarkat-two-level") {
    buildArmarkatTwoLevel(group, piece, materials);
  } else if (profile === "pawhut-10-level") {
    buildPawhutTenLevel(group, piece, materials);
  } else if (profile === "trixie-post-perch") {
    buildTrixiePostPerch(group, piece, materials);
  } else if (piece.type === "bridge") {
    const railZ = Math.max(3, piece.depth * 0.34);
    const railA = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2, 2), darkWood);
    railA.position.set(0, 0, -railZ);
    const railB = railA.clone();
    railB.position.z = railZ;
    group.add(railA, railB);
    const rungCount = Math.max(5, Math.round(piece.width / 6));
    for (let i = 0; i < rungCount; i += 1) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, piece.depth), wood);
      rung.position.x = -piece.width / 2 + (i + 0.5) * (piece.width / rungCount);
      rung.position.y = Math.sin(i * 0.9) * 1.2;
      group.add(rung);
    }
  } else if (piece.type === "scratcher") {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(piece.width / 2, piece.width / 2, piece.height, 28), sisal);
    post.rotation.x = Math.PI / 2;
    post.position.z = 0;
    group.add(post);
    const capA = new THREE.Mesh(new THREE.BoxGeometry(piece.width + 3, piece.depth + 2, 2), wood);
    capA.position.y = -piece.height / 2;
    const capB = capA.clone();
    capB.position.y = piece.height / 2;
    group.add(capA, capB);
  } else if (piece.type === "hammock") {
    const frameA = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2, 2), darkWood);
    frameA.position.z = -piece.depth / 2;
    const frameB = frameA.clone();
    frameB.position.z = piece.depth / 2;
    const sling = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2.4, piece.depth), canvas);
    sling.position.y = -1.2;
    sling.scale.y = 0.5;
    group.add(frameA, frameB, sling);
    addBrackets(group, piece, darkWood);
  } else if (piece.type === "hideout") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), wood);
    group.add(box);
    const opening = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(piece.width, piece.height) * 0.22, Math.min(piece.width, piece.height) * 0.22, 1.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a1b13, roughness: 0.85 })
    );
    opening.rotation.x = Math.PI / 2;
    opening.position.set(0, 0, piece.depth / 2 + 0.8);
    group.add(opening);
  } else if (piece.type === "corner") {
    const corner = new THREE.Shape();
    corner.moveTo(-piece.width / 2, -piece.depth / 2);
    corner.lineTo(piece.width / 2, -piece.depth / 2);
    corner.lineTo(piece.width / 2, piece.depth / 2);
    corner.lineTo(-piece.width / 2, -piece.depth / 2);
    const geo = new THREE.ExtrudeGeometry(corner, { depth: piece.height, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.5 });
    const mesh = new THREE.Mesh(geo, wood);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
    addBrackets(group, piece, darkWood);
  } else {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), wood);
    shelf.position.y = 0;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.94, 1.5, piece.depth * 0.86), carpet);
    pad.position.y = piece.height / 2 + 0.9;
    group.add(shelf, pad);
    addBrackets(group, piece, darkWood);
  }

  group.userData.pieceId = piece.id;
  return group;
}

function buildFriscoCushionedShelf(group, piece, materials) {
  const shelfHeight = Math.max(2, piece.height * 0.42);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(piece.width, shelfHeight, piece.depth), materials.wood);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.92, Math.max(1.4, piece.height * 0.28), piece.depth * 0.82), materials.carpet);
  cushion.position.y = shelfHeight / 2 + 0.9;
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2.2, 1.2), materials.darkWood);
  backRail.position.set(0, piece.height * 0.18, -piece.depth / 2 - 0.3);
  group.add(shelf, cushion, backRail);
  addBrackets(group, piece, materials.darkWood);
  addTeaserToy(group, piece, materials);
}

function buildFriscoAcrylicBowl(group, piece, materials) {
  const shelfHeight = Math.max(2, piece.height * 0.35);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(piece.width, shelfHeight, piece.depth), materials.wood);
  shelf.position.y = -piece.height * 0.12;
  const leftMat = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.24, 1.2, piece.depth * 0.78), materials.sisal);
  leftMat.position.set(-piece.width * 0.34, shelfHeight / 2 + 0.3, 0);
  const rightMat = leftMat.clone();
  rightMat.position.x = piece.width * 0.34;
  const radius = Math.min(piece.width, piece.depth) * 0.34;
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
    materials.acrylic
  );
  bowl.scale.y = 0.46;
  bowl.position.y = shelfHeight / 2 + 1.6;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.55, 12, 48), materials.acrylic);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = bowl.position.y + 0.2;
  group.add(shelf, leftMat, rightMat, bowl, rim);
  addBrackets(group, piece, materials.darkWood);
}

function buildFriscoSilhouetteBridge(group, piece, materials) {
  const cubbyWidth = Math.min(14, piece.width * 0.28);
  const cubbyHeight = Math.max(12, piece.height * 0.86);
  const bridgeLength = Math.max(12, piece.width - cubbyWidth * 1.75);
  const leftCubby = new THREE.Mesh(new THREE.BoxGeometry(cubbyWidth, cubbyHeight, piece.depth), materials.wood);
  leftCubby.position.set(-piece.width / 2 + cubbyWidth / 2, -1, 0);
  const rightCubby = leftCubby.clone();
  rightCubby.position.x = piece.width / 2 - cubbyWidth / 2;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(bridgeLength, 2, piece.depth * 0.72), materials.canvas);
  bridge.position.y = -piece.height * 0.16;
  const topMatLeft = new THREE.Mesh(new THREE.BoxGeometry(cubbyWidth * 0.8, 1.1, piece.depth * 0.68), materials.sisal);
  topMatLeft.position.set(leftCubby.position.x, cubbyHeight / 2 + 0.2, 0);
  const topMatRight = topMatLeft.clone();
  topMatRight.position.x = rightCubby.position.x;
  group.add(leftCubby, rightCubby, bridge, topMatLeft, topMatRight);
  addCatOpening(group, leftCubby.position.x, -1, piece.depth / 2 + 0.7, cubbyHeight * 0.22, materials.black);
  addCatOpening(group, rightCubby.position.x, -1, piece.depth / 2 + 0.7, cubbyHeight * 0.22, materials.black);
  addBridgeRibs(group, bridgeLength, piece.depth * 0.72, -piece.height * 0.16, materials.darkWood);
}

function buildFriscoFourSteps(group, piece, materials) {
  const stepWidth = Math.max(7, piece.width / 4.3);
  const stepHeight = 2.2;
  const slots = [
    [-0.36, -0.35],
    [-0.12, -0.12],
    [0.12, 0.12],
    [0.36, 0.35]
  ];
  slots.forEach(([xSlot, ySlot]) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, piece.depth), materials.wood);
    step.position.set(piece.width * xSlot, piece.height * ySlot, 0);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(stepWidth * 0.78, 0.8, piece.depth * 0.72), materials.sisal);
    mat.position.set(step.position.x, step.position.y + stepHeight / 2 + 0.45, 0);
    group.add(step, mat);
  });
}

function buildLotusLeafShelf(group, piece, materials) {
  const shape = new THREE.Shape();
  shape.moveTo(-piece.width / 2, 0);
  shape.bezierCurveTo(-piece.width * 0.22, piece.height * 0.58, piece.width * 0.26, piece.height * 0.58, piece.width / 2, 0);
  shape.bezierCurveTo(piece.width * 0.22, -piece.height * 0.42, -piece.width * 0.26, -piece.height * 0.42, -piece.width / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: piece.depth, bevelEnabled: true, bevelSize: 0.45, bevelThickness: 0.45 });
  const leaf = new THREE.Mesh(geo, materials.white);
  leaf.position.z = -piece.depth / 2;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.64, 1.2, piece.depth * 0.62), materials.carpet);
  pad.position.y = 0.2;
  group.add(leaf, pad);
  addBrackets(group, piece, materials.darkWood);
}

function buildArmarkatTwoLevel(group, piece, materials) {
  const shelfHeight = 2.4;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(piece.width, shelfHeight, piece.depth), materials.wood);
  lower.position.y = -piece.height * 0.28;
  const upper = lower.clone();
  upper.position.y = piece.height * 0.28;
  upper.position.x = piece.width * 0.08;
  const postA = new THREE.Mesh(new THREE.BoxGeometry(2, piece.height * 0.62, 2), materials.darkWood);
  postA.position.set(-piece.width * 0.36, 0, -piece.depth * 0.32);
  const postB = postA.clone();
  postB.position.x = piece.width * 0.36;
  const matA = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.72, 1, piece.depth * 0.68), materials.carpet);
  matA.position.set(lower.position.x, lower.position.y + shelfHeight / 2 + 0.55, 0);
  const matB = matA.clone();
  matB.position.set(upper.position.x, upper.position.y + shelfHeight / 2 + 0.55, 0);
  group.add(lower, upper, postA, postB, matA, matB);
}

function buildPawhutTenLevel(group, piece, materials) {
  const house = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.72, piece.height * 0.5, piece.depth * 0.86), materials.wood);
  house.position.set(piece.width * 0.08, -piece.height * 0.2, 0);
  group.add(house);
  addCatOpening(group, house.position.x, house.position.y, piece.depth * 0.44 + 0.7, piece.height * 0.13, materials.black);
  const stepWidth = piece.width * 0.35;
  for (let i = 0; i < 6; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, 1.6, piece.depth * 0.58), materials.wood);
    step.position.set((i % 2 ? 0.28 : -0.28) * piece.width, -piece.height * 0.42 + i * (piece.height * 0.16), 0);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(stepWidth * 0.82, 0.55, piece.depth * 0.48), materials.carpet);
    pad.position.set(step.position.x, step.position.y + 1.05, 0);
    group.add(step, pad);
  }
}

function buildTrixiePostPerch(group, piece, materials) {
  const postHeight = piece.height * 0.68;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(piece.depth * 0.22, piece.depth * 0.22, postHeight, 32), materials.sisal);
  post.position.y = -piece.height * 0.05;
  const perch = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2.4, piece.depth), materials.wood);
  perch.position.y = post.position.y + postHeight / 2 + 2;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.82, 0.9, piece.depth * 0.76), materials.carpet);
  pad.position.y = perch.position.y + 1.55;
  const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.44, piece.height, 1.3), materials.white);
  wallPlate.position.z = -piece.depth / 2 - 0.4;
  group.add(wallPlate, post, perch, pad);
}

function addTeaserToy(group, piece, materials) {
  const cord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(piece.width * 0.35, piece.height * 0.2, piece.depth * 0.42),
      new THREE.Vector3(piece.width * 0.35, -piece.height * 0.55, piece.depth * 0.42)
    ]),
    new THREE.LineBasicMaterial({ color: 0x202725 })
  );
  const toy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), materials.canvas);
  toy.position.set(piece.width * 0.35, -piece.height * 0.62, piece.depth * 0.42);
  group.add(cord, toy);
}

function addCatOpening(group, x, y, z, radius, material) {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 32), material);
  head.rotation.x = Math.PI / 2;
  head.position.set(x, y, z);
  const earLeft = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.36, radius * 0.55, 3), material);
  earLeft.rotation.z = Math.PI;
  earLeft.position.set(x - radius * 0.52, y + radius * 0.7, z + 0.05);
  const earRight = earLeft.clone();
  earRight.position.x = x + radius * 0.52;
  group.add(head, earLeft, earRight);
}

function addBridgeRibs(group, length, depth, y, material) {
  const count = Math.max(5, Math.round(length / 6));
  for (let i = 0; i < count; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, depth + 0.8), material);
    rib.position.set(-length / 2 + (i + 0.5) * (length / count), y + 1.25, 0);
    group.add(rib);
  }
}

function addBrackets(group, piece, material) {
  const bracketWidth = Math.min(5, piece.width * 0.18);
  [-0.32, 0.32].forEach((slot) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(bracketWidth, 6, 1.5), material);
    bracket.position.set(piece.width * slot, -4, -piece.depth / 2 - 0.5);
    group.add(bracket);
  });
}

function addSelectionRing(model, piece) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const ring = new THREE.Mesh(
    new THREE.BoxGeometry(size.x + 4, size.y + 4, 1),
    new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.32 })
  );
  ring.position.set(0, 0, piece.depth / 2 + 2);
  model.add(ring);
}

function addWarningMarker(model, piece) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xb9553f, emissive: 0x5b160f, emissiveIntensity: 0.4 })
  );
  marker.position.set(piece.width / 2 - 3, piece.height / 2 + 5, piece.depth / 2 + 3);
  model.add(marker);
}

function addReachGlow(model, piece) {
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(piece.width + 2, Math.max(piece.height, 4) + 2, piece.depth + 2),
    new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.12 })
  );
  model.add(glow);
}

function buildCatModel() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x242a28, roughness: 0.72 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), fur);
  body.name = "body";
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fur);
  head.name = "head";
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16), fur);
  tail.name = "tail";
  group.add(body, head, tail);
  group.position.set(22, state.cat.height / 2, 16);
  return group;
}

function updateCatModel() {
  if (!three.catGroup) return;
  const body = three.catGroup.getObjectByName("body");
  const head = three.catGroup.getObjectByName("head");
  const tail = three.catGroup.getObjectByName("tail");
  body.scale.set(state.cat.length * 0.34, state.cat.height * 0.36, state.cat.height * 0.32);
  head.scale.set(state.cat.height * 0.22, state.cat.height * 0.22, state.cat.height * 0.22);
  head.position.set(state.cat.length * 0.28, state.cat.height * 0.13, 0);
  tail.scale.set(state.cat.height * 0.07, state.cat.height * 0.07, state.cat.length * 0.34);
  tail.rotation.x = Math.PI / 2.5;
  tail.position.set(-state.cat.length * 0.28, state.cat.height * 0.16, 0);
  three.catGroup.position.y = Math.max(state.cat.height / 2, three.catGroup.position.y);
}

function animateThreeCat(path) {
  if (!three.ready || !path.length) return;
  const points = path.map((piece) => new THREE.Vector3(
    piece.face === "right" && state.wall.corner ? state.wall.width + 12 : piece.x + piece.width / 2,
    piece.y + piece.height + state.cat.height * 0.36,
    piece.face === "right" && state.wall.corner ? piece.x + piece.width / 2 : Math.max(12, piece.depth + 8)
  ));
  let index = 0;
  const step = () => {
    const point = points[index];
    if (!point) return;
    three.catGroup.position.lerp(point, 0.18);
    if (three.catGroup.position.distanceTo(point) < 1.2) index += 1;
    if (index < points.length) requestAnimationFrame(step);
  };
  step();
}

function animate() {
  three.animationFrame = requestAnimationFrame(animate);
  if (!three.ready) return;
  if (state.mode === "3d") {
    three.catGroup.rotation.y = Math.sin(performance.now() * 0.0012) * 0.08;
  }
  three.renderer.render(three.scene, three.camera);
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.((object) => {
      object.geometry?.dispose?.();
      if (object.material && !Array.isArray(object.material)) object.material.dispose?.();
    });
  }
}

function constrainPlacedPieces() {
  state.placed.forEach((piece) => {
    piece.x = clamp(Number(piece.x) || 0, 0, Math.max(0, state.wall.width - piece.width));
    piece.y = clamp(Number(piece.y) || 0, 0, Math.max(0, state.wall.height - piece.height));
    if (!state.wall.corner && piece.face === "right") piece.face = "front";
  });
}

function saveState(show = true) {
  const payload = {
    catalog: state.catalog.filter((product) => !seedCatalog.some((seed) => seed.id === product.id)),
    placed: state.placed,
    wall: state.wall,
    cat: state.cat,
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
    cat: state.cat
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
      state.placed = Array.isArray(payload.placed) ? payload.placed : [];
      state.wall = { ...state.wall, ...payload.wall };
      state.cat = { ...state.cat, ...payload.cat };
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

function getSelectedPiece() {
  return state.placed.find((piece) => piece.id === state.selectedId);
}

function findCatalogProductByUrl(value) {
  const host = safeUrlHost(value);
  if (!host) return null;
  const normalized = value.toLowerCase();
  return state.catalog.find((product) => {
    const skuMatch = product.sku && normalized.includes(String(product.sku).toLowerCase());
    const productUrl = String(product.url || "").toLowerCase();
    const slug = productUrl.split("/dp/")[0].split("/").filter(Boolean).pop() || "";
    return skuMatch || (slug && normalized.includes(slug));
  }) || null;
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return clamp(parsed, min, max);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatFeet(inches) {
  const feet = Math.floor(inches / 12);
  const remainder = inches % 12;
  return remainder ? `${feet} ft ${remainder} in` : `${feet} ft`;
}

function formatInches(value) {
  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}"` : `${rounded.toFixed(2).replace(/0$/, "")}"`;
}

function compactName(name) {
  return name
    .replace(/\b(cat|wall|runner|lookout)\b/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function titleCase(value) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "piece";
}

function safeUrlHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2400);
}

init();
