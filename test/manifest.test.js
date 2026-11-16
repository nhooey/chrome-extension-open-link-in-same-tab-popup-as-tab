const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { manifest, readRepoFile } = require("./support/extension.js");

const root = path.join(__dirname, "..");

function referencedFiles(m) {
  return [
    ...m.background.scripts,
    ...m.content_scripts.flatMap((c) => c.js),
    m.browser_action.default_popup,
    m.browser_action.default_icon,
    ...Object.values(m.icons),
  ];
}

test("every file the manifest names exists", () => {
  for (const file of referencedFiles(manifest())) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
  }
});

test("core.js and settings.js load before the background and content scripts", () => {
  const m = manifest();
  assert.deepEqual(m.background.scripts, ["core.js", "settings.js", "UseOneWindow.js"]);
  for (const c of m.content_scripts) {
    assert.deepEqual(c.js.slice(0, 2), ["core.js", "settings.js"]);
  }
});

test("popup.html loads core.js and settings.js before popup.js", () => {
  const scripts = [...readRepoFile("popup.html").matchAll(/<script src="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(scripts, ["core.js", "settings.js", "popup.js"]);
});

test("content scripts may fetch the settings files", () => {
  // A content script fetches as the page does, so Chrome serves it only
  // the extension's web-accessible files.
  for (const file of ["defaults.json", "settings.schema.json"]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
    assert.ok(manifest().web_accessible_resources.includes(file), file);
  }
});
