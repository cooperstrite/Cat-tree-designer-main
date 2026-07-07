# Cat Wall Designer

A static GitHub Pages-compatible prototype for designing and pricing a cat wall.

## What it does

- Search a catalog seeded with real cat wall products and source links.
- Paste a known product URL to add the matching catalog item, or paste an unknown Etsy/Amazon/shop URL and turn it into an editable local planning item.
- Place pieces on a scaled 2D wall, change the wall dimensions, add a right-side corner wall, and upload a room photo as the wall background.
- Preview the design as a textured Three.js 3D scene.
- Change the cat size and run a reach/load simulation.
- Estimate product cost plus a hardware buffer.
- Save locally in the browser and export/import JSON design files.

## GitHub Pages

No build step is required. Publish the repository root with GitHub Pages and open `index.html`.

For a pre-populated preview, open:

```text
index.html?demo=1&view=3d
```

The 3D view loads Three.js from jsDelivr:

```html
https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js
```

## Important limitation

GitHub Pages is static hosting. It cannot reliably scrape Etsy/Amazon pages, bypass marketplace CORS restrictions, or generate exact 3D models from arbitrary product URLs by itself. This prototype handles that honestly by letting a pasted URL become an editable placeholder with price, dimensions, rating, and product type.

The catalog includes a snapshot of product data checked on July 7, 2026. Prices, ratings, review counts, availability, and load ratings can change, so treat them as planning data until you connect a live product feed.

Current seed products are sourced from Chewy product pages for Frisco, Armarkat, PawHut, TRIXIE, and The Refined Feline cat wall furniture.

To make the URL import fully automatic later, add a small backend service that:

1. fetches product metadata through allowed marketplace APIs or merchant-provided feeds,
2. stores normalized dimensions, ratings, prices, and source links,
3. generates or retrieves 3D assets for known products,
4. returns safe static JSON for the GitHub Pages frontend to consume.
