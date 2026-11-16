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

test("core.js loads before the background and content scripts", () => {
  const m = manifest();
  assert.deepEqual(m.background.scripts, ["core.js", "UseOneWindow.js"]);
  for (const c of m.content_scripts) {
    assert.equal(c.js[0], "core.js");
  }
});

test("popup.html loads core.js before popup.js", () => {
  const scripts = [...readRepoFile("popup.html").matchAll(/<script src="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(scripts, ["core.js", "popup.js"]);
});
