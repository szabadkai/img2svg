import { getPresetOptions } from './tracer.js';

/* ───────────────────────────────────────
   Mode definitions
   ─────────────────────────────────────── */

const MODES = {
  bw: {
    fixed: { numberofcolors: 2, colorsampling: 0 },
    controls: [
      { key: 'colorquantcycles', type: 'range', label: 'Threshold', min: 1, max: 20, step: 1 },
      { key: 'removebackground', type: 'checkbox', label: 'Remove background' },
    ],
    presetChips: [
      { label: 'Default', preset: 'default' },
      { label: 'Sharp', preset: 'sharp' },
      { label: 'Curvy', preset: 'curvy' },
    ],
  },
  color: {
    fixed: {},
    controls: [
      { key: 'numberofcolors', type: 'range', label: 'Colors', min: 2, max: 64, step: 1 },
      { key: 'colorquantcycles', type: 'range', label: 'Quant cycles', min: 1, max: 20, step: 1 },
      { key: 'removebackground', type: 'checkbox', label: 'Remove background' },
    ],
    presetChips: [
      { label: 'Poster', preset: 'posterized2' },
      { label: 'Detailed', preset: 'detailed' },
      { label: 'Smooth', preset: 'smoothed' },
      { label: 'Artistic', preset: 'artistic1' },
      { label: 'Grayscale', preset: 'grayscale' },
    ],
  },
};

const ADVANCED_CONTROLS = [
  { key: 'ltres', type: 'range', label: 'Smooth corners', min: 0.01, max: 10, step: 0.1 },
  { key: 'qtres', type: 'range', label: 'Curve tolerance', min: 0.01, max: 10, step: 0.1 },
  { key: 'pathomit', type: 'range', label: 'Suppress small paths', min: 0, max: 100, step: 1 },
  { key: 'blurradius', type: 'range', label: 'Blur', min: 0, max: 5, step: 1 },
  { key: 'blurdelta', type: 'range', label: 'Blur delta', min: 1, max: 256, step: 1 },
  { key: 'rightangleenhance', type: 'checkbox', label: 'Enhance right angles' },
  { key: 'strokewidth', type: 'range', label: 'Stroke width', min: 0, max: 10, step: 0.5 },
  { key: 'scale', type: 'range', label: 'Scale', min: 1, max: 10, step: 0.5 },
  { key: 'roundcoords', type: 'range', label: 'Round coords', min: 0, max: 5, step: 1 },
  { key: 'linefilter', type: 'checkbox', label: 'Line filter' },
  {
    key: 'layering',
    type: 'select',
    label: 'Layering',
    options: [
      { value: '0', label: 'Sequential' },
      { value: '1', label: 'Parallel' },
    ],
  },
  {
    key: 'colorsampling',
    type: 'select',
    label: 'Color sampling',
    options: [
      { value: '0', label: 'Generated palette' },
      { value: '1', label: 'Random' },
      { value: '2', label: 'Deterministic' },
    ],
  },
  { key: 'mincolorratio', type: 'range', label: 'Min color ratio', min: 0, max: 0.5, step: 0.01 },
];

/* ───────────────────────────────────────
   State
   ─────────────────────────────────────── */

let controlElements = {};
let currentValues = {};
let activeTab = 'bw';
let activeChip = null;
let livePreview = true;
let onChange = null;
let debounceTimer = null;
let hasPendingChange = false;

/* ───────────────────────────────────────
   Init
   ─────────────────────────────────────── */

export function initControls(changeCallback) {
  onChange = changeCallback;
  controlElements = {};

  const defaults = getPresetOptions('default');
  currentValues = {
    ...defaults,
    removebackground: true,
    // Curvier defaults: reject straight-line fits aggressively, accept curves easily
    ltres: 0.01,
    qtres: 2,
    rightangleenhance: false,
  };

  // Tabs
  const tabs = document.querySelectorAll('.tab-bar .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Live toggle
  const liveToggle = document.getElementById('live-toggle');
  const traceBtn = document.getElementById('trace-btn');
  liveToggle.addEventListener('change', () => {
    livePreview = liveToggle.checked;
    traceBtn.hidden = livePreview;
    if (livePreview && hasPendingChange) {
      hasPendingChange = false;
      triggerChange();
    }
  });

  // Trace button (for manual mode)
  traceBtn.addEventListener('click', () => {
    hasPendingChange = false;
    triggerChange();
  });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    const defaults = getPresetOptions('default');
    currentValues = {
      ...defaults,
      removebackground: true,
      ltres: 0.01,
      qtres: 2,
      rightangleenhance: false,
    };
    applyModeFixed();
    renderTabContent();
    renderAdvancedControls();
    activeChip = null;
    updateChipStates();
    fireChange();
  });

  // Render initial state
  switchTab('bw');
  renderAdvancedControls();
}

/* ───────────────────────────────────────
   Tab switching
   ─────────────────────────────────────── */

function switchTab(tabId) {
  activeTab = tabId;
  activeChip = null;

  // Update tab buttons
  document.querySelectorAll('.tab-bar .tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });

  // Restore color defaults when switching to Color
  if (tabId === 'color') {
    if (currentValues.numberofcolors <= 2) {
      currentValues.numberofcolors = 16;
    }
    currentValues.colorsampling = 2;
  }

  // Apply mode-fixed overrides
  applyModeFixed();

  // Re-render tab content
  renderTabContent();

  fireChange();
}

function applyModeFixed() {
  const mode = MODES[activeTab];
  for (const [key, val] of Object.entries(mode.fixed)) {
    currentValues[key] = val;
  }
}

/* ───────────────────────────────────────
   Render tab content
   ─────────────────────────────────────── */

function renderTabContent() {
  const container = document.getElementById('tab-content');
  container.innerHTML = '';

  const mode = MODES[activeTab];

  // Mode-specific controls
  for (const ctrl of mode.controls) {
    const row = buildControlRow(ctrl);
    container.appendChild(row);
  }

  // Preset chips
  if (mode.presetChips && mode.presetChips.length > 0) {
    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'preset-chips';
    for (const chip of mode.presetChips) {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.textContent = chip.label;
      btn.dataset.preset = chip.preset;
      if (activeChip === chip.preset) btn.classList.add('active');
      btn.addEventListener('click', () => applyPresetChip(chip.preset));
      chipsWrap.appendChild(btn);
    }
    container.appendChild(chipsWrap);
  }
}

/* ───────────────────────────────────────
   Advanced controls
   ─────────────────────────────────────── */

function renderAdvancedControls() {
  const container = document.getElementById('advanced-controls');
  container.innerHTML = '';
  for (const ctrl of ADVANCED_CONTROLS) {
    const row = buildControlRow(ctrl);
    container.appendChild(row);
  }
}

/* ───────────────────────────────────────
   Preset chips
   ─────────────────────────────────────── */

function applyPresetChip(presetName) {
  const presetValues = getPresetOptions(presetName);
  // Merge preset values but keep mode-fixed overrides
  currentValues = { ...currentValues, ...presetValues };
  applyModeFixed();

  activeChip = presetName;
  updateChipStates();

  // Sync sliders/controls
  syncAllControls();

  fireChange();
}

function updateChipStates() {
  document.querySelectorAll('.preset-chips .chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === activeChip);
  });
}

function syncAllControls() {
  for (const [key, ctrl] of Object.entries(controlElements)) {
    const val = currentValues[key];
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

/* ───────────────────────────────────────
   Build a control row
   ─────────────────────────────────────── */

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

    const input = document.createElement('input');
    input.type = 'range';
    input.min = ctrl.min;
    input.max = ctrl.max;
    input.step = ctrl.step;

    const val = currentValues[ctrl.key] ?? ctrl.min;
    input.value = val;
    valueSpan.textContent = formatValue(val, ctrl.step);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      currentValues[ctrl.key] = v;
      valueSpan.textContent = formatValue(v, ctrl.step);
      activeChip = null;
      updateChipStates();
      fireChange();
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(valueSpan);
    controlElements[ctrl.key] = { input, valueSpan, type: 'range', step: ctrl.step };
  } else if (ctrl.type === 'select') {
    const select = document.createElement('select');
    for (const opt of ctrl.options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }
    const val = currentValues[ctrl.key];
    if (val !== undefined) select.value = String(val);

    select.addEventListener('change', () => {
      currentValues[ctrl.key] = parseFloat(select.value);
      activeChip = null;
      updateChipStates();
      fireChange();
    });

    inputWrap.appendChild(select);
    controlElements[ctrl.key] = { input: select, type: 'select' };
  } else if (ctrl.type === 'checkbox') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!currentValues[ctrl.key];

    input.addEventListener('change', () => {
      currentValues[ctrl.key] = input.checked;
      activeChip = null;
      updateChipStates();
      fireChange();
    });

    inputWrap.appendChild(input);
    controlElements[ctrl.key] = { input, type: 'checkbox' };
  }

  row.appendChild(inputWrap);
  return row;
}

/* ───────────────────────────────────────
   Change handling
   ─────────────────────────────────────── */

function fireChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (livePreview) {
      triggerChange();
    } else {
      hasPendingChange = true;
    }
  }, 300);
}

function triggerChange() {
  if (onChange) onChange();
}

/* ───────────────────────────────────────
   Public API
   ─────────────────────────────────────── */

export function getTracingOptions() {
  const opts = { ...currentValues };
  // Remove non-tracer keys
  delete opts.preset;
  return opts;
}

function formatValue(val, step) {
  if (step >= 1) return String(Math.round(val));
  if (step >= 0.1) return val.toFixed(1);
  return val.toFixed(2);
}
