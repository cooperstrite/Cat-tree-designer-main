// Catalog panel rendering and URL-based product import.
import {
  analyzeImage,
  baseTypeForArchetype,
  classifyArchetype
} from "./image-model.js";
import { saveState } from "./persistence.js";
import { updateAll } from "./render.js";
import { els, state } from "./state.js";
import {
  clamp,
  clampNumber,
  escapeAttribute,
  escapeHtml,
  formatInches,
  money,
  safeUrlHost,
  showToast,
  slugify,
  titleCase
} from "./utils.js";

// The photo the next import will be generated from (data URL or remote URL),
// plus whether the user hand-picked the Type (so auto-detect won't override it).
let importImageSrc = "";
let importTypeTouched = false;
let importPackageCount = 1;
let lookupRun = 0;

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
      ${renderCatalogThumb(product)}
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
          ${product.packageParts ? `<span>${product.packageParts.length} movable parts</span>` : ""}
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

function renderCatalogThumb(product) {
  const type = escapeAttribute(product.type);
  const model = escapeAttribute(product.model || product.type);
  const badge = product.generated ? `<span class="thumb-badge">3D from photo</span>` : "";
  if (!product.imageUrl) {
    return `<div class="mini-model" data-type="${type}" data-model="${model}" aria-hidden="true">${badge}</div>`;
  }
  return `
    <div class="mini-model has-photo" data-type="${type}" data-model="${model}" aria-hidden="true">
      <img class="mini-photo" src="${escapeAttribute(product.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      ${badge}
    </div>
  `;
}

function addPiece(productId) {
  const product = state.catalog.find((item) => item.id === productId);
  if (!product) return;
  const pieces = createPlacedPieces(product);
  state.placed.push(...pieces);
  state.selectedId = pieces[0]?.id || null;
  updateAll();
  showToast(product.packageParts ? `${product.name} added as ${pieces.length} movable pieces` : `${product.name} added to the wall`);
}

function createPlacedPieces(product) {
  const parts = Array.isArray(product.packageParts) && product.packageParts.length ? product.packageParts : [null];
  const batchId = `${product.id}-${Date.now()}`;
  const baseX = clamp(24 + state.placed.length * 6, 0, Math.max(0, state.wall.width - product.width));
  const baseY = clamp(18 + state.placed.length * 5, 0, Math.max(0, state.wall.height - product.height));
  return parts.map((part, index) => {
    const source = part || product;
    const piece = {
      ...product,
      ...source,
      id: parts.length > 1 ? `${batchId}-part-${index + 1}` : batchId,
      productId: product.id,
      packageId: parts.length > 1 ? batchId : "",
      packageName: parts.length > 1 ? product.name : "",
      packagePartIndex: parts.length > 1 ? index + 1 : 0,
      price: parts.length > 1 ? splitPackagePrice(product.price, parts.length, index) : product.price,
      rating: product.rating,
      reviews: product.reviews,
      source: product.source,
      sourceChecked: product.sourceChecked,
      sourceUrl: product.url,
      url: product.url,
      imageUrl: source.imageUrl || product.imageUrl,
      maxLoad: source.maxLoad ?? product.maxLoad,
      material: source.material || product.material,
      x: clamp(baseX + Number(source.offsetX || 0), 0, Math.max(0, state.wall.width - source.width)),
      y: clamp(baseY + Number(source.offsetY || 0), 0, Math.max(0, state.wall.height - source.height)),
      face: source.type === "corner" && state.wall.corner ? "right" : "front",
      rotation: 0
    };
    delete piece.packageParts;
    delete piece.offsetX;
    delete piece.offsetY;
    return piece;
  });
}

function splitPackagePrice(total, count, index) {
  const cents = Math.round(Number(total || 0) * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return (base + (index < remainder ? 1 : 0)) / 100;
}

function hydrateImportFromUrl() {
  const url = els.importUrl.value.trim();
  if (!url) {
    setLookupStatus("Paste a product page to fill details.");
    return;
  }
  const known = findCatalogProductByUrl(url);
  if (known) {
    applyKnownProductToImport(known);
    setLookupStatus("Known catalog item matched. Add it for exact packaged pieces.", "good");
    return;
  }
  setLookupStatus("Ready to look up this product page.");
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

async function lookupProductUrl() {
  const url = els.importUrl.value.trim();
  if (!url) {
    showToast("Paste a product URL first");
    setLookupStatus("Paste a product page to fill details.", "warn");
    return;
  }

  const known = findCatalogProductByUrl(url);
  if (known) {
    applyKnownProductToImport(known);
    setLookupStatus("Known catalog item matched. Add it for exact packaged pieces.", "good");
    showToast(`${known.name} matched from the known product library`);
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    setLookupStatus("That does not look like a product URL yet.", "warn");
    showToast("Use a full product URL");
    return;
  }

  const run = ++lookupRun;
  const button = els.lookupUrl;
  button.disabled = true;
  setLookupStatus("Looking up product page...", "working");

  try {
    const html = await fetchProductPage(parsedUrl.href);
    if (run !== lookupRun) return;
    const result = parseProductLookup(html, parsedUrl.href);
    if (!hasUsefulLookup(result)) {
      throw new Error("No product metadata found");
    }
    applyLookupResult(result);
    showToast(Number.isFinite(result.price) ? "Product price and model details found" : "Product details found; check the price");
  } catch (error) {
    if (run !== lookupRun) return;
    hydrateImportFromUrl();
    setLookupStatus("This shop blocked browser lookup. Add a photo or enter price and dimensions manually.", "warn");
    showToast("URL lookup was blocked by the product site");
  } finally {
    if (run === lookupRun) button.disabled = false;
  }
}

async function fetchProductPage(url) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https product pages are supported");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(parsed.href, {
      credentials: "omit",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Lookup failed with ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (type && !/(text|html|json|javascript|xml)/i.test(type)) {
      throw new Error("URL did not return a readable product page");
    }
    const text = await response.text();
    if (!text.trim()) throw new Error("Empty product page");
    return text.slice(0, 700000);
  } finally {
    window.clearTimeout(timeout);
  }
}

function parseProductLookup(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = normalizeText(doc.body?.textContent || html);
  const jsonProducts = collectJsonLdProducts(doc);
  const product = jsonProducts.find((item) => item.name || item.offers || item.image) || {};
  const offer = getOffer(product.offers);
  const aggregateRating = product.aggregateRating || {};
  const metaTitle = getMetaContent(doc, ["og:title", "twitter:title", "title"]);
  const metaDescription = getMetaContent(doc, ["description", "og:description", "twitter:description"]);
  const metaImage = getMetaContent(doc, ["og:image", "twitter:image", "image"]);
  const name = cleanProductName(firstString(product.name, metaTitle, doc.title), baseUrl);
  const description = firstString(product.description, metaDescription);
  const sourceText = normalizeText([name, description, offer?.description, text.slice(0, 50000)].filter(Boolean).join(" "));
  const dimensions = extractDimensions(sourceText);
  const imageUrl = absoluteProductUrl(firstString(product.image, metaImage), baseUrl);
  const price = normalizePrice(firstString(offer?.price, offer?.lowPrice, product.price, getMetaContent(doc, [
    "product:price:amount",
    "og:price:amount",
    "price",
    "twitter:data1"
  ])) || sourceText);
  const rating = normalizeRating(firstString(
    aggregateRating.ratingValue,
    aggregateRating.value,
    product.ratingValue,
    getMetaContent(doc, ["rating", "aggregateRating"])
  ));

  return {
    name,
    type: inferProductType(sourceText),
    price,
    rating,
    imageUrl,
    dimensions,
    packageCount: inferPackagePartCount(sourceText),
    sourceHost: safeUrlHost(baseUrl)
  };
}

function applyLookupResult(result) {
  if (result.name) els.importName.value = result.name;
  if (result.type && !importTypeTouched) {
    els.importType.value = result.type;
    importTypeTouched = true;
  }
  if (Number.isFinite(result.price)) els.importPrice.value = roundField(result.price);
  if (Number.isFinite(result.rating)) els.importRating.value = roundField(result.rating);
  if (result.dimensions.width) els.importWidth.value = roundField(result.dimensions.width);
  if (result.dimensions.depth) els.importDepth.value = roundField(result.dimensions.depth);
  if (result.dimensions.height) els.importHeight.value = roundField(result.dimensions.height);
  if (result.imageUrl) setImportImageSource(result.imageUrl);
  importPackageCount = result.packageCount || 1;

  const found = [
    Number.isFinite(result.price) ? "price" : "",
    result.imageUrl ? "product photo" : "",
    result.dimensions.width || result.dimensions.depth || result.dimensions.height ? "dimensions" : "",
    importPackageCount > 1 ? `${importPackageCount} movable pieces` : ""
  ].filter(Boolean);
  const details = found.length ? `Found ${found.join(", ")}.` : "Found editable product details.";
  setLookupStatus(`${details} Check values before adding.`, Number.isFinite(result.price) ? "good" : "warn");
}

function applyKnownProductToImport(product) {
  els.importName.value = product.name;
  els.importType.value = product.type;
  importTypeTouched = true;
  els.importPrice.value = product.price;
  els.importRating.value = product.rating;
  els.importWidth.value = product.width;
  els.importDepth.value = product.depth;
  els.importHeight.value = product.height;
  importPackageCount = Array.isArray(product.packageParts) ? product.packageParts.length : 1;
  if (product.imageUrl) setImportImageSource(product.imageUrl);
}

function hasUsefulLookup(result) {
  return Boolean(
    result.name ||
    result.imageUrl ||
    Number.isFinite(result.price) ||
    result.dimensions.width ||
    result.dimensions.depth ||
    result.dimensions.height
  );
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
  const image = importImageSrc.trim();
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
    generated: true,
    imageUrl: image,
    maxLoad: Math.max(18, Math.round(state.cat.weight * 2.5)),
    material: image ? "generated from photo" : "imported placeholder",
    source: sourceHost || "manual import",
    url: sourceHost ? url : fallbackUrl
  };
  const packageCount = Math.max(importPackageCount, inferPackagePartCount(`${name} ${url}`));
  if (packageCount > 1) product.packageParts = createImportedPackageParts(product, packageCount);
  state.catalog.unshift(product);
  addPiece(product.id);
  renderCatalog();
  saveState(false);
  resetImportImage();
  importPackageCount = 1;
  showToast(image
    ? "3D model generated from the photo and added to the wall"
    : "Imported piece added as an editable 3D model");
}

function createImportedPackageParts(product, count) {
  const safeCount = clamp(Math.round(Number(count) || 1), 1, 10);
  const xGap = Math.min(Math.max(product.width + 4, 10), 24);
  const yGap = Math.max(product.height + 5, 10);
  return Array.from({ length: safeCount }, (_, index) => ({
    name: `${product.name} Piece ${index + 1}`,
    shortName: `Piece ${index + 1}`,
    type: product.type,
    model: product.model,
    width: product.width,
    depth: product.depth,
    height: product.height,
    material: product.material,
    maxLoad: product.maxLoad,
    offsetX: (index % 4) * xGap,
    offsetY: Math.floor(index / 4) * yGap + (index % 4) * 4
  }));
}

function collectJsonLdProducts(doc) {
  const nodes = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      flattenJsonLd(JSON.parse(script.textContent), nodes);
    } catch {
      // Some product pages include malformed JSON-LD. Ignore that block.
    }
  });
  const productNodes = nodes.filter((node) => hasJsonType(node, "Product"));
  return productNodes.length ? productNodes : nodes.filter((node) => node.name && (node.offers || node.image));
}

function flattenJsonLd(value, nodes) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenJsonLd(item, nodes));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value["@graph"]) flattenJsonLd(value["@graph"], nodes);
  nodes.push(value);
}

function hasJsonType(node, typeName) {
  const type = node?.["@type"];
  if (Array.isArray(type)) return type.some((item) => String(item).toLowerCase() === typeName.toLowerCase());
  return String(type || "").toLowerCase() === typeName.toLowerCase();
}

function getOffer(offers) {
  if (Array.isArray(offers)) return offers.find(Boolean) || {};
  if (offers && typeof offers === "object") return offers;
  return {};
}

function getMetaContent(doc, names) {
  for (const name of names) {
    const meta = doc.querySelector(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
    const value = meta?.getAttribute("content");
    if (value) return value.trim();
  }
  return "";
}

function firstString(...values) {
  for (const value of values) {
    const normalized = stringifyLookupValue(value);
    if (normalized) return normalized;
  }
  return "";
}

function stringifyLookupValue(value) {
  if (Array.isArray(value)) return firstString(...value);
  if (value && typeof value === "object") {
    return firstString(value.url, value.contentUrl, value.href, value.name, value.price, value.ratingValue);
  }
  if (value === null || value === undefined) return "";
  return normalizeText(String(value));
}

function cleanProductName(value, baseUrl) {
  let name = normalizeText(value);
  if (!name) return "";
  const host = safeUrlHost(baseUrl).replace(/\.(com|net|org|co|shop)$/i, "");
  const separators = [" | ", " - ", " : "];
  for (const separator of separators) {
    const parts = name.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1 && parts[0].length >= 8 && !parts[0].toLowerCase().includes(host)) {
      name = parts[0];
      break;
    }
  }
  return name.slice(0, 110);
}

function absoluteProductUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const text = String(value).replace(/,/g, " ");
  const moneyMatch = text.match(/(?:\$|USD\s*)(\d+(?:\s*\d{3})*(?:\.\d{1,2})?)/i);
  const plainMatch = text.match(/\bprice\b[^\d$]{0,30}\$?\s*(\d+(?:\.\d{1,2})?)/i);
  const raw = moneyMatch?.[1] || plainMatch?.[1] || (/^\d+(?:\.\d{1,2})?$/.test(text.trim()) ? text.trim() : "");
  const parsed = Number(raw.replace(/\s+/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return clamp(value, 0, 5);
  const text = String(value);
  const match = text.match(/(\d(?:\.\d+)?)\s*(?:out of\s*)?5|rating[^\d]{0,20}(\d(?:\.\d+)?)/i);
  const parsed = Number(match?.[1] || match?.[2] || text);
  return Number.isFinite(parsed) ? clamp(parsed, 0, 5) : NaN;
}

function extractDimensions(text) {
  const normalized = normalizeText(text).replace(/×/g, "x");
  const dimensions = {};
  const labeled = /\b(width|wide|w|depth|deep|d|height|high|h)\b\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")/gi;
  const reversed = /(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?|")\s*(width|wide|w|depth|deep|d|height|high|h)\b/gi;
  let match;
  while ((match = labeled.exec(normalized))) assignDimension(dimensions, match[1], match[2]);
  while ((match = reversed.exec(normalized))) assignDimension(dimensions, match[2], match[1]);

  if (!dimensions.width || !dimensions.depth || !dimensions.height) {
    const triple = normalized.match(/(\d+(?:\.\d+)?)\s*(?:"|in(?:ches?)?\.?)?\s*(?:w(?:idth|ide)?\s*)?x\s*(\d+(?:\.\d+)?)\s*(?:"|in(?:ches?)?\.?)?\s*(?:d(?:epth|eep)?\s*)?x\s*(\d+(?:\.\d+)?)\s*(?:"|in(?:ches?)?\.?)?/i);
    if (triple) {
      dimensions.width ||= Number(triple[1]);
      dimensions.depth ||= Number(triple[2]);
      dimensions.height ||= Number(triple[3]);
    }
  }

  return {
    width: clampDimension(dimensions.width, 1, 120),
    depth: clampDimension(dimensions.depth, 1, 80),
    height: clampDimension(dimensions.height, 1, 80)
  };
}

function assignDimension(dimensions, label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  const key = normalizeDimensionLabel(label);
  if (key && !dimensions[key]) dimensions[key] = parsed;
}

function normalizeDimensionLabel(label) {
  const normalized = String(label || "").toLowerCase();
  if (["width", "wide", "w"].includes(normalized)) return "width";
  if (["depth", "deep", "d"].includes(normalized)) return "depth";
  if (["height", "high", "h"].includes(normalized)) return "height";
  return "";
}

function clampDimension(value, min, max) {
  return Number.isFinite(value) ? clamp(value, min, max) : 0;
}

function inferProductType(text) {
  const value = normalizeText(text).toLowerCase();
  if (/\b(corner|90 degree|right angle)\b/.test(value)) return "corner";
  if (/\b(bridge|ladder|walkway|rope bridge|span|runway)\b/.test(value)) return "bridge";
  if (/\b(scratcher|scratching|sisal|post)\b/.test(value)) return "scratcher";
  if (/\b(hideout|cubby|condo|house|box|enclosure|cave)\b/.test(value)) return "hideout";
  if (/\b(hammock|sling|fabric perch)\b/.test(value)) return "hammock";
  return "shelf";
}

function inferPackagePartCount(text) {
  const value = normalizeText(text).toLowerCase();
  const patterns = [
    /\b(?:set|pack|package|bundle)\s+of\s+([2-9]|10)\b/,
    /\b([2-9]|10)\s*[- ]?(?:piece|pieces|pc|pcs|pack|count|shelves|shelf|steps|step|perches|perch)\b/
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return clamp(Number(match[1]), 1, 10);
  }
  return 1;
}

function roundField(value) {
  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setLookupStatus(message, tone = "") {
  if (!els.lookupStatus) return;
  els.lookupStatus.textContent = message;
  els.lookupStatus.dataset.tone = tone;
}

// --- photo -> model import controls ---

function markImportTypeTouched() {
  importTypeTouched = true;
}

function setImportImageSource(src) {
  importImageSrc = String(src || "").trim();
  if (els.importImageUrl && els.importImageUrl.value !== importImageSrc) {
    els.importImageUrl.value = importImageSrc;
  }
  refreshImportImage();
}

function setImportImageFromUrl() {
  setImportImageSource(els.importImageUrl.value);
}

function setImportImageFromFile() {
  const file = els.importImageFile.files?.[0];
  if (!file) return;
  downscaleToDataUrl(file, 640).then((dataUrl) => {
    importImageSrc = dataUrl;
    els.importImageUrl.value = "";
    refreshImportImage();
  });
}

function resetImportImage() {
  importImageSrc = "";
  importTypeTouched = false;
  if (els.importImageUrl) els.importImageUrl.value = "";
  if (els.importImageFile) els.importImageFile.value = "";
  refreshImportImage();
}

function refreshImportImage() {
  const src = importImageSrc;
  if (els.importImagePreview) {
    els.importImagePreview.style.backgroundImage = src ? `url("${src.replace(/"/g, "%22")}")` : "";
    els.importImagePreview.classList.toggle("has-photo", Boolean(src));
  }
  if (!els.importDetect) return;
  if (!src) {
    els.importDetect.innerHTML = "Add a photo and Catify builds a 3D model from it — colors, shape, and a photo-mapped front.";
    return;
  }
  els.importDetect.textContent = "Reading the photo…";
  analyzeImage(src).then((analysis) => {
    if (importImageSrc !== src) return; // a newer photo won the race
    const archetype = classifyArchetype(analysis, els.importType.value);
    if (!importTypeTouched) els.importType.value = baseTypeForArchetype(archetype);
    els.importDetect.innerHTML = describeDetection(analysis, archetype);
  });
}

function describeDetection(analysis, archetype) {
  const swatches = (analysis && analysis.palette && analysis.palette.length ? analysis.palette : [])
    .slice(0, 5)
    .map((c) => `<span class="detect-swatch" style="background:#${c.toString(16).padStart(6, "0")}"></span>`)
    .join("");
  const readable = analysis && analysis.readable;
  const note = readable
    ? `Detected <strong>${escapeHtml(archetype)}</strong>`
    : `Photo linked (host blocks color analysis) — modeled as <strong>${escapeHtml(archetype)}</strong>`;
  return `${note} ${swatches}`;
}

// Shrink an uploaded image so the data URL stays small enough for localStorage.
function downscaleToDataUrl(file, maxDim) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          resolve(String(reader.result));
        }
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
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

export {
  renderCatalog,
  renderCatalogThumb,
  addPiece,
  createPlacedPieces,
  splitPackagePrice,
  hydrateImportFromUrl,
  lookupProductUrl,
  importProduct,
  openMarketplaceSearch,
  findCatalogProductByUrl,
  setImportImageFromUrl,
  setImportImageFromFile,
  markImportTypeTouched
};
