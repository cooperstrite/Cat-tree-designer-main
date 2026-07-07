// Procedural per-product 3D mesh builders and shared detail helpers.
import * as THREE from "three";
import { three } from "./state.js";
import { buildGeneratedModel } from "./image-model.js";

function buildPieceModel(piece) {
  const group = new THREE.Group();

  // Imported items have no hand-authored builder — generate one from their
  // photo (archetype + palette + a photo-mapped front face).
  if (piece.generated) {
    buildGeneratedModel(group, piece);
    group.userData.pieceId = piece.id;
    return group;
  }

  const wood = new THREE.MeshStandardMaterial({ color: 0xb98652, roughness: 0.58, metalness: 0.02, map: three.textures.wood });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x7a4f2f, roughness: 0.64, metalness: 0.02, map: three.textures.wood });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x8f9b88, roughness: 0.96, map: three.textures.carpet });
  const sisal = new THREE.MeshStandardMaterial({ color: 0xc89e61, roughness: 0.95, map: three.textures.sisal });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x657c52, roughness: 0.86, map: three.textures.canvas });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.72 });
  const black = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x46514e, roughness: 0.36, metalness: 0.55 });
  const shadow = new THREE.MeshBasicMaterial({ color: 0x26332e, transparent: true, opacity: 0.14 });
  const acrylic = new THREE.MeshPhysicalMaterial({
    color: 0xbce9ef,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.55,
    transparent: true,
    opacity: 0.42
  });
  const materials = { wood, darkWood, carpet, sisal, canvas, white, black, metal, shadow, acrylic };
  const profile = piece.model || piece.type;

  if (profile === "frisco-cushion-shelf") {
    buildFriscoCushionedShelf(group, piece, materials);
  } else if (profile === "frisco-acrylic-bowl") {
    buildFriscoAcrylicBowl(group, piece, materials);
  } else if (profile === "frisco-silhouette-bridge") {
    buildFriscoSilhouetteBridge(group, piece, materials);
  } else if (profile === "frisco-silhouette-cubby") {
    buildFriscoSilhouetteCubby(group, piece, materials);
  } else if (profile === "frisco-silhouette-bridge-span") {
    buildFriscoSilhouetteBridgeSpan(group, piece, materials);
  } else if (profile === "frisco-four-steps") {
    buildFriscoFourSteps(group, piece, materials);
  } else if (profile === "frisco-single-step") {
    buildSingleStep(group, piece, materials);
  } else if (profile === "lotus-leaf") {
    buildLotusLeafShelf(group, piece, materials);
  } else if (profile === "armarkat-two-level") {
    buildArmarkatTwoLevel(group, piece, materials);
  } else if (profile === "armarkat-single-shelf") {
    buildArmarkatSingleShelf(group, piece, materials);
  } else if (profile === "pawhut-10-level") {
    buildPawhutTenLevel(group, piece, materials);
  } else if (profile === "pawhut-house") {
    buildPawhutHouse(group, piece, materials);
  } else if (profile === "pawhut-step") {
    buildPawhutStep(group, piece, materials);
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
  addEdgeBand(group, piece.width, piece.depth, shelfHeight, materials.darkWood);
  addCushionSeams(group, piece.width * 0.86, piece.depth * 0.74, cushion.position.y + Math.max(1.4, piece.height * 0.28) / 2 + 0.04, materials.darkWood);
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(piece.width, 2.2, 1.2), materials.darkWood);
  backRail.position.set(0, piece.height * 0.18, -piece.depth / 2 - 0.3);
  group.add(shelf, cushion, backRail);
  addBrackets(group, piece, materials.darkWood);
  addWallScrews(group, piece.width * 0.72, piece.height * 0.18, -piece.depth / 2 - 1.05, materials.metal);
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
  addSisalGrooves(group, leftMat, piece.width * 0.2, piece.depth * 0.68, materials.darkWood);
  addSisalGrooves(group, rightMat, piece.width * 0.2, piece.depth * 0.68, materials.darkWood);
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
  addEdgeBand(group, piece.width, piece.depth, shelfHeight, materials.darkWood, shelf.position.y);
  addBrackets(group, piece, materials.darkWood);
  addWallScrews(group, piece.width * 0.78, -piece.height * 0.05, -piece.depth / 2 - 1.05, materials.metal);
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
  addWoodFaceFrame(group, leftCubby.position.x, 0, piece.depth / 2 + 0.74, cubbyWidth, cubbyHeight, materials.darkWood);
  addWoodFaceFrame(group, rightCubby.position.x, 0, piece.depth / 2 + 0.74, cubbyWidth, cubbyHeight, materials.darkWood);
  addCatOpening(group, leftCubby.position.x, -1, piece.depth / 2 + 0.7, cubbyHeight * 0.22, materials.black);
  addCatOpening(group, rightCubby.position.x, -1, piece.depth / 2 + 0.7, cubbyHeight * 0.22, materials.black);
  addBridgeRibs(group, bridgeLength, piece.depth * 0.72, -piece.height * 0.16, materials.darkWood);
  addWallScrews(group, piece.width * 0.86, cubbyHeight * 0.18, -piece.depth / 2 - 0.85, materials.metal);
}

function buildFriscoSilhouetteCubby(group, piece, materials) {
  const cubby = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), materials.wood);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.72, 1.1, piece.depth * 0.68), materials.sisal);
  mat.position.y = piece.height / 2 + 0.2;
  group.add(cubby, mat);
  addWoodFaceFrame(group, 0, 0, piece.depth / 2 + 0.74, piece.width, piece.height, materials.darkWood);
  addWallScrews(group, piece.width * 0.62, piece.height * 0.18, -piece.depth / 2 - 0.85, materials.metal);
  addCatOpening(group, 0, 0, piece.depth / 2 + 0.7, Math.min(piece.width, piece.height) * 0.22, materials.black);
}

function buildFriscoSilhouetteBridgeSpan(group, piece, materials) {
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(piece.width, Math.max(1.8, piece.height * 0.38), piece.depth), materials.canvas);
  bridge.position.y = -piece.height * 0.16;
  const railA = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, piece.width, 16), materials.darkWood);
  railA.rotation.z = Math.PI / 2;
  railA.position.set(0, bridge.position.y + 1.5, -piece.depth * 0.42);
  const railB = railA.clone();
  railB.position.z = piece.depth * 0.42;
  group.add(railA, railB);
  group.add(bridge);
  addBridgeRibs(group, piece.width, piece.depth, bridge.position.y, materials.darkWood);
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
    addSisalGrooves(group, mat, stepWidth * 0.68, piece.depth * 0.64, materials.darkWood);
    group.add(step, mat);
  });
}

function buildSingleStep(group, piece, materials) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), materials.wood);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.78, 0.65, piece.depth * 0.72), materials.sisal);
  mat.position.y = piece.height / 2 + 0.4;
  addEdgeBand(group, piece.width, piece.depth, piece.height, materials.darkWood);
  addSisalGrooves(group, mat, piece.width * 0.68, piece.depth * 0.64, materials.darkWood);
  group.add(step, mat);
  addBrackets(group, piece, materials.darkWood);
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
  addCushionSeams(group, piece.width * 0.54, piece.depth * 0.5, pad.position.y + 0.66, materials.darkWood);
  group.add(leaf, pad);
  addBrackets(group, piece, materials.darkWood);
  addWallScrews(group, piece.width * 0.5, -piece.height * 0.1, -piece.depth / 2 - 0.8, materials.metal);
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
  addEdgeBand(group, piece.width, piece.depth, shelfHeight, materials.darkWood, lower.position.y);
  addEdgeBand(group, piece.width, piece.depth, shelfHeight, materials.darkWood, upper.position.y);
  addWallScrews(group, piece.width * 0.75, 0, -piece.depth / 2 - 0.85, materials.metal);
}

function buildArmarkatSingleShelf(group, piece, materials) {
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), materials.wood);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.76, 0.75, piece.depth * 0.68), materials.carpet);
  mat.position.y = piece.height / 2 + 0.42;
  addEdgeBand(group, piece.width, piece.depth, piece.height, materials.darkWood);
  addCushionSeams(group, piece.width * 0.66, piece.depth * 0.58, mat.position.y + 0.42, materials.darkWood);
  group.add(shelf, mat);
  addBrackets(group, piece, materials.darkWood);
}

function buildPawhutTenLevel(group, piece, materials) {
  const house = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.72, piece.height * 0.5, piece.depth * 0.86), materials.wood);
  house.position.set(piece.width * 0.08, -piece.height * 0.2, 0);
  group.add(house);
  addWoodFaceFrame(group, house.position.x, house.position.y, piece.depth * 0.44 + 0.74, piece.width * 0.72, piece.height * 0.5, materials.darkWood);
  addCatOpening(group, house.position.x, house.position.y, piece.depth * 0.44 + 0.7, piece.height * 0.13, materials.black);
  const stepWidth = piece.width * 0.35;
  for (let i = 0; i < 6; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, 1.6, piece.depth * 0.58), materials.wood);
    step.position.set((i % 2 ? 0.28 : -0.28) * piece.width, -piece.height * 0.42 + i * (piece.height * 0.16), 0);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(stepWidth * 0.82, 0.55, piece.depth * 0.48), materials.carpet);
    pad.position.set(step.position.x, step.position.y + 1.05, 0);
    addSisalGrooves(group, pad, stepWidth * 0.72, piece.depth * 0.42, materials.darkWood);
    group.add(step, pad);
  }
}

function buildPawhutHouse(group, piece, materials) {
  const house = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), materials.wood);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 1.08, 1.4, piece.depth * 1.02), materials.carpet);
  roof.position.y = piece.height / 2 + 0.75;
  group.add(house, roof);
  addWoodFaceFrame(group, 0, -piece.height * 0.04, piece.depth / 2 + 0.74, piece.width, piece.height, materials.darkWood);
  addCushionSeams(group, piece.width * 0.82, piece.depth * 0.78, roof.position.y + 0.72, materials.darkWood);
  addCatOpening(group, 0, -piece.height * 0.04, piece.depth / 2 + 0.72, Math.min(piece.width, piece.height) * 0.18, materials.black);
}

function buildPawhutStep(group, piece, materials) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), materials.wood);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(piece.width * 0.82, 0.55, piece.depth * 0.68), materials.carpet);
  pad.position.y = piece.height / 2 + 0.36;
  addEdgeBand(group, piece.width, piece.depth, piece.height, materials.darkWood);
  addSisalGrooves(group, pad, piece.width * 0.72, piece.depth * 0.58, materials.darkWood);
  group.add(step, pad);
  addBrackets(group, piece, materials.darkWood);
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
  addSisalWrapLines(group, post, postHeight, materials.darkWood);
  addEdgeBand(group, piece.width, piece.depth, 2.4, materials.darkWood, perch.position.y);
  addWallScrews(group, piece.width * 0.26, 0, -piece.depth / 2 - 1.1, materials.metal);
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
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.2, 1.2), material);
    brace.rotation.z = slot < 0 ? -0.55 : 0.55;
    brace.position.set(piece.width * slot, -1.4, -piece.depth / 2 + 1.2);
    group.add(bracket, brace);
  });
}

function addEdgeBand(group, width, depth, height, material, y = 0) {
  const front = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.7, 0.85), material);
  front.position.set(0, y + height / 2 + 0.1, depth / 2 + 0.12);
  const back = front.clone();
  back.position.z = -depth / 2 - 0.12;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, depth), material);
  left.position.set(-width / 2 - 0.12, y + height / 2 + 0.1, 0);
  const right = left.clone();
  right.position.x = width / 2 + 0.12;
  group.add(front, back, left, right);
}

function addWallScrews(group, width, y, z, material) {
  [-0.5, 0.5].forEach((slot) => {
    [-1, 1].forEach((row) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.22, 18), material);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(width * slot, y + row * 2.2, z);
      group.add(screw);
    });
  });
}

function addWoodFaceFrame(group, x, y, z, width, height, material) {
  const railThickness = 1;
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, railThickness, 0.8), material);
  top.position.set(x, y + height / 2 - railThickness / 2, z);
  const bottom = top.clone();
  bottom.position.y = y - height / 2 + railThickness / 2;
  const left = new THREE.Mesh(new THREE.BoxGeometry(railThickness, height, 0.8), material);
  left.position.set(x - width / 2 + railThickness / 2, y, z);
  const right = left.clone();
  right.position.x = x + width / 2 - railThickness / 2;
  group.add(top, bottom, left, right);
}

function addSisalGrooves(group, mat, width, depth, material) {
  const grooveCount = Math.max(3, Math.round(depth / 2.4));
  for (let i = 0; i < grooveCount; i += 1) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.08), material);
    groove.position.set(
      mat.position.x,
      mat.position.y + 0.38,
      mat.position.z - depth / 2 + (i + 0.5) * (depth / grooveCount)
    );
    group.add(groove);
  }
}

function addCushionSeams(group, width, depth, y, material) {
  const seamX = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.1), material);
  seamX.position.set(0, y, 0);
  const seamZ = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, depth), material);
  seamZ.position.set(0, y + 0.02, 0);
  const frontPiping = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, 0.18), material);
  frontPiping.position.set(0, y + 0.04, depth / 2);
  const backPiping = frontPiping.clone();
  backPiping.position.z = -depth / 2;
  group.add(seamX, seamZ, frontPiping, backPiping);
}

function addSisalWrapLines(group, post, height, material) {
  const radius = post.geometry.parameters.radiusTop || 1;
  for (let y = -height / 2 + 2; y < height / 2; y += 3.2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.04, 0.05, 8, 32), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(post.position.x, post.position.y + y, post.position.z);
    group.add(ring);
  }
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

export {
  buildPieceModel,
  buildFriscoCushionedShelf,
  buildFriscoAcrylicBowl,
  buildFriscoSilhouetteBridge,
  buildFriscoSilhouetteCubby,
  buildFriscoSilhouetteBridgeSpan,
  buildFriscoFourSteps,
  buildSingleStep,
  buildLotusLeafShelf,
  buildArmarkatTwoLevel,
  buildArmarkatSingleShelf,
  buildPawhutTenLevel,
  buildPawhutHouse,
  buildPawhutStep,
  buildTrixiePostPerch,
  addTeaserToy,
  addCatOpening,
  addBridgeRibs,
  addBrackets,
  addEdgeBand,
  addWallScrews,
  addWoodFaceFrame,
  addSisalGrooves,
  addCushionSeams,
  addSisalWrapLines,
  addSelectionRing,
  addWarningMarker,
  addReachGlow
};
