// Photo -> 3D model: analyze a product picture, classify a furniture archetype,
// and generate a palette-tinted Three.js mesh with the photo mapped on the front.
// Works for uploaded files (full pixel analysis) and remote URLs (degrades to
// aspect + type when the host blocks cross-origin pixel reads).
import * as THREE from "three";
import { three } from "./state.js";
import { clamp } from "./utils.js";

const analysisCache = new Map();     // src -> analysis object
const analysisPromises = new Map();  // src -> Promise<analysis>
const textureCache = new Map();      // src -> THREE.Texture | null
const texturePending = new Set();    // src currently loading
const loader = new THREE.TextureLoader();
let onModelReady = null;             // set by the scene; called when async work lands

// The scene registers updateThreeScene here so a finished image analysis or
// texture load can trigger a rebuild with the richer model.
function setModelReadyHandler(fn) {
  onModelReady = fn;
}

const DEFAULT_PALETTE = {
  primary: 0xb98652,
  body: 0xb98652,
  dark: 0x6f4a2c,
  accent: 0x8f9b88,
  light: 0xe9dcc6
};

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function analyzeImage(src) {
  if (!src) return Promise.resolve(null);
  if (analysisCache.has(src)) return Promise.resolve(analysisCache.get(src));
  if (analysisPromises.has(src)) return analysisPromises.get(src);

  const promise = new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      let analysis;
      try {
        analysis = runImageAnalysis(img);
      } catch {
        analysis = fallbackAnalysis(img);
      }
      analysisCache.set(src, analysis);
      resolve(analysis);
    };
    img.onerror = () => {
      const analysis = fallbackAnalysis(null);
      analysisCache.set(src, analysis);
      resolve(analysis);
    };
    img.src = src;
  });

  analysisPromises.set(src, promise);
  return promise;
}

// Synchronous accessor used inside the render loop: returns the cached analysis
// or null, kicking off the load (and a later rebuild) the first time.
function getAnalysis(src) {
  if (!src) return null;
  if (analysisCache.has(src)) return analysisCache.get(src);
  analyzeImage(src).then(() => onModelReady && onModelReady());
  return null;
}

function fallbackAnalysis(img) {
  const aspect = img && img.naturalWidth && img.naturalHeight
    ? img.naturalWidth / img.naturalHeight
    : 1;
  return {
    readable: false,
    aspect,
    silhouetteAspect: 1 / aspect,
    fillRatio: 0.5,
    squareish: Math.abs(aspect - 1) < 0.2,
    palette: [],
    ...DEFAULT_PALETTE
  };
}

function runImageAnalysis(img) {
  const maxDim = 120;
  const nw = img.naturalWidth || maxDim;
  const nh = img.naturalHeight || maxDim;
  const scale = Math.min(1, maxDim / Math.max(nw, nh));
  const w = Math.max(8, Math.round(nw * scale));
  const h = Math.max(8, Math.round(nh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return fallbackAnalysis(img); // cross-origin taint: keep it honest
  }

  // Background estimated from the border ring, foreground = everything else.
  const border = [];
  for (let x = 0; x < w; x += 1) {
    border.push(sample(data, x, 0, w), sample(data, x, h - 1, w));
  }
  for (let y = 0; y < h; y += 1) {
    border.push(sample(data, 0, y, w), sample(data, w - 1, y, w));
  }
  const bg = medianColor(border);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let fg = 0;
  const buckets = new Map();
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (a <= 40 || colorDist(r, g, b, bg) <= 46) continue;
      fg += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
      let e = buckets.get(key);
      if (!e) {
        e = { n: 0, r: 0, g: 0, b: 0 };
        buckets.set(key, e);
      }
      e.n += 1;
      e.r += r;
      e.g += g;
      e.b += b;
    }
  }

  const aspect = nw / nh;
  if (fg < w * h * 0.02 || buckets.size === 0) {
    return { readable: true, aspect, silhouetteAspect: 1 / aspect, fillRatio: 0.5, squareish: Math.abs(aspect - 1) < 0.2, palette: [], ...DEFAULT_PALETTE };
  }

  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const silhouetteAspect = bh / bw; // > 1 means tall
  const fillRatio = fg / (bw * bh);

  const swatches = [...buckets.values()]
    .sort((p, q) => q.n - p.n)
    .slice(0, 6)
    .map((e) => {
      const r = Math.round(e.r / e.n);
      const g = Math.round(e.g / e.n);
      const b = Math.round(e.b / e.n);
      return { n: e.n, col: (r << 16) | (g << 8) | b, r, g, b, lum: 0.3 * r + 0.59 * g + 0.11 * b };
    });

  const palette = swatches.map((s) => s.col);
  const primary = swatches[0].col;
  const dark = swatches.reduce((m, s) => (s.lum < m.lum ? s : m), swatches[0]).col;
  const light = swatches.reduce((m, s) => (s.lum > m.lum ? s : m), swatches[0]).col;
  const accent = pickAccent(swatches, primary);
  const squareish = Math.abs(silhouetteAspect - 1) < 0.28 && fillRatio > 0.55;

  return {
    readable: true,
    aspect,
    silhouetteAspect,
    fillRatio,
    squareish,
    palette,
    primary,
    body: primary,
    dark,
    light,
    accent
  };
}

function sample(data, x, y, w) {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function medianColor(list) {
  const channel = (c) => list.map((p) => p[c]).sort((a, b) => a - b)[list.length >> 1] || 0;
  return [channel(0), channel(1), channel(2)];
}

function colorDist(r, g, b, [br, bg, bb]) {
  return Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
}

function pickAccent(swatches, primary) {
  let best = null;
  let bestScore = -1;
  for (const s of swatches) {
    if (s.col === primary) continue;
    const max = Math.max(s.r, s.g, s.b);
    const min = Math.min(s.r, s.g, s.b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const mid = 1 - Math.abs(s.lum - 140) / 140;
    const score = sat * 0.7 + mid * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = s.col;
    }
  }
  return best ?? swatches[Math.min(1, swatches.length - 1)].col;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const TYPE_TO_ARCHETYPE = {
  scratcher: "post",
  hideout: "hideout",
  bridge: "bridge",
  hammock: "hammock",
  corner: "corner",
  shelf: "shelf"
};

const ARCHETYPE_TO_TYPE = {
  post: "scratcher",
  tower: "hideout",
  perch: "shelf",
  shelf: "shelf",
  hideout: "hideout",
  bridge: "bridge",
  hammock: "hammock",
  corner: "corner"
};

function classifyArchetype(analysis, hintType) {
  let base = TYPE_TO_ARCHETYPE[hintType] || "shelf";
  if (analysis && analysis.readable) {
    const sa = analysis.silhouetteAspect; // > 1 tall
    if (base === "shelf") {
      if (sa > 1.55) base = "post";
      else if (analysis.squareish) base = "hideout";
      else if (sa < 0.4) base = "bridge";
    }
    if (base === "post" && sa < 1.1) base = "perch";
    if (base === "hideout" && sa > 1.7) base = "tower";
  }
  return base;
}

function baseTypeForArchetype(archetype) {
  return ARCHETYPE_TO_TYPE[archetype] || "shelf";
}

// ---------------------------------------------------------------------------
// Texture
// ---------------------------------------------------------------------------

function getProductTexture(src) {
  if (!src) return null;
  if (textureCache.has(src)) return textureCache.get(src);
  if (texturePending.has(src)) return null;
  texturePending.add(src);
  loader.load(
    src,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = three.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
      textureCache.set(src, texture);
      texturePending.delete(src);
      if (!three.drag.active && onModelReady) onModelReady();
    },
    undefined,
    () => {
      textureCache.set(src, null); // CORS-blocked or 404: geometry only
      texturePending.delete(src);
    }
  );
  return null;
}

// ---------------------------------------------------------------------------
// Model generation
// ---------------------------------------------------------------------------

function paletteFor(analysis) {
  if (!analysis || !analysis.palette || !analysis.palette.length) return { ...DEFAULT_PALETTE };
  return {
    primary: analysis.primary,
    body: analysis.primary,
    dark: analysis.dark,
    accent: analysis.accent,
    light: analysis.light
  };
}

function mat(color, roughness = 0.7, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// Soft-edged box (flat-shaded, so no texture-UV issues). Centered at the origin.
function roundedBox(w, h, d, radius) {
  const r = Math.max(0.25, Math.min(radius, w / 2 - 0.1, h / 2 - 0.1));
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(0.7, d / 4, r);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, d - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 5
  });
  geo.translate(0, 0, -d / 2 + bevel);
  geo.computeVertexNormals();
  return geo;
}

function buildGeneratedModel(group, piece) {
  const src = piece.imageUrl || piece.assetUrl || "";
  const analysis = getAnalysis(src);
  const archetype = classifyArchetype(analysis, piece.type);
  const palette = paletteFor(analysis);
  const builder = {
    post: genPost,
    perch: genShelf,
    tower: genTower,
    hideout: genHideout,
    bridge: genBridge,
    hammock: genHammock,
    corner: genCorner,
    shelf: genShelf
  }[archetype] || genShelf;
  builder(group, piece, palette);

  const texture = getProductTexture(src);
  if (texture) addPhotoPanel(group, piece, texture, analysis);
  group.userData.archetype = archetype;
}

function genShelf(group, p, pal) {
  const shelfH = Math.max(2.2, Math.min(p.height, p.height * 0.6));
  const shelf = new THREE.Mesh(roundedBox(p.width, shelfH, p.depth, Math.min(shelfH, p.depth) * 0.24), mat(pal.body, 0.64));
  const padH = Math.max(1, p.height * 0.18);
  const pad = new THREE.Mesh(roundedBox(p.width * 0.9, padH, p.depth * 0.82, padH * 0.4), mat(pal.accent, 0.9));
  pad.position.y = shelfH / 2 + padH / 2;
  group.add(shelf, pad);
  genBrackets(group, p, pal.dark);
}

function genPost(group, p, pal) {
  const postH = p.height * 0.72;
  const r = Math.max(1.6, Math.min(p.width, p.depth) * 0.26);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(r, r, postH, 28), mat(pal.body, 0.9));
  post.position.y = -p.height * 0.05;
  const perchH = Math.max(2, p.height * 0.08);
  const perch = new THREE.Mesh(new THREE.BoxGeometry(p.width, perchH, p.depth), mat(pal.dark, 0.6));
  perch.position.y = post.position.y + postH / 2 + perchH / 2;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(p.width * 0.82, 1, p.depth * 0.76), mat(pal.accent, 0.9));
  pad.position.y = perch.position.y + 1;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(p.width * 0.5, p.height, 1.2), mat(pal.dark, 0.5));
  plate.position.z = -p.depth / 2 - 0.4;
  group.add(plate, post, perch, pad);
}

function genTower(group, p, pal) {
  const box = new THREE.Mesh(roundedBox(p.width, p.height, p.depth, Math.min(p.width, p.depth) * 0.14), mat(pal.body, 0.7));
  group.add(box);
  const roofH = Math.max(1, p.height * 0.06);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(p.width * 1.05, roofH, p.depth * 1.02), mat(pal.accent, 0.85));
  roof.position.y = p.height / 2 + roofH / 2;
  group.add(roof);
  genOpening(group, 0, p.height * 0.08, p.depth / 2 + 0.5, Math.min(p.width, p.height) * 0.16, 0x1c130d);
}

function genHideout(group, p, pal) {
  const box = new THREE.Mesh(roundedBox(p.width, p.height, p.depth, Math.min(p.width, p.height, p.depth) * 0.16), mat(pal.body, 0.68));
  group.add(box);
  genFaceFrame(group, 0, 0, p.depth / 2 + 0.55, p.width, p.height, pal.dark);
  genOpening(group, 0, 0, p.depth / 2 + 0.5, Math.min(p.width, p.height) * 0.24, 0x1c130d);
}

function genBridge(group, p, pal) {
  const endW = Math.max(4, Math.min(10, p.width * 0.16));
  const left = new THREE.Mesh(roundedBox(endW, p.height, p.depth, Math.min(endW, p.depth) * 0.22), mat(pal.body, 0.66));
  left.position.x = -p.width / 2 + endW / 2;
  const right = left.clone();
  right.position.x = p.width / 2 - endW / 2;
  const span = Math.max(2, p.width - endW * 2);
  const deckH = Math.max(1.4, p.height * 0.2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(span, deckH, p.depth * 0.8), mat(pal.accent, 0.85));
  group.add(left, right, deck);
  const n = Math.max(4, Math.round(span / 6));
  for (let i = 0; i < n; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, p.depth * 0.86), mat(pal.dark, 0.6));
    slat.position.set(-span / 2 + (i + 0.5) * (span / n), deckH / 2, 0);
    deck.add(slat);
  }
}

function genHammock(group, p, pal) {
  const barA = new THREE.Mesh(new THREE.BoxGeometry(p.width, 2, 2), mat(pal.dark, 0.6));
  barA.position.z = -p.depth / 2;
  const barB = barA.clone();
  barB.position.z = p.depth / 2;
  const sling = new THREE.Mesh(new THREE.BoxGeometry(p.width * 0.96, 2.4, p.depth), mat(pal.accent, 0.85));
  sling.position.y = -1.4;
  sling.scale.y = 0.5;
  group.add(barA, barB, sling);
  genBrackets(group, p, pal.dark);
}

function genCorner(group, p, pal) {
  const shape = new THREE.Shape();
  shape.moveTo(-p.width / 2, -p.depth / 2);
  shape.lineTo(p.width / 2, -p.depth / 2);
  shape.lineTo(p.width / 2, p.depth / 2);
  shape.lineTo(-p.width / 2, -p.depth / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(2, p.height), bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat(pal.body, 0.68));
  mesh.rotation.x = Math.PI / 2;
  group.add(mesh);
  genBrackets(group, p, pal.dark);
}

function addPhotoPanel(group, p, texture, analysis) {
  const imgAspect = texture.image && texture.image.width && texture.image.height
    ? texture.image.width / texture.image.height
    : (analysis && analysis.aspect) || 1;
  let pw = clamp(p.width * 0.92, 6, Math.max(8, p.width * 1.05));
  let ph = pw / imgAspect;
  const maxH = Math.max(6, p.height * 1.1);
  if (ph > maxH) {
    ph = maxH;
    pw = ph * imgAspect;
  }
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), material);
  plane.position.set(0, clamp(p.height * 0.05, -p.height / 2, p.height / 2), p.depth / 2 + 0.6);
  plane.userData.photo = true;
  group.add(plane);
}

// --- small shared detail helpers (kept local so this module owns its deps) ---

function genEdgeBand(group, width, depth, height, color, y = 0) {
  const material = mat(color, 0.6);
  const front = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.7, 0.85), material);
  front.position.set(0, y + height / 2 + 0.1, depth / 2 + 0.12);
  const back = front.clone();
  back.position.z = -depth / 2 - 0.12;
  group.add(front, back);
}

function genBrackets(group, p, color) {
  const material = mat(color, 0.55);
  const bracketWidth = Math.min(5, p.width * 0.18);
  [-0.32, 0.32].forEach((slot) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(bracketWidth, 6, 1.5), material);
    bracket.position.set(p.width * slot, -4, -p.depth / 2 - 0.5);
    group.add(bracket);
  });
}

function genFaceFrame(group, x, y, z, width, height, color) {
  const material = mat(color, 0.55);
  const rail = 1;
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, rail, 0.8), material);
  top.position.set(x, y + height / 2 - rail / 2, z);
  const bottom = top.clone();
  bottom.position.y = y - height / 2 + rail / 2;
  const left = new THREE.Mesh(new THREE.BoxGeometry(rail, height, 0.8), material);
  left.position.set(x - width / 2 + rail / 2, y, z);
  const right = left.clone();
  right.position.x = x + width / 2 - rail / 2;
  group.add(top, bottom, left, right);
}

function genOpening(group, x, y, z, radius, color) {
  const material = mat(color, 0.85);
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

export {
  analyzeImage,
  getAnalysis,
  classifyArchetype,
  baseTypeForArchetype,
  getProductTexture,
  buildGeneratedModel,
  setModelReadyHandler
};
