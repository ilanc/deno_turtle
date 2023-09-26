// Active download
let controller;
let filename;

/**
 * Handle `message` events from main thread
 * @param {MessageEvent<{type: string, url?: string, name?: string}>} ev
 */
const onMessage = (ev) => {
  switch (ev.data.type) {
    case 'download':
      startDownload(ev.data.url);
      break;
    case 'abort':
      abortDownload();
      break;
    case 'delete':
      deleteFile(ev.data.name);
      break;
  }
};

/**
 * Post files list with the name and size
 * @returns {Promise<{name: string, size: number}[]>}
 */
const sendFiles = async () => {
  const files = [];
  const root = await navigator.storage.getDirectory();
  for await (const [name, value] of root.entries()) {
    if (value.kind !== 'file') continue;
    if (name === filename) continue;
    const handle = await root.getFileHandle(name);
    const access = await handle.createSyncAccessHandle();
    files.push({
      name,
      size: await access.getSize()
    });
    access.close();
  }
  self.postMessage({type: 'files', files});
};

/**
 * Delete a file by name
 * @param {string} name
 */
const deleteFile = async (name) => {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(name);
  } catch (err) {
    console.error(err);
  } finally {
    sendFiles();
  }
};

/**
 * Abort the active download
 */
const abortDownload = () => {
  if (!controller) return;
  controller.abort();
  controller = null;
  self.postMessage({type: 'aborted'});
};

/**
 * Start new download of `url` specified
 * @param {string} url
 */
const startDownload = async (url) => {
  let writer;
  try {
    self.postMessage({type: 'started'});
    controller = new AbortController();
    // Use `URL` instance for cheap validation
    const response = await fetch(new URL(url), {
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    // Get a readable stream, content length, and filename
    const reader = response.body.getReader();
    const length = Number.parseInt(response.headers.get('content-length'));
    console.log(...response.headers);
    filename = response.headers
      .get('content-disposition')
      .match(/filename="([^"]+)"/)[1];

    // Create a new writable file handle
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(filename, {create: true});
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
    self.postMessage({type: 'ended'});
  } catch (err) {
    console.error(err);
    if (writer) writer.close();
    deleteFile(filename);
    self.postMessage({type: 'error'});
  } finally {
    controller = null;
    filename = '';
    sendFiles();
  }
};

// Listen to main thread
self.addEventListener('message', onMessage);

// Send initial files on load
sendFiles();
