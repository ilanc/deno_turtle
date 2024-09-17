// Cache selectors
const $progress = document.querySelector("#progress");
const $download = document.querySelector("#download");
const $abort = document.querySelector("#abort");
const $files = document.querySelector("#files");
const $file = document.querySelector("#file");

// const url = new URL('https://turtle.deno.dev/bin');
/*
-rw-r--r-- 1 ilan ilan 81297408 Sep 12 09:24 /code/prototype/sqlite/data/meta.db
-rw-r--r-- 1 ilan ilan    32768 Sep 12 10:54 /code/prototype/sqlite/data/meta-small.db
-rw-rw-r-- 1 ilan ilan 39145472 Sep 12 07:48 /code/prototype/sqlite/data/northwind.db
*/
const url = new URL("http://localhost:3000/db1"); // meta.db = 81mb
// const url = new URL("http://localhost:3000/db2"); // meta-small.db = 32kb
// const url = new URL("http://localhost:3000/db3"); // northwind.db = 39mb

const worker = new Worker("/worker.js");

/**
 * Handle `message` events from worker
 * @param {MessageEvent<{
 *   type: string,
 *   value?: number,
 *   files?:{name: string, size: number}[]
 * }>} ev
 */
const onMessage = (ev) => {
  switch (ev.data.type) {
    case "started":
      onStart();
      break;
    case "progress":
      updateProgress(ev.data.value);
      break;
    case "files":
      updateFiles(ev.data.files);
      break;
    case "ended":
    case "aborted":
    case "error":
      onReset();
      break;
  }
};

worker.addEventListener("message", onMessage);

$download.addEventListener("click", () => {
  worker.postMessage({
    type: "download",
    url: url.href,
  });
});

$abort.addEventListener("click", () => {
  // worker.postMessage({
  //   type: "abort",
  // });
  verify();
});

$files.addEventListener("click", (ev) => {
  const $button = ev.target.closest("button");
  if (!$button) return;
  $button.disabled = true;
  const name = $button.parentNode.querySelector(".name").textContent;
  worker.postMessage({
    type: "delete",
    name,
  });
});

const onStart = () => {
  $download.disabled = true;
  $abort.disabled = false;
  $progress.value = 0;
  $progress.parentNode.style.setProperty("--value", 0);
};

const onReset = () => {
  $download.disabled = false;
  $abort.disabled = true;
  $progress.value = 0;
  $progress.parentNode.style.setProperty("--value", 0);
};

/**
 * Update download percentage
 * @param {number} value
 */
const updateProgress = (value) => {
  $progress.value = value;
  $progress.parentNode.style.setProperty("--value", value);
};

/**
 * Build list of files recieved from worker
 * @param {{name: string, size: number}[]} files
 */
const updateFiles = async (files) => {
  const frag = document.createDocumentFragment();
  for await (const file of files) {
    const $item = $file.content.cloneNode(true);
    $item.querySelector(".name").textContent = file.name;
    $item.querySelector(".size").textContent = formatBytes(file.size);
    frag.appendChild($item);
  }
  if (navigator?.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    $files.innerHTML = `<p>Using ${formatBytes(
      estimate.usage
    )} of ${formatBytes(estimate.quota)}.</p>`;
  } else {
    $files.innerHTML = "<p>Browser does not support storage estimate.</p>";
  }
  $files.appendChild(frag);
};

/**
 * Format bytes to string with readable units
 * @param {number} bytes
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const SEARCH_PARAMS = new URLSearchParams(location.search);
const VFS_NAME = SEARCH_PARAMS.get("vfs") ?? "meta-vfs";
const DB_NAME = SEARCH_PARAMS.get("db") ?? "meta.db";

async function verify() {
  const verifierURL = new URL("/verifier.js", location.href);
  verifierURL.searchParams.set("vfs", VFS_NAME);
  verifierURL.searchParams.set("db", DB_NAME);
  const worker = new Worker(verifierURL, { type: "module" });
  await new Promise((resolve) => {
    worker.addEventListener("message", ({ data }) => {
      resolve();
      for (const row of data) {
        console.log(`integrity result: ${row}`);
      }
      worker.terminate();
    });
  });
}
