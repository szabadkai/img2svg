import ImageTracer from 'imagetracerjs';

export async function traceImage(imageData, options = {}) {
  await new Promise(resolve => setTimeout(resolve, 0));

  const removeBackground = options.removebackground;

  const mergedOptions = {
    viewbox: true,
    desc: false,
    ...options,
  };
  delete mergedOptions.removebackground;

  if (removeBackground) {
    return traceWithoutBackground(imageData, mergedOptions);
  }

  return ImageTracer.imagedataToSVG(imageData, mergedOptions);
}

/**
 * Trace the image, detect the background color layer, and exclude it
 * from the SVG output entirely. This removes the filled background plane
 * and all anti-aliased edge paths of that color.
 *
 * Strategy: get tracedata (palette + layers), sample the corner pixels of
 * the source image to determine the background color, find the palette entry
 * closest to that color, remove its layer, then generate SVG from the rest.
 */
function traceWithoutBackground(imageData, options) {
  const td = ImageTracer.imagedataToTracedata(imageData, options);

  // Sample corner pixels to determine the background color
  const bgColor = detectBackgroundColor(imageData);

  // Find all palette indices close to the background color.
  // This catches both the exact background and anti-aliased edge colors
  // that blend between the background and foreground.
  const skipLayers = findBackgroundLayers(td.palette, bgColor);

  if (skipLayers.size === 0) {
    return ImageTracer.getsvgstring(td, options);
  }

  return buildSVGWithoutLayers(td, options, skipLayers);
}

/**
 * Sample the four corner pixels and pick the most common color.
 * Falls back to top-left if all corners differ.
 */
function detectBackgroundColor(imageData) {
  const { data, width, height } = imageData;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const colors = corners.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  });

  // Find most common corner color (by exact match)
  for (let a = 0; a < colors.length; a++) {
    let count = 1;
    for (let b = a + 1; b < colors.length; b++) {
      if (colorsMatch(colors[a], colors[b])) count++;
    }
    if (count >= 2) return colors[a];
  }

  // Default to top-left corner
  return colors[0];
}

function colorsMatch(a, b) {
  return Math.abs(a.r - b.r) < 10 &&
         Math.abs(a.g - b.g) < 10 &&
         Math.abs(a.b - b.b) < 10;
}

/**
 * Find all palette layers that should be considered "background".
 * Uses a brightness-weighted distance: colors that are both close to the
 * detected bg color AND lighter than the midpoint are likely background
 * or anti-aliased edges of the background.
 */
function findBackgroundLayers(palette, bgColor) {
  const skip = new Set();
  const bgBrightness = bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114;

  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const dist = (c.r - bgColor.r) ** 2 +
                 (c.g - bgColor.g) ** 2 +
                 (c.b - bgColor.b) ** 2;
    const brightness = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;

    // Exact/near match to bg (within ~30 per channel)
    if (dist < 2700) {
      skip.add(i);
      continue;
    }

    // For light backgrounds (white/near-white): also catch anti-aliased
    // edge colors that are lighter than the midpoint and reasonably close
    if (bgBrightness > 180 && brightness > 128 && dist < 16000) {
      skip.add(i);
    }
  }
  return skip;
}

/**
 * Re-implement getsvgstring but skip paths from background layers.
 * Delegates actual path rendering to ImageTracer.svgpathstring.
 */
function buildSVGWithoutLayers(td, options, skipLayers) {
  const w = td.width * (options.scale || 1);
  const h = td.height * (options.scale || 1);

  let svg = '<svg ' +
    (options.viewbox
      ? `viewBox="0 0 ${w} ${h}" `
      : `width="${w}" height="${h}" `) +
    'version="1.1" xmlns="http://www.w3.org/2000/svg">';

  for (let lcnt = 0; lcnt < td.layers.length; lcnt++) {
    if (skipLayers.has(lcnt)) continue;
    for (let pcnt = 0; pcnt < td.layers[lcnt].length; pcnt++) {
      if (!td.layers[lcnt][pcnt].isholepath) {
        svg += ImageTracer.svgpathstring(td, lcnt, pcnt, options);
      }
    }
  }

  svg += '</svg>';
  return svg;
}

export function getPresetNames() {
  return Object.keys(ImageTracer.optionpresets);
}

export function getPresetOptions(presetName) {
  const raw = ImageTracer.optionpresets[presetName];
  if (!raw) return {};
  const defaults = ImageTracer.optionpresets['default'];
  return { ...defaults, ...raw };
}
