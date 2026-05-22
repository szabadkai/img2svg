const MAX_DIMENSION = 1500;

export function initUI(onFileLoad) {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileLoad(file);
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      onFileLoad(file);
      fileInput.value = '';
    }
  });
}

export function getImageDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { width, height, downscaled } = computeDimensions(img.width, img.height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      URL.revokeObjectURL(url);

      if (downscaled) {
        showSizeWarning(img.width, img.height);
      } else {
        hideSizeWarning();
      }

      resolve(imageData);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function computeDimensions(origW, origH) {
  if (origW <= MAX_DIMENSION && origH <= MAX_DIMENSION) {
    return { width: origW, height: origH, downscaled: false };
  }
  const ratio = Math.min(MAX_DIMENSION / origW, MAX_DIMENSION / origH);
  return {
    width: Math.round(origW * ratio),
    height: Math.round(origH * ratio),
    downscaled: true,
  };
}

function showSizeWarning(origW, origH) {
  const el = document.getElementById('size-warning');
  const sizeSpan = document.getElementById('original-size');
  sizeSpan.textContent = `${origW} × ${origH}`;
  el.hidden = false;
}

function hideSizeWarning() {
  document.getElementById('size-warning').hidden = true;
}

export function renderOriginal(imageData) {
  const container = document.getElementById('original-preview');
  const dropZone = document.getElementById('drop-zone');

  dropZone.hidden = true;
  container.hidden = false;

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);

  const img = new Image();
  img.src = canvas.toDataURL();
  container.appendChild(img);
}

export function renderSVGPreview(svgString) {
  const container = document.getElementById('svg-preview');
  container.innerHTML = svgString;
  const svg = container.querySelector('svg');
  if (!svg) return;

  const w = svg.getAttribute('width');
  const h = svg.getAttribute('height');
  if (w && h && !svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.maxWidth = '100%';
  svg.style.maxHeight = '100%';
}

export function showTracingIndicator() {
  const container = document.getElementById('svg-preview');
  container.innerHTML = `
    <div class="tracing-indicator">
      <div class="spinner"></div>
      <span>Tracing...</span>
    </div>
  `;
}

export function showStatus(message) {
  document.getElementById('status-text').textContent = message;
}

export function allowNewImage() {
  const container = document.getElementById('original-preview');
  container.style.cursor = 'pointer';
  container.title = 'Click to upload a new image';
  container.addEventListener('click', () => {
    const input = document.getElementById('file-input');
    input.click();
  });
}
