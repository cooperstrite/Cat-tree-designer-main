// Client-style design brief summary, route measurements, and shopping guidance.
import { els, state } from "./state.js";
import {
  escapeAttribute,
  escapeHtml,
  formatFeet,
  formatInches,
  money,
  normalizeColor
} from "./utils.js";

const styleProfiles = {
  natural: {
    label: "Natural wood",
    color: "#b98652",
    advice: "Keep the wall finish soft and let wood, sisal, and cream cushions carry the palette."
  },
  minimal: {
    label: "Warm minimal",
    color: "#d8ded7",
    advice: "Use fewer larger resting pieces, low-contrast hardware, and a quiet painted wall."
  },
  modern: {
    label: "Modern contrast",
    color: "#316b8f",
    advice: "Pair clean shelf edges with a deeper wall tone, acrylic bowls, and visible geometry."
  },
  playful: {
    label: "Playful color",
    color: "#b9553f",
    advice: "Mix steps, tunnels, and perches with one stronger wall or cushion color."
  }
};

const goalProfiles = {
  enrichment: {
    label: "Enrichment route",
    color: "#0f766e",
    empty: "Start with a staggered climb, a rest perch, and one texture change.",
    advice: ({ typeCount }) => typeCount >= 3
      ? `Good variety: ${typeCount} piece styles are in the route.`
      : "Add a second texture or shape, such as a scratcher, bridge, bowl, or hideout."
  },
  smallSpace: {
    label: "Small-space climb",
    color: "#596f3d",
    empty: "Stack the route vertically and keep the lower wall open.",
    advice: ({ runWidth }) => `The route uses about ${formatFeet(Math.round(runWidth))} of wall width; keep storage or seating below the first landing.`
  },
  multiCat: {
    label: "Multi-cat flow",
    color: "#316b8f",
    empty: "Plan two rest zones and avoid one-way bottlenecks.",
    advice: ({ restZones }) => restZones >= 2
      ? `${restZones} rest zones give multiple cats places to pause.`
      : "Add at least two wider resting shelves so one cat is not blocking the whole route."
  },
  floorSpace: {
    label: "Floor-space saver",
    color: "#7a4f2f",
    empty: "Use wall-mounted rest zones instead of a floor tree footprint.",
    advice: ({ topLine, firstLanding }) => `The usable route starts around ${formatInches(Math.round(firstLanding))} and tops out near ${formatInches(Math.round(topLine))}.`
  }
};

function renderDesignPlan() {
  if (!els.planList) return;
  const plan = buildDesignPlan();
  els.planStatus.textContent = plan.status;
  els.moodBoard.innerHTML = plan.mood.map(renderMoodChip).join("");
  els.planList.innerHTML = "";

  plan.items.forEach((message) => {
    const item = document.createElement("div");
    item.className = `plan-item ${message.kind}`;
    item.innerHTML = `<strong>${escapeHtml(message.title)}</strong>${escapeHtml(message.body)}`;
    els.planList.appendChild(item);
  });
}

function buildDesignPlan() {
  const style = styleProfiles[state.design?.style] || styleProfiles.natural;
  const goal = goalProfiles[state.design?.goal] || goalProfiles.enrichment;
  const budget = Math.max(0, Number(state.design?.budget || 0));
  const totals = estimateTotals();
  const materials = summarizeMaterials();
  const mood = [
    { label: style.label, color: style.color },
    { label: `${formatMaterial(state.wall.material)} wall`, color: normalizeColor(state.wall.color, "#f0eadc") },
    { label: goal.label, color: goal.color },
    { label: materials[0] || "wood + sisal", color: "#b98652" }
  ];
  if (budget) mood.push({ label: `${money.format(budget)} target`, color: "#0f766e" });

  if (!state.placed.length) {
    return {
      status: "brief",
      mood,
      items: [
        {
          kind: "warning",
          title: "Plan",
          body: goal.empty
        },
        {
          kind: "good",
          title: "Palette",
          body: style.advice
        }
      ]
    };
  }

  const metrics = getLayoutMetrics();
  const budgetDelta = budget ? Math.round((budget - totals.total) * 100) / 100 : 0;
  const shoppingSources = new Set(state.placed.map((piece) => piece.sourceUrl || piece.url || piece.source).filter(Boolean));
  const sourceProducts = new Set(state.placed.map((piece) => piece.productId || piece.id));
  const jumpLimitX = Math.max(24, state.cat.length * 1.55);
  const jumpLimitY = Math.max(22, state.cat.height * 3.2);
  const budgetBody = budget
    ? `${money.format(totals.total)} estimated, ${budgetDelta >= 0 ? `${money.format(budgetDelta)} under` : `${money.format(Math.abs(budgetDelta))} over`} the target before tax or shipping.`
    : `${money.format(totals.total)} estimated before tax or shipping.`;

  return {
    status: `${state.placed.length} pieces`,
    mood,
    items: [
      {
        kind: metrics.maxJumpX <= jumpLimitX && metrics.maxJumpY <= jumpLimitY ? "good" : "warning",
        title: "Route",
        body: `${state.placed.length} movable pieces span ${formatFeet(Math.round(metrics.runWidth))} by ${formatFeet(Math.round(metrics.runHeight))}; largest nearby transition is about ${formatInches(Math.round(metrics.maxJumpX))} across and ${formatInches(Math.round(metrics.maxJumpY))} up.`
      },
      {
        kind: "good",
        title: "Measurements",
        body: `First landing sits near ${formatInches(Math.round(metrics.firstLanding))}; highest piece reaches about ${formatInches(Math.round(metrics.topLine))}. Leave at least 8" above the top perch for posture and mounting.`
      },
      {
        kind: budget && totals.total > budget ? "warning" : "good",
        title: "Budget",
        body: budgetBody
      },
      {
        kind: "good",
        title: "Shopping",
        body: `${sourceProducts.size} source products, ${state.placed.length} installable parts, and ${shoppingSources.size} saved source link${shoppingSources.size === 1 ? "" : "s"}.`
      },
      {
        kind: "good",
        title: goal.label,
        body: goal.advice(metrics)
      },
      {
        kind: "good",
        title: "Palette",
        body: style.advice
      }
    ]
  };
}

function estimateTotals() {
  const subtotal = state.placed.reduce((sum, piece) => sum + Number(piece.price || 0), 0);
  const hardware = state.placed.length ? Math.max(18, Math.round(subtotal * 0.08)) : 0;
  return { subtotal, hardware, total: subtotal + hardware };
}

function getLayoutMetrics() {
  const extents = state.placed.reduce((box, piece) => ({
    minX: Math.min(box.minX, piece.x),
    minY: Math.min(box.minY, piece.y),
    maxX: Math.max(box.maxX, piece.x + piece.width),
    maxY: Math.max(box.maxY, piece.y + piece.height)
  }), {
    minX: Infinity,
    minY: Infinity,
    maxX: 0,
    maxY: 0
  });
  const route = [...state.placed].sort((a, b) => a.y - b.y || a.x - b.x);
  const floorReach = Math.max(22, state.cat.height * 3.2);
  let maxJumpX = 0;
  let maxJumpY = 0;
  route.forEach((current, index) => {
    const currentCenterX = current.x + current.width / 2;
    const currentCenterY = current.y + current.height / 2;
    if (currentCenterY <= floorReach) {
      maxJumpY = Math.max(maxJumpY, Math.max(0, current.y));
      return;
    }
    const lowerPieces = route.slice(0, index).filter((piece) => piece.y + piece.height / 2 <= currentCenterY + 4);
    if (!lowerPieces.length) {
      maxJumpX = Math.max(maxJumpX, 0);
      maxJumpY = Math.max(maxJumpY, Math.max(0, current.y));
      return;
    }
    const nearest = lowerPieces.reduce((best, piece) => {
      const pieceCenterX = piece.x + piece.width / 2;
      const pieceCenterY = piece.y + piece.height / 2;
      const dx = Math.abs(currentCenterX - pieceCenterX);
      const dy = Math.max(0, currentCenterY - pieceCenterY);
      const score = dx + dy * 1.15;
      return !best || score < best.score ? { dx, dy, score } : best;
    }, null);
    maxJumpX = Math.max(maxJumpX, nearest.dx);
    maxJumpY = Math.max(maxJumpY, nearest.dy);
  });
  const restZones = state.placed.filter((piece) => (
    ["shelf", "hideout", "hammock", "corner"].includes(piece.type)
    && piece.width >= 14
    && piece.depth >= 9
  )).length;
  const typeCount = new Set(state.placed.map((piece) => piece.type)).size;
  return {
    runWidth: Math.max(0, extents.maxX - extents.minX),
    runHeight: Math.max(0, extents.maxY - extents.minY),
    firstLanding: Math.max(0, extents.minY),
    topLine: Math.max(0, extents.maxY),
    maxJumpX,
    maxJumpY,
    restZones,
    typeCount
  };
}

function summarizeMaterials() {
  const found = new Set();
  state.placed.forEach((piece) => {
    const material = String(piece.material || "").toLowerCase();
    if (material.includes("wood") || material.includes("ply") || material.includes("poplar")) found.add("wood");
    if (material.includes("sisal")) found.add("sisal");
    if (material.includes("carpet") || material.includes("cushion") || material.includes("chenille")) found.add("soft pads");
    if (material.includes("acrylic")) found.add("acrylic");
  });
  return [...found].slice(0, 3);
}

function renderMoodChip(item) {
  return `
    <span class="mood-chip">
      <span class="mood-swatch" style="background:${escapeAttribute(item.color)}"></span>
      ${escapeHtml(item.label)}
    </span>
  `;
}

function formatMaterial(value) {
  return String(value || "paint").replace(/-/g, " ");
}

export { renderDesignPlan, buildDesignPlan };
