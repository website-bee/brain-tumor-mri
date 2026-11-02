'use strict';

const $ = (id) => document.getElementById(id);
const state = { file: null, preview: null, result: null, view: 'original', busy: false, samples: [], page: 0, selection: 0 };
const number = new Intl.NumberFormat('vi-VN');
const percent = (value) => `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
const tabs = [...document.querySelectorAll('[data-view]')];
const PAGE_SIZE = 12;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  $('themeToggle').setAttribute('aria-pressed', String(light));
  $('themeToggle').setAttribute('aria-label', light ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng');
  $('themeToggle').textContent = light ? '☾ Giao diện tối' : '☀ Giao diện sáng';
}
let savedTheme;
try { savedTheme = localStorage.getItem('neuropath-theme'); } catch { /* Storage may be unavailable. */ }
setTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
$('themeToggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(theme);
  try { localStorage.setItem('neuropath-theme', theme); } catch { /* Theme still works for this session. */ }
});

function error(message = '') {
  $('errorMessage').textContent = message;
  $('errorMessage').hidden = !message;
}

function setBusy(busy) {
  state.busy = busy;
  $('busyOverlay').hidden = !busy;
  $('analyzeButton').disabled = busy || !state.file;
  $('analyzeLabel').textContent = busy ? 'Đang phân tích…' : 'Phân tích ảnh';
  $('confidence').disabled = busy;
  $('fileInput').disabled = busy;
  $('clearFile').disabled = busy;
  $('sampleFilter').disabled = busy;
  updateSamplePagination();
  $('dropzone').setAttribute('aria-disabled', String(busy));
  document.querySelectorAll('.sample').forEach((button) => { button.disabled = busy; });
}

function resetZoom() {
  $('zoom').value = '100';
  $('zoomValue').textContent = '100%';
  $('viewerImage').style.transform = 'scale(1)';
  $('imageStage').scrollTo(0, 0);
}

function showView(view) {
  state.view = view;
  tabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const source = state.result ? state.result.images[view] : state.preview;
  $('viewerImage').hidden = !source;
  $('viewerEmpty').hidden = Boolean(source);
  $('viewBadge').hidden = !source;
  if (source) $('viewerImage').src = source;
  else $('viewerImage').removeAttribute('src');
  $('viewerImage').alt = { original: 'Ảnh MRI gốc', overlay: 'Ảnh MRI với vùng dự đoán của mô hình', mask: 'Mặt nạ phân đoạn màu theo nhãn dự đoán' }[view];
  $('viewBadge').textContent = { original: 'ẢNH GỐC', overlay: 'PHÂN ĐOẠN 2D', mask: 'MẶT NẠ MÔ HÌNH' }[view];
}

function clearResult() {
  state.result = null;
  $('resultEmpty').hidden = false;
  $('resultContent').hidden = true;
  $('resultTag').textContent = 'ĐANG CHỜ';
  $('viewerCaption').textContent = 'Một ảnh đầu vào · Một lát cắt 2D';
  $('interpretation').textContent = 'Mô hình hỗ trợ nhận diện 3 nhóm: u thần kinh đệm, u màng não và u tuyến yên.';
  $('processModel').classList.remove('done');
  $('processResult').classList.remove('done');
  tabs.forEach((tab) => { tab.disabled = tab.dataset.view !== 'original'; });
  showView('original');
}

async function chooseFile(file, sampleId = null) {
  if (state.busy || !file) return;
  const ticket = ++state.selection;
  error();
  if (file.size > 10 * 1024 * 1024) return error('Ảnh vượt quá giới hạn 10 MB.');
  if (!/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) return error('Hãy chọn ảnh PNG, JPG, WEBP hoặc BMP.');
  const preview = URL.createObjectURL(file);
  const image = new Image();
  image.src = preview;
  try {
    await image.decode();
    if (ticket !== state.selection || state.busy) { URL.revokeObjectURL(preview); return; }
    if (image.naturalWidth * image.naturalHeight > 16_000_000) {
      URL.revokeObjectURL(preview);
      return error('Ảnh quá lớn. Giới hạn 16 triệu pixel.');
    }
  } catch {
    URL.revokeObjectURL(preview);
    if (ticket === state.selection) error('Không đọc được tệp ảnh này.');
    return;
  }
  if (state.preview) URL.revokeObjectURL(state.preview);
  state.file = file;
  state.preview = preview;
  clearResult();
  resetZoom();
  $('fileDetail').hidden = false;
  $('fileName').textContent = file.name;
  $('fileMeta').textContent = `${number.format(Math.round(file.size / 1024))} KB · ${image.naturalWidth} × ${image.naturalHeight} px`;
  $('imageDimensions').textContent = `${image.naturalWidth} × ${image.naturalHeight} PX`;
  $('processInput').classList.add('done');
  $('analyzeButton').disabled = false;
  document.querySelectorAll('.sample').forEach((button) => button.classList.toggle('selected', Number(button.dataset.id) === sampleId));
}

function renderResult(result) {
  state.result = result;
  const top = result.detections[0];
  $('resultEmpty').hidden = true;
  $('resultContent').hidden = false;
  $('resultTag').textContent = 'HOÀN TẤT';
  $('predictedClass').textContent = top?.class_name || 'Chưa phát hiện';
  $('predictedLabel').textContent = top?.label || 'Ở ngưỡng tin cậy đã chọn';
  $('predictedConfidence').textContent = top ? percent(top.confidence) : '—';
  $('confidenceBar').style.width = top ? `${top.confidence * 100}%` : '0%';
  $('regionCount').textContent = number.format(result.detections.length);
  $('areaPixels').textContent = result.has_masks ? `${number.format(result.total_area_px)} px` : '—';
  $('areaPercent').textContent = result.has_masks ? `${result.total_area_percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%` : '—';
  $('inferenceTime').textContent = `${(result.elapsed_ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} s`;
  $('interpretation').textContent = result.message;
  $('detectionList').replaceChildren();
  result.detections.forEach((detection) => {
    const row = document.createElement('div');
    row.className = 'detection-item';
    const dot = document.createElement('span');
    dot.className = 'detection-dot';
    dot.style.background = detection.color;
    const description = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `#${detection.id} · ${detection.class_name}`;
    const detail = document.createElement('small');
    detail.textContent = detection.area_px === null ? 'Chỉ có khung phát hiện' : `${number.format(detection.area_px)} px · ${detection.area_percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}% ảnh`;
    description.append(title, detail);
    const score = document.createElement('span');
    score.textContent = percent(detection.confidence);
    row.append(dot, description, score);
    $('detectionList').append(row);
  });
  if (!top) {
    const note = document.createElement('p');
    note.className = 'section-description';
    note.textContent = 'Không có vùng vượt ngưỡng. Có thể điều chỉnh ngưỡng rồi phân tích lại.';
    $('detectionList').append(note);
  }
  tabs.forEach((tab) => { tab.disabled = tab.dataset.view === 'mask' && !result.has_masks; });
  $('downloadMask').disabled = !result.has_masks;
  $('downloadButton').disabled = !top;
  $('processModel').classList.add('done');
  $('processResult').classList.toggle('done', result.has_masks);
  $('viewerCaption').textContent = top ? `${result.detections.length} vùng phát hiện · Ngưỡng ${percent(result.threshold)}` : 'Không có vùng vượt ngưỡng';
  showView(top ? 'overlay' : 'original');
}

async function analyze() {
  if (!state.file || state.busy) return;
  error();
  clearResult();
  setBusy(true);
  try {
    const response = await fetch('/api/predict', {
      method: 'POST', headers: { 'Content-Type': state.file.type || 'application/octet-stream', 'X-Confidence': String(Number($('confidence').value) / 100) }, body: state.file,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Phân tích không thành công.');
    renderResult(data);
    $('systemState').classList.remove('warning');
    $('systemText').textContent = 'Mô hình đã sẵn sàng';
  } catch (exception) {
    error(exception.message === 'Failed to fetch' ? 'Mất kết nối với máy chủ. Kiểm tra terminal và khởi động lại web.' : exception.message);
    $('resultTag').textContent = 'CHƯA HOÀN TẤT';
  } finally {
    setBusy(false);
  }
}

function download(href, suffix) {
  if (!state.result) return;
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${state.file.name.replace(/\.[^.]+$/, '')}_${suffix}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function sampleGroup(sample) {
  const name = sample.name.toLowerCase();
  return ['glioma', 'meningioma', 'pituitary'].find((group) => name.startsWith(group)) || 'other';
}
function filteredSamples() {
  const group = $('sampleFilter').value;
  return group === 'all' ? state.samples : state.samples.filter((sample) => sampleGroup(sample) === group);
}
function updateSamplePagination() {
  const total = filteredSamples().length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  $('samplePage').textContent = total ? `${state.page + 1} / ${pages} · ${total} ảnh` : 'Không có ảnh';
  $('prevSamples').disabled = state.busy || state.page === 0;
  $('moreSamples').disabled = state.busy || state.page >= pages - 1;
}
function renderSamples() {
  const items = filteredSamples();
  const batch = items.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  $('sampleGrid').replaceChildren();
  batch.forEach((sample, index) => {
    const button = document.createElement('button');
    button.className = 'sample';
    button.dataset.id = String(sample.id);
    button.title = sample.name;
    button.setAttribute('aria-label', `Chọn ảnh test ${state.page * PAGE_SIZE + index + 1}: ${sample.name}`);
    const image = document.createElement('img');
    image.src = sample.url;
    image.loading = 'lazy';
    image.alt = `Ảnh MRI test ${state.page * PAGE_SIZE + index + 1}`;
    const label = document.createElement('span');
    label.textContent = sampleGroup(sample) === 'other' ? `MRI ${state.page * PAGE_SIZE + index + 1}` : sampleGroup(sample);
    button.append(image, label);
    button.addEventListener('click', async () => {
      if (state.busy) return;
      const ticket = ++state.selection;
      try {
        const response = await fetch(sample.url);
        if (!response.ok) throw new Error('Không đọc được ảnh test.');
        const blob = await response.blob();
        if (ticket !== state.selection || state.busy) return;
        await chooseFile(new File([blob], sample.name, { type: 'image/png' }), sample.id);
      } catch (exception) { error(exception.message); }
    });
    $('sampleGrid').append(button);
  });
  updateSamplePagination();
}

$('fileInput').addEventListener('change', (event) => { chooseFile(event.target.files[0]); event.target.value = ''; });
$('dropzone').addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !state.busy) { event.preventDefault(); $('fileInput').click(); }
});
['dragenter', 'dragover'].forEach((name) => $('dropzone').addEventListener(name, (event) => { event.preventDefault(); if (!state.busy) $('dropzone').classList.add('dragover'); }));
['dragleave', 'drop'].forEach((name) => $('dropzone').addEventListener(name, (event) => { event.preventDefault(); $('dropzone').classList.remove('dragover'); }));
$('dropzone').addEventListener('drop', (event) => {
  if (event.dataTransfer.files.length !== 1) { error('Vui lòng tải lên mỗi lần một ảnh MRI.'); return; }
  chooseFile(event.dataTransfer.files[0]);
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
$('clearFile').addEventListener('click', () => {
  if (state.busy) return;
  ++state.selection;
  if (state.preview) URL.revokeObjectURL(state.preview);
  state.file = null;
  state.preview = null;
  clearResult();
  resetZoom();
  error();
  $('fileDetail').hidden = true;
  $('imageDimensions').textContent = 'CHƯA CÓ ẢNH';
  $('analyzeButton').disabled = true;
  $('processInput').classList.remove('done');
  document.querySelectorAll('.sample').forEach((button) => button.classList.remove('selected'));
});
$('confidence').addEventListener('input', () => { $('confidenceValue').textContent = `${$('confidence').value}%`; clearResult(); });
$('zoom').addEventListener('input', () => {
  $('zoomValue').textContent = `${$('zoom').value}%`;
  $('viewerImage').style.transform = `scale(${Number($('zoom').value) / 100})`;
});
$('zoomReset').addEventListener('click', resetZoom);
tabs.forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
$('analyzeButton').addEventListener('click', analyze);
$('moreSamples').addEventListener('click', () => { if (!state.busy && state.page + 1 < Math.ceil(filteredSamples().length / PAGE_SIZE)) { state.page++; renderSamples(); } });
$('prevSamples').addEventListener('click', () => { if (!state.busy && state.page > 0) { state.page--; renderSamples(); } });
$('sampleFilter').addEventListener('change', () => { state.page = 0; renderSamples(); });
$('downloadButton').addEventListener('click', () => download(state.result.images.overlay, 'segmentation.png'));
$('downloadMask').addEventListener('click', () => download(state.result.images.binary, 'mask.png'));
$('downloadJson').addEventListener('click', () => {
  if (!state.result) return;
  const { images, ...metadata } = state.result;
  const url = URL.createObjectURL(new Blob([JSON.stringify({ filename: state.file.name, ...metadata }, null, 2)], { type: 'application/json' }));
  download(url, 'result.json');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function initialize() {
  const outcomes = await Promise.allSettled([
    fetch('/api/status').then((response) => { if (!response.ok) throw new Error('status'); return response.json(); }),
    fetch('/api/samples').then((response) => { if (!response.ok) throw new Error('samples'); return response.json(); }),
  ]);
  const [status, samples] = outcomes;
  if (status.status === 'fulfilled') {
    $('systemText').textContent = status.value.message;
    $('systemState').classList.toggle('warning', !status.value.ready);
    $('modelName').textContent = status.value.model;
  } else {
    $('systemText').textContent = 'Không kết nối được máy chủ';
    $('systemState').classList.add('warning');
  }
  if (samples.status === 'fulfilled') {
    // Interleave file-name groups so the first page contains varied test images.
    const groups = new Map();
    samples.value.samples.forEach((sample) => {
      const key = sample.name.replace(/[0-9].*$/, '').toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(sample);
    });
    while ([...groups.values()].some((group) => group.length)) {
      groups.forEach((group) => { if (group.length) state.samples.push(group.shift()); });
    }
    $('sampleCount').textContent = `${state.samples.length} ảnh`;
    renderSamples();
  }
  if (!state.samples.length) {
    updateSamplePagination();
    $('sampleGrid').textContent = samples.status === 'fulfilled' ? 'Chưa có ảnh trong thư mục test/images.' : 'Không tải được danh sách ảnh test.';
    $('sampleGrid').classList.add('section-description');
  }
}
initialize();
