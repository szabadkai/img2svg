import ImageTracer from 'imagetracerjs';

export async function traceImage(imageData, options = {}) {
  await new Promise(resolve => setTimeout(resolve, 0));

  const mergedOptions = {
    viewbox: true,
    desc: false,
    ...options,
  };

  return ImageTracer.imagedataToSVG(imageData, mergedOptions);
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
