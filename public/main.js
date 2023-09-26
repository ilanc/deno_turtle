// Cache selectors
const $progress = document.querySelector('#progress');
const $download = document.querySelector('#download');
const $abort = document.querySelector('#abort');
const $files = document.querySelector('#files');
const $file = document.querySelector('#file');

document.querySelector('form').addEventListener('submit', (ev) => {
  ev.preventDefault();
});

const url = new URL('https://turtle.deno.dev/bin');

const worker = new Worker('/worker.js');

/**
 * @param {MessageEvent<{
 *   type: string,
 *   value?: number,
 *   files?:{name: string, size: number}[]
 * }>} ev
 */
const onMessage = (ev) => {
  switch (ev.data.type) {
    case 'files':
      updateFiles(ev.data.files);
      break;
    case 'progress':
      $progress.value = ev.data.value;
      $progress.parentNode.style.setProperty('--value', ev.data.value);
      break;
    case 'started':
      onStart();
      break;
    case 'ended':
    case 'aborted':
    case 'error':
      onReset();
      break;
  }
};

worker.addEventListener('message', onMessage);

$download.addEventListener('click', () => {
  worker.postMessage({
    type: 'download',
    url: url.href
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
  $progress.parentNode.style.setProperty('--value', 0);
};

const onReset = () => {
  $download.disabled = false;
  $abort.disabled = true;
  $progress.value = 0;
  $progress.parentNode.style.setProperty('--value', 0);
};

/**
 * @param {number} bytes
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * @param {{name: string, size: number}[]} files
 */
const updateFiles = async (files) => {
  const frag = document.createDocumentFragment();
  for await (const file of files) {
    const $item = $file.content.cloneNode(true);
    $item.querySelector('.name').textContent = file.name;
    $item.querySelector('.size').textContent = formatBytes(file.size);
    frag.appendChild($item);
  }
  if (navigator?.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    $files.innerHTML = `<p>Using ${formatBytes(
      estimate.usage
    )} of ${formatBytes(estimate.quota)}.</p>`;
  } else {
    $files.innerHTML = '<p>Browser does not support storage estimate.</p>';
  }
  $files.appendChild(frag);
};
