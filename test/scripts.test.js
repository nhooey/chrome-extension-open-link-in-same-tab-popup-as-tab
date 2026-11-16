// The extension's own scripts, run in the order the manifest loads them.

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  manifest,
  runScripts,
  settle,
  getURL,
  fakeStorage,
  fakeBrowser,
  fakeAnchor,
} = require("./support/extension.js");

const backgroundScripts = () => manifest().background.scripts;
const contentScripts = () => manifest().content_scripts[0].js;
const popupScripts = ["core.js", "settings.js", "popup.js"];

async function startBackground(stored) {
  const browser = fakeBrowser([{ id: 1, type: "normal", tabs: [] }], stored);
  runScripts(backgroundScripts(), { chrome: browser.chrome });
  await settle();
  return browser;
}

function popup(id, url) {
  return { id, type: "popup", tabs: [{ id: id * 10, url }] };
}

test("background moves a pop-up's tab into the main window and focuses it", async () => {
  const browser = await startBackground({});
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.moves, [{ tabId: 20, windowId: 1, index: -1 }]);
  assert.deepEqual(browser.updates, [{ tabId: 20, active: true }]);
});

test("background leaves the moved tab unfocused when t1foc is off", async () => {
  const browser = await startBackground({ t1foc: false });
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.updates, [{ tabId: 20, active: false }]);
});

test("background leaves pop-ups as windows when t1pop is off", async () => {
  const browser = await startBackground({ t1pop: false });
  browser.open(popup(2, "https://example.com/"));
  assert.deepEqual(browser.moves, []);
});

test("background leaves other extensions' pop-ups as windows", async () => {
  const browser = await startBackground({});
  browser.open(popup(2, "chrome-extension://abc/popup.html"));
  assert.deepEqual(browser.moves, []);
});

test("background leaves new normal windows alone", async () => {
  const browser = await startBackground({});
  browser.open({ id: 2, type: "normal", tabs: [{ id: 20, url: "https://example.com/" }] });
  assert.deepEqual(browser.moves, []);
});

test("background moves pop-ups into the normal window focused last", async () => {
  const browser = await startBackground({});
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

async function runContentScript(stored, targets) {
  const anchors = targets.map(fakeAnchor);
  const document = {
    getElementsByTagName: (tag) => (tag === "a" ? anchors : []),
  };
  runScripts(contentScripts(), {
    chrome: { runtime: { getURL }, storage: fakeStorage(stored) },
    document,
  });
  await settle();
  return anchors;
}

test("content script opens _blank links in the same tab", async () => {
  const anchors = await runContentScript({}, ["_blank", "_blank"]);
  assert.deepEqual(anchors.map((a) => a.target), ["_top", "_top"]);
});

test("content script doesn't write to links it leaves alone", async () => {
  const anchors = await runContentScript({}, ["", "_self", "frame"]);
  assert.deepEqual(anchors.map((a) => a.writes), [0, 0, 0]);
});

test("content script leaves links alone when t1tab is off", async () => {
  const anchors = await runContentScript({ t1tab: false }, ["_blank"]);
  assert.deepEqual(anchors.map((a) => a.target), ["_blank"]);
});

async function openPopup(stored) {
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
    chrome: { storage, runtime: { getURL, reload: () => reloads.push(true) } },
    document: { getElementById: (id) => elements[id] },
    window,
    console: { log() {} },
  });
  window.onload();
  await settle();
  return { elements, saved: storage.saved, reloads };
}

test("options pop-up shows the stored options, defaulting to on", async () => {
  const { elements } = await openPopup({ t1foc: false });
  assert.equal(elements.cb_t1pop.checked, true);
  assert.equal(elements.cb_t1foc.checked, false);
  assert.equal(elements.cb_t1tab.checked, true);
});

test("options pop-up saves only t1pop and reloads", async () => {
  const { elements, saved, reloads } = await openPopup({});
  elements.cb_t1pop.click();
  assert.deepEqual(saved, [{ t1pop: false }]);
  assert.equal(reloads.length, 1);
});

test("options pop-up saves only t1foc and reloads", async () => {
  const { elements, saved, reloads } = await openPopup({});
  elements.cb_t1foc.click();
  assert.deepEqual(saved, [{ t1foc: false }]);
  assert.equal(reloads.length, 1);
});

test("options pop-up saves only t1tab, without reloading", async () => {
  const { elements, saved, reloads } = await openPopup({});
  elements.cb_t1tab.click();
  assert.deepEqual(saved, [{ t1tab: false }]);
  assert.equal(reloads.length, 0);
});
