import { initUI, getImageDataFromFile, renderOriginal, renderSVGPreview, showTracingIndicator, showStatus, allowNewImage } from './ui.js';
import { initControls, getTracingOptions } from './controls.js';
import { traceImage } from './tracer.js';
import { initDownload, setDownloadFilename, setButtonsEnabled } from './download.js';
import { initTheme } from './theme.js';

let currentImageData = null;
let currentSVGString = null;
let traceId = 0;

async function handleFileLoad(file) {
  setDownloadFilename(file.name);
  showStatus('Loading image...');
  setButtonsEnabled(false);

  try {
    currentImageData = await getImageDataFromFile(file);
    renderOriginal(currentImageData);
    allowNewImage();
    await runTrace();
  } catch (err) {
    showStatus(`Error: ${err.message}`);
    console.error(err);
  }
}

async function runTrace() {
  if (!currentImageData) return;

  const id = ++traceId;
  showTracingIndicator();
  showStatus('Tracing...');
  setButtonsEnabled(false);

  try {
    const options = getTracingOptions();
    const svg = await traceImage(currentImageData, options);

    if (id !== traceId) return;

    currentSVGString = svg;
    renderSVGPreview(currentSVGString);
    setButtonsEnabled(true);
    showStatus('Done');
  } catch (err) {
    if (id !== traceId) return;
    showStatus(`Tracing error: ${err.message}`);
    console.error(err);
  }
}

function init() {
  initTheme();
  initUI(handleFileLoad);
  initControls(runTrace);
  initDownload(() => currentSVGString);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
