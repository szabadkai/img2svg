let filename = 'traced.svg';

export function setDownloadFilename(inputName) {
  const base = inputName.replace(/\.[^.]+$/, '');
  filename = `${base}.svg`;
}

export function initDownload(getSVGString) {
  const downloadBtn = document.getElementById('download-btn');
  const copyBtn = document.getElementById('copy-btn');

  downloadBtn.addEventListener('click', () => {
    const svg = getSVGString();
    if (!svg) return;
    downloadBlob(svg, filename);
  });

  copyBtn.addEventListener('click', async () => {
    const svg = getSVGString();
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  });
}

function downloadBlob(svgString, name) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function setButtonsEnabled(enabled) {
  document.getElementById('download-btn').disabled = !enabled;
  document.getElementById('copy-btn').disabled = !enabled;
}
