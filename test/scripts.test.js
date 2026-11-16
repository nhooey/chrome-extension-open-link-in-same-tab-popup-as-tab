// The extension's own scripts, run in the order the manifest loads them.

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  manifest,
  runScripts,
  fakeStorage,
  fakeBrowser,
  fakeAnchor,
} = require("./support/extension.js");

const backgroundScripts = () => manifest().background.scripts;
const contentScripts = () => manifest().content_scripts[0].js;
const popupScripts = ["core.js", "popup.js"];

function startBackground(stored) {
  const browser = fakeBrowser([{ id: 1, type: "normal", tabs: [] }], stored);
  runScripts(backgroundScripts(), { chrome: browser.chrome });
  return browser;
}

function popup(id, url) {
  return { id, type: "popup", tabs: [{ id: id * 10, url }] };
}

test("background moves a pop-up's tab into the main window and focuses it", () => {
  const browser = startBackground({});
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.moves, [{ tabId: 20, windowId: 1, index: -1 }]);
  assert.deepEqual(browser.updates, [{ tabId: 20, active: true }]);
});

test("background leaves the moved tab unfocused when t1foc is off", () => {
  const browser = startBackground({ t1foc: false });
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.updates, [{ tabId: 20, active: false }]);
});

test("background leaves pop-ups as windows when t1pop is off", () => {
  const browser = startBackground({ t1pop: false });
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.moves, []);
});

test("background leaves other extensions' pop-ups as windows", () => {
  const browser = startBackground({});
  browser.open(popup(2, "chrome-extension://abc/popup.html"));
  assert.deepEqual(browser.moves, []);
});

test("background leaves new normal windows alone", () => {
  const browser = startBackground({});
  browser.open({ id: 2, type: "normal", tabs: [{ id: 20, url: "https://example.com/" }] });
  assert.deepEqual(browser.moves, []);
});

test("background moves pop-ups into the normal window focused last", () => {
  const browser = startBackground({});
  browser.open({ id: 3, type: "normal", tabs: [] });
  browser.focus(3);
  browser.open(popup(4, "https://example.com/"));
  browser.focus(4);
  browser.open(popup(5, "https://example.com/"));
  assert.deepEqual(
    browser.moves.map((m) => m.windowId),
    [3, 3],
  );
});

function runContentScript(stored, targets) {
  const anchors = targets.map(fakeAnchor);
  const document = {
    getElementsByTagName: (tag) => (tag === "a" ? anchors : []),
  };
  runScripts(contentScripts(), { chrome: { storage: fakeStorage(stored) }, document });
  return anchors;
}

test("content script opens _blank links in the same tab", () => {
  const anchors = runContentScript({}, ["_blank", "_blank"]);
  assert.deepEqual(anchors.map((a) => a.target), ["_top", "_top"]);
});

test("content script doesn't write to links it leaves alone", () => {
  const anchors = runContentScript({}, ["", "_self", "frame"]);
  assert.deepEqual(anchors.map((a) => a.writes), [0, 0, 0]);
});

test("content script leaves links alone when t1tab is off", () => {
  const anchors = runContentScript({ t1tab: false }, ["_blank"]);
  assert.deepEqual(anchors.map((a) => a.target), ["_blank"]);
});

function openPopup(stored) {
  const elements = {};
  for (const key of ["t1pop", "t1foc", "t1tab"]) {
    const element = { checked: null, listeners: [] };
    element.addEventListener = (type, f) => element.listeners.push({ type, f });
    element.click = () => {
      element.checked = !element.checked;
      element.listeners.filter((l) => l.type === "click").forEach((l) => l.f());
    };
    elements["cb_" + key] = element;
  }
  const storage = fakeStorage(stored);
  const reloads = [];
  const window = {};
  runScripts(popupScripts, {
    chrome: { storage, runtime: { reload: () => reloads.push(true) } },
    document: { getElementById: (id) => elements[id] },
    window,
    console: { log() {} },
  });
  window.onload();
  return { elements, saved: storage.saved, reloads };
}

test("options pop-up shows the stored options, defaulting to on", () => {
  const { elements } = openPopup({ t1foc: false });
  assert.equal(elements.cb_t1pop.checked, true);
  assert.equal(elements.cb_t1foc.checked, false);
  assert.equal(elements.cb_t1tab.checked, true);
});

test("options pop-up saves every option and reloads for t1pop", () => {
  const { elements, saved, reloads } = openPopup({});
  elements.cb_t1pop.click();
  assert.deepEqual(saved, [{ t1pop: false, t1foc: true, t1tab: true }]);
  assert.equal(reloads.length, 1);
});

test("options pop-up reloads for t1foc", () => {
  const { elements, saved, reloads } = openPopup({});
  elements.cb_t1foc.click();
  assert.deepEqual(saved, [{ t1pop: true, t1foc: false, t1tab: true }]);
  assert.equal(reloads.length, 1);
});

test("options pop-up saves t1tab without reloading", () => {
  const { elements, saved, reloads } = openPopup({});
  elements.cb_t1tab.click();
  assert.deepEqual(saved, [{ t1pop: true, t1foc: true, t1tab: false }]);
  assert.equal(reloads.length, 0);
});
