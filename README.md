# Cat Wall Designer

A static GitHub Pages-compatible prototype for designing and pricing a cat wall.

## What it does

- Search a catalog seeded with real cat wall products and source links.
- Paste a known product URL to add the matching catalog item, or paste an unknown Etsy/Amazon/shop URL and turn it into an editable local planning item.
- Place pieces on a scaled 2D wall or drag them directly in the 3D view, change the wall dimensions, add a right-side corner wall, and upload a room photo as the wall background.
- Preview the design as a textured Three.js 3D scene with same-origin product cover textures applied to known catalog pieces.
- Add package products as separate movable components, such as individual steps, cubbies, bridge spans, shelves, and pads.
- Change wall color and material finishes for paint, plaster, brick, wood panel, and concrete composition studies.
- Change the cat size and run a reach/load simulation.
- Estimate product cost plus a hardware buffer.
- Save locally in the browser and export/import JSON design files.

## GitHub Pages

No build step is required. This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that packages `index.html`, `app.js`, `styles.css`, `README.md`, and `assets/` into a clean Pages artifact.

In GitHub, open the repository settings and set:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

After that, every push to `main` will deploy the site. You can also run the workflow manually from the Actions tab.

For a pre-populated preview, open:

```text
index.html?demo=1&view=3d
```

The 3D view loads Three.js from jsDelivr:

```html
https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js
```

## Important limitation

GitHub Pages is static hosting. It cannot reliably scrape Etsy/Amazon pages, bypass marketplace CORS restrictions, or generate exact 3D models from arbitrary product URLs by itself. This prototype handles that honestly by letting a pasted URL become an editable placeholder with price, dimensions, rating, and product type. Known catalog products use local cover-image assets in `assets/products/` mapped onto dimensioned procedural models, which is more accurate visually than generic blocks but is still not a manufacturer-provided mesh.

The catalog includes a snapshot of product data checked on July 7, 2026. Prices, ratings, review counts, availability, and load ratings can change, so treat them as planning data until you connect a live product feed.

Current seed products are sourced from Chewy product pages for Frisco, Armarkat, PawHut, TRIXIE, and The Refined Feline cat wall furniture.

To make the URL import fully automatic later, add a small backend service that:

1. fetches product metadata through allowed marketplace APIs or merchant-provided feeds,
2. stores normalized dimensions, ratings, prices, and source links,
3. generates or retrieves 3D assets for known products, ideally GLB/USDZ meshes with licensed product imagery,
4. returns safe static JSON for the GitHub Pages frontend to consume.
