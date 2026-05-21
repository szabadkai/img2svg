import { getPresetNames, getPresetOptions } from './tracer.js';

const CONTROL_GROUPS = [
  {
    title: 'Preset',
    controls: [
      {
        key: 'preset',
        type: 'select',
        label: 'Preset',
        options: [],
      },
    ],
  },
  {
    title: 'Color Quantization',
    controls: [
      { key: 'numberofcolors', type: 'range', label: 'Colors', min: 2, max: 128, step: 1 },
      {
        key: 'colorsampling',
        type: 'select',
        label: 'Sampling',
        options: [
          { value: '0', label: 'Generated palette' },
          { value: '1', label: 'Random' },
          { value: '2', label: 'Deterministic' },
        ],
      },
      { key: 'colorquantcycles', type: 'range', label: 'Quant cycles', min: 1, max: 20, step: 1 },
      { key: 'mincolorratio', type: 'range', label: 'Min color ratio', min: 0, max: 0.5, step: 0.01 },
    ],
  },
  {
    title: 'Tracing',
    controls: [
      { key: 'ltres', type: 'range', label: 'Line threshold', min: 0.01, max: 10, step: 0.1 },
      { key: 'qtres', type: 'range', label: 'Curve threshold', min: 0.01, max: 10, step: 0.1 },
      { key: 'pathomit', type: 'range', label: 'Path omit', min: 0, max: 100, step: 1 },
      { key: 'rightangleenhance', type: 'checkbox', label: 'Right angle enhance' },
    ],
  },
  {
    title: 'Blur',
    controls: [
      { key: 'blurradius', type: 'range', label: 'Blur radius', min: 0, max: 5, step: 1 },
      { key: 'blurdelta', type: 'range', label: 'Blur delta', min: 1, max: 256, step: 1 },
    ],
  },
  {
    title: 'SVG Rendering',
    controls: [
      { key: 'strokewidth', type: 'range', label: 'Stroke width', min: 0, max: 10, step: 0.5 },
      { key: 'linefilter', type: 'checkbox', label: 'Line filter' },
      { key: 'scale', type: 'range', label: 'Scale', min: 1, max: 10, step: 0.5 },
      { key: 'roundcoords', type: 'range', label: 'Round coords', min: 0, max: 5, step: 1 },
      {
        key: 'layering',
        type: 'select',
        label: 'Layering',
        options: [
          { value: '0', label: 'Sequential' },
          { value: '1', label: 'Parallel' },
        ],
      },
    ],
  },
];

let controlElements = {};
let currentValues = {};
let onChange = null;

export function initControls(changeCallback) {
  onChange = changeCallback;
  const grid = document.getElementById('controls-grid');
  grid.innerHTML = '';
  controlElements = {};

  const presetNames = getPresetNames();
  CONTROL_GROUPS[0].controls[0].options = presetNames.map(name => ({
    value: name,
    label: name,
  }));

  const defaults = getPresetOptions('default');
  currentValues = { ...defaults, preset: 'default' };

  for (const group of CONTROL_GROUPS) {
    const groupEl = document.createElement('div');
    groupEl.className = 'control-group';

    const titleEl = document.createElement('div');
    titleEl.className = 'control-group-title';
    titleEl.textContent = group.title;
    groupEl.appendChild(titleEl);

    for (const ctrl of group.controls) {
      const row = buildControlRow(ctrl);
      groupEl.appendChild(row);
    }

    grid.appendChild(groupEl);
  }

  applyValuesToDOM(currentValues);

  document.getElementById('reset-btn').addEventListener('click', () => {
    const defaults = getPresetOptions('default');
    currentValues = { ...defaults, preset: 'default' };
    applyValuesToDOM(currentValues);
    fireChange();
  });
}

function buildControlRow(ctrl) {
  const row = document.createElement('div');
  row.className = 'control-row';

  const label = document.createElement('label');
  label.className = 'control-label';
  label.textContent = ctrl.label;
  row.appendChild(label);

  const inputWrap = document.createElement('div');
  inputWrap.className = 'control-input';

  if (ctrl.type === 'range') {
    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.dataset.key = ctrl.key;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = ctrl.min;
    input.max = ctrl.max;
    input.step = ctrl.step;
    input.dataset.key = ctrl.key;

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      currentValues[ctrl.key] = val;
      valueSpan.textContent = formatValue(val, ctrl.step);
      fireChange();
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(valueSpan);
    controlElements[ctrl.key] = { input, valueSpan, type: 'range', step: ctrl.step };
  } else if (ctrl.type === 'select') {
    const select = document.createElement('select');
    select.dataset.key = ctrl.key;

    for (const opt of ctrl.options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      if (ctrl.key === 'preset') {
        applyPreset(select.value);
      } else {
        currentValues[ctrl.key] = parseFloat(select.value);
      }
      fireChange();
    });

    inputWrap.appendChild(select);
    controlElements[ctrl.key] = { input: select, type: 'select' };
  } else if (ctrl.type === 'checkbox') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.key = ctrl.key;

    input.addEventListener('change', () => {
      currentValues[ctrl.key] = input.checked;
      fireChange();
    });

    inputWrap.appendChild(input);
    controlElements[ctrl.key] = { input, type: 'checkbox' };
  }

  row.appendChild(inputWrap);
  return row;
}

function applyPreset(presetName) {
  const presetValues = getPresetOptions(presetName);
  currentValues = { ...presetValues, preset: presetName };
  applyValuesToDOM(currentValues);
}

function applyValuesToDOM(values) {
  for (const [key, ctrl] of Object.entries(controlElements)) {
    if (key === 'preset') {
      ctrl.input.value = values.preset || 'default';
      continue;
    }
    const val = values[key];
    if (val === undefined) continue;

    if (ctrl.type === 'range') {
      ctrl.input.value = val;
      ctrl.valueSpan.textContent = formatValue(val, ctrl.step);
    } else if (ctrl.type === 'select') {
      ctrl.input.value = String(val);
    } else if (ctrl.type === 'checkbox') {
      ctrl.input.checked = !!val;
    }
  }
}

function formatValue(val, step) {
  if (step >= 1) return String(Math.round(val));
  if (step >= 0.1) return val.toFixed(1);
  return val.toFixed(2);
}

let debounceTimer = null;

function fireChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (onChange) onChange();
  }, 300);
}

export function getTracingOptions() {
  const opts = { ...currentValues };
  delete opts.preset;
  return opts;
}
