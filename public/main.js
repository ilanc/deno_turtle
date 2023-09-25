const $url = document.querySelector('#url');
const $progress = document.querySelector('#progress');
const $download = document.querySelector('#download');
const $abort = document.querySelector('#abort');
const $files = document.querySelector('#files');
const $file = document.querySelector('#file');

const worker = new Worker('/worker.js');

worker.addEventListener('message', (ev) => {
  const {type} = ev.data;
  if (type === 'progress') {
    $progress.value = ev.data.value;
  }
  if (type === 'started') {
    onStart();
  }
  if (type === 'ended') {
    onReset();
  }
  if (type === 'aborted') {
    onReset();
  }
  if (type === 'error') {
    onReset();
  }
  updateFiles();
});

$download.addEventListener('click', () => {
  worker.postMessage({
    type: 'download',
    url: $url.value
  });
});

$abort.addEventListener('click', () => {
  worker.postMessage({
    type: 'abort'
  });
});

$files.addEventListener('click', (ev) => {
  const $button = ev.target.closest('button');
  if (!$button) return;
  $button.disabled = true;
  const name = $button.parentNode.querySelector('span').textContent;
  worker.postMessage({
    type: 'delete',
    name
  });
});

const onStart = () => {
  $download.disabled = true;
  $abort.disabled = false;
  $progress.value = 0;
};

const onReset = () => {
  $download.disabled = false;
  $abort.disabled = true;
  $progress.value = 0;
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const updateFiles = async () => {
  const estimate = await navigator.storage.estimate();
  const frag = document.createDocumentFragment();
  const root = await navigator.storage.getDirectory();
  for await (const [key, value] of root.entries()) {
    if (value.kind !== 'file') continue;
    if (key.startsWith('.')) continue;
    const $item = $file.content.cloneNode(true);
    $item.querySelector('span').textContent = key;
    frag.appendChild($item);
  }
  $files.innerHTML = `<p>Using ${formatBytes(estimate.usage)} of ${formatBytes(
    estimate.quota
  )}.</p>`;
  $files.appendChild(frag);
};
