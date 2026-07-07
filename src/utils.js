// Pure helpers (formatting, color, math, escaping) plus the toast.
import { els } from "./state.js";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return clamp(parsed, min, max);
}

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function shadeColor(color, amount) {
  const normalized = normalizeColor(color, "#f0eadc").slice(1);
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(normalized.slice(index, index + 2), 16);
    return clamp(value + amount, 0, 255).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
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

export {
  money,
  clamp,
  clampNumber,
  normalizeColor,
  shadeColor,
  formatFeet,
  formatInches,
  compactName,
  titleCase,
  slugify,
  safeUrlHost,
  escapeHtml,
  escapeAttribute,
  showToast
};
