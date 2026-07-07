// Shared singletons: DOM handle cache, app state, drag + three.js scene refs.
import { seedCatalog } from "./seed-catalog.js";

const STORAGE_KEY = "cat-wall-designer-state-v1";

const els = {};

const state = {
  catalog: [...seedCatalog],
  placed: [],
  selectedId: null,
  mode: "2d",
  step: "home",
  filter: "all",
  search: "",
  simulateNonce: 0,
  wall: {
    width: 144,
    height: 96,
    depth: 48,
    color: "#f0eadc",
    material: "paint",
    corner: false,
    cornerDepth: 72,
    photoDataUrl: ""
  },
  cat: {
    length: 22,
    height: 11,
    weight: 12
  },
  design: {
    style: "natural",
    goal: "enrichment",
    budget: 350
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
  raycaster: null,
  pointer: null,
  wallTextureCache: new Map(),
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
  },
  drag: {
    active: false,
    model: null,
    piece: null,
    plane: null,
    offset: null,
    pointerId: null,
    moved: false,
    startX: 0,
    startY: 0
  }
};

export { STORAGE_KEY, els, state, dragState, three };
