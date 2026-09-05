(function () {
  // ---------- Telegram WebApp theming ----------
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    const tp = tg.themeParams || {};
    const root = document.documentElement.style;
    if (tp.bg_color) root.setProperty('--tg-bg', tp.bg_color);
    if (tp.secondary_bg_color) root.setProperty('--tg-secondary-bg', tp.secondary_bg_color);
    if (tp.text_color) root.setProperty('--tg-text', tp.text_color);
    if (tp.hint_color) root.setProperty('--tg-hint', tp.hint_color);
    if (tp.button_color) root.setProperty('--tg-button', tp.button_color);
    if (tp.button_text_color) root.setProperty('--tg-button-text', tp.button_text_color);
  }

  // ---------- State ----------
  let originalAnimationData = null; // pristine copy, for "reset"
  let animationData = null;         // live, mutated copy
  let anim = null;                  // lottie-web instance
  let tree = [];
  let selectedNode = null;
  let logoSvgText = null;

  // ---------- DOM refs ----------
  const templateInput = document.getElementById('templateInput');
  const logoInput = document.getElementById('logoInput');
  const templateStatus = document.getElementById('templateStatus');
  const logoStatus = document.getElementById('logoStatus');
  const previewEl = document.getElementById('preview');
  const emptyHint = document.getElementById('emptyHint');
  const treeSection = document.getElementById('treeSection');
  const layerTreeEl = document.getElementById('layerTree');
  const controlsSection = document.getElementById('controlsSection');
  const selectedSlotLabel = document.getElementById('selectedSlotLabel');
  const fillColor = document.getElementById('fillColor');
  const strokeColor = document.getElementById('strokeColor');
  const strokeWidth = document.getElementById('strokeWidth');
  const strokeWidthOut = document.getElementById('strokeWidthOut');
  const applyBtn = document.getElementById('applyBtn');
  const exportSection = document.getElementById('exportSection');
  const exportBtn = document.getElementById('exportBtn');
  const resetBtn = document.getElementById('resetBtn');
  const globalColorSection = document.getElementById('globalColorSection');
  const globalFillColor = document.getElementById('globalFillColor');
  const globalStrokeColor = document.getElementById('globalStrokeColor');
  const globalStrokeWidth = document.getElementById('globalStrokeWidth');
  const globalStrokeWidthOut = document.getElementById('globalStrokeWidthOut');
  const globalApplyBtn = document.getElementById('globalApplyBtn');

  globalStrokeWidth.addEventListener('input', () => {
    globalStrokeWidthOut.textContent = globalStrokeWidth.value;
  });

  globalApplyBtn.addEventListener('click', () => {
    if (!animationData) return;
    window.LottieTools.recolorAll(
      animationData,
      globalFillColor.value,
      globalStrokeColor.value,
      Number(globalStrokeWidth.value)
    );
    renderPreview();
  });

  strokeWidth.addEventListener('input', () => {
    strokeWidthOut.textContent = strokeWidth.value;
  });

  // ---------- Template upload ----------
  async function handleTemplateFile(file) {
    if (!file) return;
    templateStatus.textContent = file.name;

    const buf = await file.arrayBuffer();
    let text;
    try {
      text = window.LottieTools.gunzipToText(buf);
    } catch (err) {
      alert('Не удалось прочитать файл (ни JSON, ни gzip-tgs): ' + err.message);
      return;
    }

    try {
      animationData = JSON.parse(text);
    } catch (err) {
      alert('Файл не похож на корректный Lottie JSON: ' + err.message);
      return;
    }

    originalAnimationData = JSON.parse(JSON.stringify(animationData));
    rebuildEverything();
  }

  templateInput.addEventListener('change', (e) => handleTemplateFile(e.target.files[0]));

  // ---------- Logo upload ----------
  async function handleLogoFile(file) {
    if (!file) return;
    logoSvgText = await file.text();

    let warn = '';
    try {
      const subpaths = window.LottieTools.extractSubpathsFromSvg(logoSvgText);
      const n = subpaths.length;
      if (n > 30) {
        warn = ` ⚠ ${n} контуров — .tgs почти наверняка превысит 64 КБ, упростите SVG`;
      } else {
        warn = ` (${n} контур${n === 1 ? '' : n < 5 ? 'а' : 'ов'})`;
      }
    } catch (err) {
      warn = ' (не удалось разобрать SVG)';
    }
    logoStatus.textContent = file.name + warn;

    updateApplyEnabled();
  }

  logoInput.addEventListener('change', (e) => handleLogoFile(e.target.files[0]));

  // ---------- Drag & drop ----------
  function setupDropZone(labelEl, onFile, extCheck) {
    ['dragenter', 'dragover'].forEach(evt => {
      labelEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        labelEl.classList.add('dragover');
      });
    });
    ['dragleave', 'dragend'].forEach(evt => {
      labelEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        labelEl.classList.remove('dragover');
      });
    });
    labelEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      labelEl.classList.remove('dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      if (extCheck && !extCheck(file.name)) {
        alert('Неподходящий тип файла для этой панели');
        return;
      }
      onFile(file);
    });
  }

  setupDropZone(
    document.getElementById('templateDropzone'),
    handleTemplateFile,
    (name) => /\.(json|tgs)$/i.test(name)
  );
  setupDropZone(
    document.getElementById('logoDropzone'),
    handleLogoFile,
    (name) => /\.svg$/i.test(name)
  );

  // ---------- Rendering ----------
  function rebuildEverything() {
    emptyHint.hidden = true;
    tree = window.LottieTools.buildLayerTree(animationData);
    renderTree();
    treeSection.hidden = false;
    controlsSection.hidden = false;
    globalColorSection.hidden = false;
    exportSection.hidden = false;
    selectedNode = null;
    selectedSlotLabel.textContent = 'Слот не выбран';
    updateApplyEnabled();
    renderPreview();
  }

  function renderPreview() {
    if (anim) { anim.destroy(); anim = null; }
    previewEl.innerHTML = '';
    anim = lottie.loadAnimation({
      container: previewEl,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });
  }

  function renderTree() {
    layerTreeEl.innerHTML = '';
    tree.forEach(node => layerTreeEl.appendChild(renderNode(node, 0)));
  }

  function renderNode(node, depth) {
    const row = document.createElement('div');
    row.className = 'tree-row';
    if (node.ref.hd) row.classList.add('hidden-node');
    if (node === selectedNode) row.classList.add('selected');
    row.style.paddingLeft = (12 + depth * 18) + 'px';

    const eye = document.createElement('button');
    eye.className = 'eye';
    eye.textContent = node.ref.hd ? '🚫' : '👁';
    eye.addEventListener('click', (ev) => {
      ev.stopPropagation();
      window.LottieTools.toggleHidden(node);
      renderTree();
      renderPreview();
    });

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = node.name;

    const tagText = { layer: 'слой', group: 'группа', null: 'null', precomp: 'композиция' }[node.kind] || node.kind;
    const tag = document.createElement('span');
    tag.className = 'row-tag';
    tag.textContent = tagText;

    row.appendChild(eye);
    row.appendChild(name);
    row.appendChild(tag);

    if (!node.shapesRef) {
      row.style.opacity = '0.6';
      row.style.cursor = 'default';
    } else {
      row.addEventListener('click', () => {
        selectedNode = node;
        selectedSlotLabel.textContent = `Слот: ${node.name} (${tagText})`;
        renderTree();
        updateApplyEnabled();
      });
    }

    const wrapper = document.createElement('div');
    wrapper.appendChild(row);
    node.children.forEach(child => wrapper.appendChild(renderNode(child, depth + 1)));
    return wrapper;
  }

  function updateApplyEnabled() {
    applyBtn.disabled = !(selectedNode && logoSvgText);
  }

  // ---------- Apply logo ----------
  applyBtn.addEventListener('click', () => {
    if (!selectedNode || !logoSvgText) return;
    window.LottieTools.applyLogoToNode(
      selectedNode,
      logoSvgText,
      fillColor.value,
      strokeColor.value,
      Number(strokeWidth.value)
    );
    renderPreview();
  });

  // ---------- Reset ----------
  resetBtn.addEventListener('click', () => {
    if (!originalAnimationData) return;
    animationData = JSON.parse(JSON.stringify(originalAnimationData));
    rebuildEverything();
  });

  // ---------- Export ----------
  exportBtn.addEventListener('click', () => {
    if (!animationData) return;
    const json = JSON.stringify(animationData);
    const gzipped = window.LottieTools.gzipFromText(json);
    const blob = new Blob([gzipped], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sticker.tgs';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();
