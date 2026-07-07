// Three.js scene lifecycle, camera/orbit, and 3D dragging.
import * as THREE from "three";
import { analyzeDesign } from "./analysis.js";
import { getPieceMaxX } from "./geometry.js";
import { updateAll } from "./render.js";
import { renderSelected, updateSelectedPositionFields } from "./selection.js";
import { setModelReadyHandler } from "./image-model.js";
import { els, state, three } from "./state.js";
import {
  addReachGlow,
  addSelectionRing,
  addWarningMarker,
  buildPieceModel
} from "./three-models.js";
import { clamp, normalizeColor, shadeColor, showToast } from "./utils.js";

function initThree() {
  three.renderer = new THREE.WebGLRenderer({
    canvas: els.threeCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });
  three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  three.renderer.outputColorSpace = THREE.SRGBColorSpace;
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.toneMappingExposure = 1.12;
  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0xdfe6e0);
  three.camera = new THREE.PerspectiveCamera(38, 1, 1, 1200);
  three.raycaster = new THREE.Raycaster();
  three.pointer = new THREE.Vector2();
  three.wallTextureCache = new Map();
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
  setModelReadyHandler(() => {
    if (three.ready && !three.drag.active) updateThreeScene();
  });
  resizeThree();
  updateThreeScene();
  animate();
}

function buildTextures() {
  return {
    wood: makeTexture("#9b6337", "#d8a76b", 160, "wood"),
    carpet: makeTexture("#8f9b88", "#dbe1d2", 90, "noise"),
    sisal: makeTexture("#c89e61", "#f1d7a5", 120, "stripe"),
    canvas: makeTexture("#657c52", "#9eb48d", 120, "canvas")
  };
}

function getWallTexture() {
  const material = state.wall.material || "paint";
  const color = normalizeColor(state.wall.color, "#f0eadc");
  const key = `${material}:${color}`;
  if (three.wallTextureCache.has(key)) return three.wallTextureCache.get(key);

  const light = shadeColor(color, 24);
  const dark = shadeColor(color, -18);
  const texture = makeWallFinishTexture(color, light, dark, material);
  three.wallTextureCache.set(key, texture);
  return texture;
}

function getWallRoughness(material) {
  return {
    paint: 0.76,
    plaster: 0.94,
    brick: 0.9,
    "wood-panel": 0.68,
    concrete: 0.96
  }[material] || 0.82;
}

function makeWallFinishTexture(color, light, dark, material) {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.55;

  if (material === "brick") {
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 3;
    for (let y = 0; y <= size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      for (let x = (y / 32) % 2 ? 0 : 32; x <= size; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }
  } else if (material === "wood-panel") {
    for (let x = 0; x < size; x += 28) {
      ctx.fillStyle = x % 56 ? "rgba(122,79,47,0.2)" : "rgba(255,255,255,0.16)";
      ctx.fillRect(x, 0, 3, size);
    }
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = i % 2 ? light : dark;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 44 + 8, 1);
    }
  } else {
    const speckCount = material === "paint" ? 80 : 180;
    for (let i = 0; i < speckCount; i += 1) {
      ctx.fillStyle = i % 2 ? light : dark;
      const radius = material === "concrete" ? Math.random() * 1.6 + 0.4 : Math.random() * 1.1 + 0.2;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(material === "brick" ? 2.6 : 2, material === "wood-panel" ? 1.2 : 2);
  return texture;
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
    color: new THREE.Color(state.wall.color),
    roughness: getWallRoughness(state.wall.material),
    metalness: 0.02,
    map: getWallTexture()
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
    positionPieceModel(model, piece);
    if (piece.id === state.selectedId) addSelectionRing(model, piece);
    if (warnings.has(piece.id)) addWarningMarker(model, piece);
    if (reachable.has(piece.id)) addReachGlow(model, piece);
    three.piecesGroup.add(model);
  });

  updateCatModel();
  updateCamera();
}

function positionPieceModel(model, piece) {
  const centerX = piece.x + piece.width / 2;
  const centerY = piece.y + piece.height / 2;
  model.rotation.set(0, 0, THREE.MathUtils.degToRad(piece.rotation));
  if (piece.face === "right" && state.wall.corner) {
    // Hang off the inner face of the right corner wall, facing into the room.
    model.position.set(state.wall.width - piece.depth / 2, centerY, centerX);
    model.rotation.y = -Math.PI / 2;
  } else {
    model.position.set(centerX, centerY, piece.depth / 2);
  }
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
    piece.face === "right" && state.wall.corner ? state.wall.width - 12 : piece.x + piece.width / 2,
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

function getCanvasPointer(event) {
  const rect = els.threeCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  three.pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  return true;
}

function getPieceHitAtPointer(event) {
  if (!three.ready || !three.raycaster || !getCanvasPointer(event)) return null;
  three.raycaster.setFromCamera(three.pointer, three.camera);
  const hits = three.raycaster.intersectObjects(three.piecesGroup.children, true);
  for (const hit of hits) {
    const model = findPieceModel(hit.object);
    if (model) return { model, point: hit.point.clone() };
  }
  return null;
}

function findPieceModel(object) {
  let current = object;
  while (current && current !== three.piecesGroup) {
    if (current.userData?.pieceId) return current;
    current = current.parent;
  }
  return null;
}

function beginThreePieceDrag(event, hit) {
  const pieceId = hit.model.userData.pieceId;
  const piece = state.placed.find((item) => item.id === pieceId);
  if (!piece) return;

  const planeNormal = piece.face === "right" && state.wall.corner
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 0, 1);
  const planeConstant = piece.face === "right" && state.wall.corner
    ? -hit.model.position.x
    : -hit.model.position.z;

  three.drag.active = true;
  three.drag.model = hit.model;
  three.drag.piece = piece;
  three.drag.plane = new THREE.Plane(planeNormal, planeConstant);
  three.drag.offset = hit.point.sub(hit.model.position);
  three.drag.pointerId = event.pointerId;
  three.drag.moved = false;
  three.drag.startX = event.clientX;
  three.drag.startY = event.clientY;
  three.orbit.dragging = false;

  state.selectedId = piece.id;
  renderSelected();
  els.threeStage.classList.add("is-dragging");
  els.threeStage.classList.remove("is-orbiting");

  try {
    els.threeCanvas.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is best-effort on some touch browsers.
  }
}

function moveThreePieceDrag(event) {
  if (!three.drag.active || (three.drag.pointerId !== null && event.pointerId !== three.drag.pointerId)) return;
  event.preventDefault();
  if (!getCanvasPointer(event)) return;
  three.raycaster.setFromCamera(three.pointer, three.camera);
  const point = new THREE.Vector3();
  if (!three.raycaster.ray.intersectPlane(three.drag.plane, point)) return;

  const piece = three.drag.piece;
  const center = point.sub(three.drag.offset);
  if (piece.face === "right" && state.wall.corner) {
    piece.x = clamp(Math.round(center.z - piece.width / 2), 0, getPieceMaxX(piece));
    piece.y = clamp(Math.round(center.y - piece.height / 2), 0, Math.max(0, state.wall.height - piece.height));
  } else {
    piece.x = clamp(Math.round(center.x - piece.width / 2), 0, getPieceMaxX(piece));
    piece.y = clamp(Math.round(center.y - piece.height / 2), 0, Math.max(0, state.wall.height - piece.height));
  }
  three.drag.moved = three.drag.moved
    || Math.abs(event.clientX - three.drag.startX) > 2
    || Math.abs(event.clientY - three.drag.startY) > 2;
  positionPieceModel(three.drag.model, piece);
  updateSelectedPositionFields(piece);
}

function finishThreePieceDrag(event) {
  if (!three.drag.active || (three.drag.pointerId !== null && event.pointerId !== three.drag.pointerId)) return;
  event.preventDefault();
  const moved = three.drag.moved;
  try {
    els.threeCanvas.releasePointerCapture(event.pointerId);
  } catch {
    // Some browsers release automatically.
  }
  els.threeStage.classList.remove("is-dragging");
  three.drag.active = false;
  three.drag.model = null;
  three.drag.piece = null;
  three.drag.plane = null;
  three.drag.offset = null;
  three.drag.pointerId = null;
  three.drag.moved = false;
  if (moved) showToast("Piece moved");
  updateAll();
}

export {
  initThree,
  buildTextures,
  getWallTexture,
  getWallRoughness,
  makeWallFinishTexture,
  makeTexture,
  resizeThree,
  updateCamera,
  updateThreeScene,
  positionPieceModel,
  addGridLines,
  buildCatModel,
  updateCatModel,
  animateThreeCat,
  animate,
  clearGroup,
  getCanvasPointer,
  getPieceHitAtPointer,
  findPieceModel,
  beginThreePieceDrag,
  moveThreePieceDrag,
  finishThreePieceDrag
};
