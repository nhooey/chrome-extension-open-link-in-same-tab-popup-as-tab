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

function runScripts(files, globals) {
  const context = vm.createContext(globals);
  for (const file of files) {
    vm.runInContext(readRepoFile(file), context, { filename: file });
  }
  return context;
}

// chrome.storage.sync backed by a plain object, with get's defaults.
function fakeStorage(stored) {
  const saved = [];
  return {
    saved,
    sync: {
      get(defaults, callback) {
        callback({ ...defaults, ...stored });
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
  fakeStorage,
  fakeBrowser,
  fakeAnchor,
};
