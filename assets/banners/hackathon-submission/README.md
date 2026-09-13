# Clearing Bell submission images

## Upload

- Logo: `clearing-bell-logo-512x512.png` (512 × 512).
- Cover: `clearing-bell-cover-1920x1080.png` (1920 × 1080, 16:9).
- Alternatives: 1024 × 1024 logo master and 640 × 360 lightweight cover.

All final exports are PNGs. Dimensions were checked with `sips`, and the logo and cover were visually inspected at submission size. These are brand illustrations, not product screenshots or evidence of deployment.

## Art direction and sources

The minimalist square logo preserves the existing native SVG mark in `frontend/src/components/Brand.tsx`, with mint strokes on carbon. The cover combines sculptural 3D illustration with an editorial composition and restrained product copy. Colors follow the existing site. IBM Plex Sans is bundled with its license in `fonts/`.

The sculpture was generated with the built-in image-generation tool, not the CLI. Typography and the logo were composed separately for exact spelling and sharp rendering. `cover.html` is the editable HTML/CSS composition; `logo.svg` is the vector logo source. `export.html` renders matching resolution-independent canvas compositions directly to PNG to avoid browser screenshot zoom artifacts.

To reproduce the PNG exports, run `node assets/banners/hackathon-submission/export-server.mjs` from the repository, open `http://127.0.0.1:8767/export.html`, and click **Save PNG files**. The local-only exporter writes just the four named PNG outputs in this directory. Stop the server when finished.

## Generation prompt

Create a pristine high-end architectural 3D brand illustration for Clearing Bell, an institutional tokenized bond batch-auction product. Wide landscape 16:9 artwork, highest available resolution. NO TEXT, NO LETTERS, NO LOGOS, NO WATERMARKS, NO UI. Art directed dark studio photograph of one beautifully engineered modular cube, assembled from precise porcelain-white rectangular ceramic tiles and thin layered slabs with deep black narrow reveals, with only a few restrained satin mint/teal inserts (#48c8ad). The cube is seen in elegant elevated three-quarter perspective, solid and ordered rather than chaotic, suggesting many individual pieces meeting in one coherent whole. A small number of slabs are slightly separated at the right upper edge to give subtle motion and dimensionality, not a debris cloud. Main sculpture occupies the RIGHT HALF of the composition: from roughly x=53% to92%, y=18% to82%. Left 48% is beautifully uninterrupted near-black carbon (#0b0d11) negative space for later typography. Background and floor near-black matte seamless studio, subtle contact shadow underneath floating sculpture, barely visible graphite architectural base shadow, very restrained pale mint light falling from upper right. Premium precise chamfered edges, believable ceramic material, studio softbox lighting, exquisite ambient occlusion and light/shadow contrast. White faces remain bright and legible against dark background, not overexposed. Design sophistication of a Swiss design studio's financial infrastructure identity. No neon, no purple, no gradients across the background, no circuitry, no cryptocurrency coins, no bell object, no holograms, no charts, no random glass orbits. Calm, dimensional, expensive, exceptionally clean.
