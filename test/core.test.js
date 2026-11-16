const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../core.js");

test("retargetedTarget opens _blank links in the same tab", () => {
  assert.equal(core.retargetedTarget("_blank"), "_top");
});

test("retargetedTarget leaves other targets alone", () => {
  for (const target of ["", "_self", "_top", "_parent", "named-frame"]) {
    assert.equal(core.retargetedTarget(target), target);
  }
});

test("shouldMovePopup moves pop-ups only while the option is on", () => {
  assert.equal(core.shouldMovePopup("popup", true), true);
  assert.equal(core.shouldMovePopup("popup", false), false);
});

test("shouldMovePopup leaves non-pop-up windows alone", () => {
  for (const type of ["normal", "panel", "app", "devtools"]) {
    assert.equal(core.shouldMovePopup(type, true), false);
  }
});

test("isMovableUrl keeps other extensions' pop-ups as windows", () => {
  assert.equal(core.isMovableUrl("chrome-extension://abc/popup.html"), false);
});

test("isMovableUrl moves web pages", () => {
  assert.equal(core.isMovableUrl("https://example.com/"), true);
  assert.equal(core.isMovableUrl("http://example.com/chrome-extension://"), true);
});

test("nextMainWindowId follows focus to a normal window", () => {
  assert.equal(core.nextMainWindowId(1, { id: 7, type: "normal" }), 7);
});

test("nextMainWindowId ignores focus on a pop-up window", () => {
  assert.equal(core.nextMainWindowId(1, { id: 7, type: "popup" }), 1);
});

test("optionNeedsReload reloads for the background script's options only", () => {
  assert.equal(core.optionNeedsReload("t1pop"), true);
  assert.equal(core.optionNeedsReload("t1foc"), true);
  assert.equal(core.optionNeedsReload("t1tab"), false);
});
