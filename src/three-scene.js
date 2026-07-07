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
  three.renderer.toneMappingExposure = 1.08;
  three.renderer.shadowMap.enabled = true;
  three.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

  const ambient = new THREE.HemisphereLight(0xffffff, 0xb7a184, 1.55);
  three.scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff4e2, 2.35);
  key.position.set(-70, 150, 180);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 700;
  key.shadow.camera.left = -260;
  key.shadow.camera.right = 260;
  key.shadow.camera.top = 260;
  key.shadow.camera.bottom = -260;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 3;
  key.target.position.set(72, 52, 0);
  three.scene.add(key);
  three.scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xbfe0dc, 0.6);
  fill.position.set(140, 70, 90);
  three.scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(20, 40, -120);
  three.scene.add(rim);

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
    wood: makeTexture("#a86f3f", "#d8a76b", 256, "wood"),
    carpet: makeTexture("#8f9b88", "#c7cfbc", 256, "noise"),
    sisal: makeTexture("#c69a5c", "#ebcf9c", 256, "stripe"),
    canvas: makeTexture("#71858a", "#aebfc0", 256, "canvas")
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

  if (type === "wood") {
    // soft horizontal grain plus a few flowing streaks
    for (let y = 0; y < size; y += 1) {
      const wave = (Math.sin(y * 0.11) + Math.sin(y * 0.037 + 1.3)) * 0.5;
      ctx.globalAlpha = 0.05 + Math.abs(wave) * 0.06;
      ctx.fillStyle = wave > 0 ? colorB : "rgba(70,42,22,0.6)";
      ctx.fillRect(0, y, size, 1);
    }
    ctx.strokeStyle = "rgba(66,38,18,0.5)";
    for (let i = 0; i < 22; i += 1) {
      const y = Math.random() * size;
      ctx.globalAlpha = 0.1 + Math.random() * 0.1;
      ctx.lineWidth = Math.random() * 1.3 + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.35, y + (Math.random() * 8 - 4), size * 0.65, y + (Math.random() * 8 - 4), size, y + (Math.random() * 6 - 3));
      ctx.stroke();
    }
  } else if (type === "stripe") {
    // fine vertical sisal rope columns
    for (let x = 0; x < size; x += 4) {
      ctx.globalAlpha = 0.4 + Math.random() * 0.2;
      ctx.fillStyle = (x / 4) % 2 ? colorB : "rgba(120,88,48,0.45)";
      ctx.fillRect(x, 0, 2.4, size);
    }
  } else if (type === "canvas") {
    // woven cross-hatch fabric
    for (let x = 0; x < size; x += 7) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = colorB;
      ctx.fillRect(x, 0, 3.5, size);
    }
    for (let y = 0; y < size; y += 7) {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(0, y, size, 3.5);
    }
  } else {
    // carpet: fine low-contrast speckle
    const count = Math.round(size * size * 0.05);
    for (let i = 0; i < count; i += 1) {
      ctx.globalAlpha = 0.06 + Math.random() * 0.08;
      ctx.fillStyle = Math.random() > 0.5 ? colorB : "rgba(74,82,66,0.5)";
      const s = Math.random() * 1.8 + 0.4;
      ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = three.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
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
  floor.receiveShadow = true;
  three.wallGroup.add(floor);

  if (state.wall.corner) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(2, state.wall.height, state.wall.cornerDepth),
      wallMaterial.clone()
    );
    side.position.set(state.wall.width + 1, state.wall.height / 2, state.wall.cornerDepth / 2);
    side.receiveShadow = true;
    three.wallGroup.add(side);
  }

  addGridLines();
  const analysis = analyzeDesign();
  const reachable = new Set(analysis.reachableIds);
  const warnings = new Set(analysis.warningIds);

  state.placed.forEach((piece) => {
    const model = buildPieceModel(piece);
    positionPieceModel(model, piece);
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
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
  const materials = {
    base: new THREE.MeshStandardMaterial({ color: 0xf1d5a4, roughness: 0.82, metalness: 0.02 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xfff0cc, roughness: 0.84, metalness: 0.02 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd58945, roughness: 0.78, metalness: 0.02 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x252b28, roughness: 0.76, metalness: 0.02 }),
    pink: new THREE.MeshStandardMaterial({ color: 0xe9a49d, roughness: 0.88, metalness: 0.02 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x101514, roughness: 0.5, metalness: 0.05 }),
    whisker: new THREE.LineBasicMaterial({ color: 0xf7f0dc, transparent: true, opacity: 0.82 })
  };

  const body = makeCatMesh("body", new THREE.SphereGeometry(1, 40, 24), materials.base);
  const head = makeCatMesh("head", new THREE.SphereGeometry(1, 32, 20), materials.base);
  const chestPatch = makeCatMesh("chestPatch", new THREE.SphereGeometry(1, 24, 14), materials.cream);
  const bodyDarkPatch = makeCatMesh("bodyDarkPatch", new THREE.SphereGeometry(1, 24, 14), materials.dark);
  const bodyOrangePatch = makeCatMesh("bodyOrangePatch", new THREE.SphereGeometry(1, 24, 14), materials.orange);
  const headOrangePatch = makeCatMesh("headOrangePatch", new THREE.SphereGeometry(1, 20, 12), materials.orange);
  const muzzle = makeCatMesh("muzzle", new THREE.SphereGeometry(1, 20, 12), materials.cream);
  const nose = makeCatMesh("nose", new THREE.SphereGeometry(1, 14, 10), materials.pink);

  const earGeometry = new THREE.ConeGeometry(1, 1, 3);
  const leftEar = makeCatMesh("leftEar", earGeometry, materials.base);
  const rightEar = makeCatMesh("rightEar", earGeometry, materials.dark);
  const leftInnerEar = makeCatMesh("leftInnerEar", earGeometry.clone(), materials.pink);
  const rightInnerEar = makeCatMesh("rightInnerEar", earGeometry.clone(), materials.pink);

  const eyeGeometry = new THREE.SphereGeometry(1, 12, 8);
  const leftEye = makeCatMesh("leftEye", eyeGeometry, materials.eye);
  const rightEye = makeCatMesh("rightEye", eyeGeometry.clone(), materials.eye);
  const leftEyeCatch = makeCatMesh("leftEyeCatch", new THREE.SphereGeometry(1, 8, 6), materials.cream);
  const rightEyeCatch = makeCatMesh("rightEyeCatch", new THREE.SphereGeometry(1, 8, 6), materials.cream);

  const legGeometry = new THREE.CylinderGeometry(1, 0.82, 1, 12);
  const pawGeometry = new THREE.SphereGeometry(1, 12, 8);
  ["frontLeft", "frontRight", "backLeft", "backRight"].forEach((name, index) => {
    const material = index % 2 ? materials.orange : materials.dark;
    // Each leg lives under a hip pivot so it can swing as one unit while jumping.
    const pivot = new THREE.Group();
    pivot.name = `${name}LegPivot`;
    const leg = makeCatMesh(`${name}Leg`, legGeometry.clone(), material);
    const paw = makeCatMesh(`${name}Paw`, pawGeometry.clone(), index === 2 ? materials.cream : material);
    pivot.add(leg, paw);
    group.add(pivot);
  });

  const tail = new THREE.Group();
  tail.name = "tail";
  const tailCore = makeCatMesh("tailCore", new THREE.CylinderGeometry(1, 1, 1, 18), materials.orange);
  tail.add(tailCore);
  [-0.36, -0.1, 0.16, 0.4].forEach((offset, index) => {
    const band = makeCatMesh(`tailBand${index + 1}`, new THREE.CylinderGeometry(1.04, 1.04, 0.13, 18), index % 2 ? materials.cream : materials.dark);
    band.position.y = offset;
    tail.add(band);
  });
  const tailTip = makeCatMesh("tailTip", new THREE.SphereGeometry(1, 14, 10), materials.dark);
  tailTip.position.y = 0.55;
  tail.add(tailTip);

  const whiskers = new THREE.Group();
  whiskers.name = "whiskers";
  [
    [0, 0, 0, 0.82, 0.18, 0.72],
    [0, 0, 0, 0.92, 0, 0.82],
    [0, 0, 0, 0.78, -0.16, 0.7],
    [0, 0, 0, 0.82, 0.18, -0.72],
    [0, 0, 0, 0.92, 0, -0.82],
    [0, 0, 0, 0.78, -0.16, -0.7]
  ].forEach((points, index) => {
    const line = makeCatLine(`whisker${index + 1}`, points, materials.whisker);
    whiskers.add(line);
  });

  group.add(
    body,
    chestPatch,
    bodyDarkPatch,
    bodyOrangePatch,
    head,
    headOrangePatch,
    muzzle,
    nose,
    leftEar,
    rightEar,
    leftInnerEar,
    rightInnerEar,
    leftEye,
    rightEye,
    leftEyeCatch,
    rightEyeCatch,
    tail,
    whiskers
  );
  group.position.set(22, state.cat.height / 2, 16);
  return group;
}

function makeCatMesh(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCatLine(name, values, material) {
  const points = [
    new THREE.Vector3(values[0], values[1], values[2]),
    new THREE.Vector3(values[3], values[4], values[5])
  ];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.name = name;
  return line;
}

function updateCatModel() {
  if (!three.catGroup) return;
  const length = state.cat.length;
  const height = state.cat.height;
  const depth = height;
  const headX = length * 0.29;
  const headY = height * 0.14;
  const legY = -height * 0.28;

  const body = three.catGroup.getObjectByName("body");
  const head = three.catGroup.getObjectByName("head");
  const tail = three.catGroup.getObjectByName("tail");
  body.scale.set(length * 0.41, height * 0.3, depth * 0.31);
  body.position.set(-length * 0.02, -height * 0.02, 0);

  setCatPart("chestPatch", [length * 0.22, -height * 0.06, depth * 0.26], [length * 0.08, height * 0.16, depth * 0.04]);
  setCatPart("bodyDarkPatch", [-length * 0.13, height * 0.08, depth * 0.3], [length * 0.12, height * 0.18, depth * 0.045]);
  setCatPart("bodyOrangePatch", [length * 0.04, -height * 0.02, -depth * 0.31], [length * 0.15, height * 0.16, depth * 0.05]);

  head.scale.set(height * 0.22, height * 0.22, height * 0.22);
  head.position.set(headX, headY, 0);
  setCatPart("headOrangePatch", [headX + height * 0.03, headY + height * 0.05, -height * 0.18], [height * 0.1, height * 0.13, height * 0.035]);
  setCatPart("muzzle", [headX + height * 0.18, headY - height * 0.06, 0], [height * 0.06, height * 0.045, height * 0.1]);
  setCatPart("nose", [headX + height * 0.235, headY - height * 0.045, 0], [height * 0.025, height * 0.018, height * 0.025]);

  placeEar("leftEar", headX - height * 0.05, headY + height * 0.2, height * 0.11, height, 0.18);
  placeEar("rightEar", headX - height * 0.05, headY + height * 0.2, -height * 0.11, height, -0.18);
  placeEar("leftInnerEar", headX - height * 0.047, headY + height * 0.2, height * 0.111, height * 0.58, 0.18);
  placeEar("rightInnerEar", headX - height * 0.047, headY + height * 0.2, -height * 0.111, height * 0.58, -0.18);

  setCatPart("leftEye", [headX + height * 0.19, headY + height * 0.02, height * 0.075], [height * 0.027, height * 0.037, height * 0.027]);
  setCatPart("rightEye", [headX + height * 0.19, headY + height * 0.02, -height * 0.075], [height * 0.027, height * 0.037, height * 0.027]);
  setCatPart("leftEyeCatch", [headX + height * 0.212, headY + height * 0.035, height * 0.087], [height * 0.008, height * 0.008, height * 0.008]);
  setCatPart("rightEyeCatch", [headX + height * 0.212, headY + height * 0.035, -height * 0.063], [height * 0.008, height * 0.008, height * 0.008]);

  placeLeg("frontLeft", length * 0.19, legY, depth * 0.17, height);
  placeLeg("frontRight", length * 0.19, legY, -depth * 0.17, height);
  placeLeg("backLeft", -length * 0.18, legY, depth * 0.16, height);
  placeLeg("backRight", -length * 0.18, legY, -depth * 0.16, height);

  tail.scale.set(height * 0.068, length * 0.35, height * 0.068);
  tail.rotation.set(0, 0, Math.PI * 0.64);
  tail.position.set(-length * 0.31, height * 0.14, -depth * 0.02);

  const whiskers = three.catGroup.getObjectByName("whiskers");
  whiskers.position.set(headX + height * 0.21, headY - height * 0.045, 0);
  whiskers.scale.set(height * 0.11, height * 0.11, height * 0.11);

  three.catGroup.position.y = Math.max(state.cat.height / 2, three.catGroup.position.y);
}

function setCatPart(name, position, scale) {
  const part = three.catGroup.getObjectByName(name);
  if (!part) return;
  part.position.set(position[0], position[1], position[2]);
  part.scale.set(scale[0], scale[1], scale[2]);
}

function placeEar(name, x, y, z, height, tilt) {
  const ear = three.catGroup.getObjectByName(name);
  if (!ear) return;
  ear.position.set(x, y, z);
  ear.scale.set(height * 0.075, height * 0.17, height * 0.075);
  ear.rotation.set(0, tilt, 0);
}

function placeLeg(name, x, y, z, height) {
  const pivot = three.catGroup.getObjectByName(`${name}LegPivot`);
  if (!pivot) return;
  // Hip pivot at the top of the leg; leg + paw hang below it in local space.
  pivot.position.set(x, y + height * 0.1, z);
  if (!three.catJump) pivot.rotation.set(0, 0, 0);
  setCatPart(`${name}Leg`, [0, -height * 0.1, 0], [height * 0.04, height * 0.2, height * 0.04]);
  setCatPart(`${name}Paw`, [height * 0.015, -height * 0.205, 0], [height * 0.052, height * 0.034, height * 0.058]);
}

function animateThreeCat(path) {
  if (!three.ready || !path.length) return;
  const H = state.cat.height;
  const perches = path.map((piece) => new THREE.Vector3(
    piece.face === "right" && state.wall.corner ? state.wall.width - 12 : piece.x + piece.width / 2,
    piece.y + piece.height + H * 0.34,
    piece.face === "right" && state.wall.corner ? piece.x + piece.width / 2 : Math.max(12, piece.depth + 8)
  ));
  // Start crouched on the floor just in front of the first perch, then leap up.
  const first = perches[0];
  const floor = new THREE.Vector3(first.x, H / 2, first.z + Math.max(8, H * 0.6));
  const seq = [floor, ...perches];

  const arcs = [];
  let clock = 0;
  for (let i = 0; i < seq.length - 1; i += 1) {
    const p0 = seq[i];
    const p1 = seq[i + 1];
    const span = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    const rise = Math.max(0, p1.y - p0.y);
    // Arc clearance above the straight line — bigger jumps arc higher.
    const peak = clamp(H * 0.55 + rise * 0.55 + span * 0.16, H * 0.5, state.wall.height * 0.5);
    const flight = clamp(0.42 + span / 95 + rise / 130, 0.46, 1.05);
    const settle = i === seq.length - 2 ? 0.5 : 0.18;
    arcs.push({ p0, p1, peak, flight, settle, start: clock });
    clock += flight + settle;
  }

  three.catJump = { arcs, total: clock, startTime: performance.now(), landing: seq[seq.length - 1] };
}

function driveCatJump(now) {
  const jump = three.catJump;
  const t = (now - jump.startTime) / 1000;
  if (t >= jump.total) {
    three.catGroup.position.copy(jump.landing);
    resetCatPose();
    three.catJump = null;
    return;
  }
  let arc = jump.arcs[0];
  for (const candidate of jump.arcs) {
    if (t >= candidate.start) arc = candidate;
    else break;
  }
  const local = t - arc.start;
  if (local <= arc.flight) {
    poseCatArc(arc, clamp(local / arc.flight, 0, 1));
  } else {
    three.catGroup.position.copy(arc.p1);
    poseCatLanding(clamp((local - arc.flight) / arc.settle, 0, 1));
  }
}

function poseCatArc(arc, u) {
  const { p0, p1, peak } = arc;
  // Parabolic path that passes through both perches.
  const y = THREE.MathUtils.lerp(p0.y, p1.y, u) + 4 * peak * u * (1 - u);
  three.catGroup.position.set(
    THREE.MathUtils.lerp(p0.x, p1.x, u),
    y,
    THREE.MathUtils.lerp(p0.z, p1.z, u)
  );

  // Orient the body along its velocity (nose leads, pitches up then down).
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const vy = (p1.y - p0.y) + 4 * peak * (1 - 2 * u); // d(y)/du
  const vh = Math.max(0.001, Math.hypot(dx, dz));
  orientCat(dx, dz, vy, vh);

  // Squash & stretch: stretched at launch/landing, rounder at the apex.
  const bell = Math.sin(Math.PI * u); // 0 -> 1 -> 0
  const stretch = 1 + 0.12 * (1 - bell);
  three.catGroup.scale.set(stretch, 2 - stretch, 1 / stretch + (1 - 1 / stretch) * bell);

  poseCatLegs(bell, u);
  poseCatTail(bell);
}

function poseCatLanding(k) {
  // Absorb the impact: a quick squash that springs back.
  orientCat(1, 0, 0, 1); // face forward, level
  const squash = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k) * 0.28;
  three.catGroup.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
  const crouch = (1 - k) * 0.5;
  setLegSwing("frontLeftLegPivot", crouch);
  setLegSwing("frontRightLegPivot", crouch);
  setLegSwing("backLeftLegPivot", -crouch);
  setLegSwing("backRightLegPivot", -crouch);
  poseCatTail(0.2);
}

function orientCat(dx, dz, vy, vh) {
  const yaw = Math.atan2(-dz, dx);
  const pitch = clamp(Math.atan2(vy, vh), -1.05, 1.05);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(qYaw);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(localZ, pitch);
  three.catGroup.quaternion.copy(qPitch.multiply(qYaw));
}

function poseCatLegs(bell, u) {
  // Front legs reach forward at take-off, tuck up mid-air, extend to land.
  const front = -1.15 * bell + 0.55 * (1 - u);
  const back = 1.2 * bell - 0.65 * u;
  setLegSwing("frontLeftLegPivot", front);
  setLegSwing("frontRightLegPivot", front);
  setLegSwing("backLeftLegPivot", back);
  setLegSwing("backRightLegPivot", back);
}

function setLegSwing(name, angle) {
  const pivot = three.catGroup.getObjectByName(name);
  if (pivot) pivot.rotation.z = angle;
}

function poseCatTail(lift) {
  const tail = three.catGroup.getObjectByName("tail");
  if (tail) tail.rotation.z = Math.PI * 0.64 - lift * 0.6;
}

function resetCatPose() {
  three.catGroup.rotation.set(0, 0, 0);
  three.catGroup.scale.set(1, 1, 1);
  ["frontLeftLegPivot", "frontRightLegPivot", "backLeftLegPivot", "backRightLegPivot"].forEach((name) => setLegSwing(name, 0));
  poseCatTail(0);
}

function idleCat(now) {
  three.catGroup.rotation.set(0, Math.sin(now * 0.0011) * 0.05, 0);
  const breathe = 1 + Math.sin(now * 0.0032) * 0.012;
  three.catGroup.scale.set(1, breathe, 1);
  const tail = three.catGroup.getObjectByName("tail");
  if (tail) tail.rotation.z = Math.PI * 0.64 + Math.sin(now * 0.0026) * 0.08;
}

function animate() {
  three.animationFrame = requestAnimationFrame(animate);
  if (!three.ready) return;
  const now = performance.now();
  if (three.catJump) {
    driveCatJump(now);
  } else if (state.mode === "3d") {
    idleCat(now);
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
