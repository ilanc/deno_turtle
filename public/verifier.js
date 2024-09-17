import SQLiteESMFactory from "./wa-sqlite-async.mjs";
// import * as SQLite from "./wa-sqlite.mjs"; // no - this is syncronous SQLiteESMFactory?
import * as SQLite from "./wa-sqlite/sqlite-api.js"; // this is the api
// import { IDBBatchAtomicVFS as MyVFS } from "./wa-sqlite/examples/IDBBatchAtomicVFS.js";
// import { IDBMirrorVFS as MyVFS } from './wa-sqlite/examples/IDBMirrorVFS.js';
// import { AccessHandlePoolVFS as MyVFS } from './wa-sqlite/examples/AccessHandlePoolVFS.js';
import { OPFSAdaptiveVFS as MyVFS } from "./wa-sqlite/examples/OPFSAdaptiveVFS.js";
// import { OPFSAnyContextVFS as MyVFS } from './wa-sqlite/examples/OPFSAnyContextVFS.js';
// import { OPFSCoopSyncVFS as MyVFS } from './wa-sqlite/examples/OPFSCoopSyncVFS.js';
// import { OPFSPermutedVFS as MyVFS } from './wa-sqlite/examples/OPFSPermutedVFS.js';

const SEARCH_PARAMS = new URLSearchParams(location.search);
const VFS_NAME = SEARCH_PARAMS.get("vfs") ?? "meta-vfs";
const DB_NAME = SEARCH_PARAMS.get("db") ?? "meta.db";

(async function () {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = await MyVFS.create(VFS_NAME, module);
  // @ts-ignore
  sqlite3.vfs_register(vfs, true);

  const db = await sqlite3.open_v2(
    DB_NAME,
    SQLite.SQLITE_OPEN_READWRITE,
    VFS_NAME
  );

  const results = [];
  await sqlite3.exec(db, "PRAGMA integrity_check;", (row, columns) => {
    results.push(row[0]);
  });
  await sqlite3.close(db);

  postMessage(results);
})();
