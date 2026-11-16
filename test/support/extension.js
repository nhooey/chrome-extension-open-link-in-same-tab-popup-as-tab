// Runs the extension's scripts in a fresh vm context against a fake
// `chrome` API and DOM, the way Chrome loads them: one shared global
// scope per page, scripts in the order the manifest lists them.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "..");

function readRepoFile(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function manifest() {
  return JSON.parse(readRepoFile("manifest.json"));
}

// Runs files in one fresh context with globals, plus fetch for the
// extension's own files.
function runScripts(files, globals) {
  const context = vm.createContext({ fetch: fakeFetch, ...globals });
  for (const file of files) {
    vm.runInContext(readRepoFile(file), context, { filename: file });
  }
  return context;
}

// Chrome's settled state: every pending fetch, promise and storage
// callback has run, so a test can look at what the scripts did.
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

const extensionOrigin = "chrome-extension://fake-extension-id/";

// chrome.runtime's URL for a file in the extension.
function getURL(file) {
  return extensionOrigin + file;
}

// fetch for the extension's own files, served from the repository.
function fakeFetch(url) {
  if (!url.startsWith(extensionOrigin)) {
    return Promise.reject(new Error(`unexpected fetch of ${url}`));
  }
  const body = readRepoFile(url.slice(extensionOrigin.length));
  return Promise.resolve({ json: () => Promise.resolve(JSON.parse(body)) });
}

// chrome.storage.sync backed by a plain object. get(null) returns every
// stored key, as Chrome's does; the scripts ask for nothing else.
function fakeStorage(stored) {
  const saved = [];
  return {
    saved,
    sync: {
      get(keys, callback) {
        if (keys !== null) {
          throw new Error("the scripts read storage only through get(null)");
        }
        callback({ ...stored });
      },
      set(items, callback) {
        saved.push({ ...items }); // copy out of the vm realm
        callback();
      },
    },
  };
}

// A browser with the given windows, each { id, type, tabs: [{ id, url }] },
// whose first window is current. Records tab moves and updates, and lets
// a test fire the window events the background script listens to.
function fakeBrowser(windows, stored) {
  const listeners = { created: [], focusChanged: [] };
  const moves = [];
  const updates = [];
  const byId = (id) => windows.find((w) => w.id === id);
  const chrome = {
    runtime: { getURL },
    storage: fakeStorage(stored),
    windows: {
      getCurrent(_options, callback) {
        callback(windows[0]);
      },
      get(id, _options, callback) {
        callback(byId(id));
      },
      onCreated: { addListener: (f) => listeners.created.push(f) },
      onFocusChanged: { addListener: (f) => listeners.focusChanged.push(f) },
    },
    tabs: {
      query({ windowId }, callback) {
        callback(byId(windowId).tabs.slice(0, 1));
      },
      move(tabId, properties, callback) {
        moves.push({ tabId, ...properties });
        callback();
      },
      update(tabId, properties) {
        updates.push({ tabId, ...properties });
      },
    },
  };
  return {
    chrome,
    moves,
    updates,
    open(window) {
      windows.push(window);
      listeners.created.forEach((f) => f(window));
    },
    focus(id) {
      listeners.focusChanged.forEach((f) => f(id));
    },
  };
}

// An anchor whose target writes are counted, so a test can tell an
// untouched link from one rewritten to the same value.
function fakeAnchor(target) {
  const anchor = { writes: 0 };
  let value = target;
  Object.defineProperty(anchor, "target", {
    get: () => value,
    set: (v) => {
      anchor.writes += 1;
      value = v;
    },
  });
  return anchor;
}

module.exports = {
  manifest,
  readRepoFile,
  runScripts,
  settle,
  getURL,
  fakeStorage,
  fakeBrowser,
  fakeAnchor,
};
