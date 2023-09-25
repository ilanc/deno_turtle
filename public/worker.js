self.postMessage({type: 'ready'});

self.addEventListener('message', (ev) => {
  const {type} = ev.data;
  if (type === 'download') {
    onDownload(ev.data.url);
  }
  if (type === 'abort') {
    onAbort();
  }
  if (type === 'delete') {
    deleteFile(ev.data.name);
  }
});

let controller;

const onAbort = () => {
  if (controller) {
    controller.abort();
    controller = null;
  }
  deleteFile('.tmp');
  self.postMessage({type: 'aborted'});
};

const deleteFile = async (name) => {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(name);
    self.postMessage({type: 'deleted'});
  } catch (err) {
    console.log(err);
  }
};

const randomName = () =>
  Array.from(
    {length: 12},
    () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('');

const onDownload = async (url) => {
  let writer;
  try {
    self.postMessage({type: 'started'});
    controller = new AbortController();
    // Use `URL` instance for cheap validation
    const response = await fetch(new URL(url), {
      signal: controller.signal,
      cache: 'no-cache'
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    // Get a readable stream and content length
    const reader = response.body.getReader();
    const length = Number.parseInt(response.headers.get('content-length'));
    // Create a new writable file handle
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('.tmp', {create: true});
    writer = await handle.createSyncAccessHandle();
    // Track read bytes as chunks are streamed
    let read = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      writer.write(value);
      read += value.length;
      self.postMessage({
        type: 'progress',
        value: (100 / length) * read
      });
    }
    writer.close();
    await handle.move(`${randomName()}.bin`);
    self.postMessage({type: 'ended'});
  } catch (err) {
    console.error(err);
    if (writer) {
      writer.close();
    }
    deleteFile();
    self.postMessage({type: 'error'});
  }
};
