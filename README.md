# img2svg

Browser-based raster image to SVG vector converter. Runs entirely client-side — no uploads, no server.

**[Try it live](https://szabadkai.github.io/img2svg/)**

## Features

- **Drag & drop** any PNG, JPG, GIF, or WebP image
- **Black & White** and **Color** tracing modes with preset chips (Poster, Detailed, Smooth, Artistic, Grayscale)
- **Background removal** — automatically detects and strips the background color layer and its anti-aliased edges from the SVG output
- **Curvy defaults** — paths use smooth quadratic splines instead of angular line segments out of the box
- **Live preview** toggle — retrace on every slider change, or switch to manual mode for heavy images
- **Advanced controls** — fine-tune smoothing, blur, path suppression, stroke width, scale, layering, and more
- **Download or copy** the SVG output with one click
- **Dark mode** with system-aware default
- **Privacy-first** — everything happens in your browser, nothing leaves your machine

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/img2svg/` and drop an image.

## Build & deploy

```bash
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
```

The repo includes a GitHub Actions workflow that deploys to GitHub Pages on every push to `main`.

## How it works

Uses [imagetracerjs](https://github.com/nicedoc/imagetracerjs) for raster-to-vector tracing. The app adds a background removal layer on top: it samples corner pixels to detect the background color, finds all palette layers within a color-distance threshold (catching anti-aliased edges too), and rebuilds the SVG without those layers.

## Tech stack

- [Vite](https://vite.dev) — build tooling
- [imagetracerjs](https://github.com/nicedoc/imagetracerjs) — image tracing engine
- Vanilla JS, no framework

## License

MIT
