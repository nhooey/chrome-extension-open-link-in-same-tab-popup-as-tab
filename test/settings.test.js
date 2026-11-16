// The shipped defaults.json against settings.schema.json, and the merge
// of the user's stored settings over it.

const test = require("node:test");
const assert = require("node:assert/strict");
const { readRepoFile } = require("./support/extension.js");
const { mergeSettings, validateSettings } = require("../core.js");

const schema = JSON.parse(readRepoFile("settings.schema.json"));
const defaults = JSON.parse(readRepoFile("defaults.json"));
const scripts = ["UseOneWindow.js", "OpenInTheSameTab.js", "popup.js"];

test("defaults.json passes the schema", () => {
  validateSettings(schema, defaults);
});

test("defaults.json and the schema name the same settings", () => {
  assert.deepEqual(Object.keys(defaults).sort(), Object.keys(schema.properties).sort());
});

test("every setting is documented in the schema", () => {
  for (const [key, property] of Object.entries(schema.properties)) {
    assert.ok(property.description, `${key} has no description`);
  }
});

test("every setting the scripts read is in defaults.json", () => {
  for (const file of scripts) {
    for (const [, key] of readRepoFile(file).matchAll(/settings\.(\w+)/g)) {
      assert.ok(key in defaults, `${file} reads ${key}`);
    }
  }
});

test("the options pop-up has a checkbox for every setting", () => {
  const boxes = [...readRepoFile("popup.html").matchAll(/id="cb_(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(boxes.sort(), Object.keys(defaults).sort());
});

test("no script reads storage or carries a default of its own", () => {
  for (const file of scripts) {
    assert.doesNotMatch(readRepoFile(file), /storage\.sync\.get|default value/i, file);
  }
});

test("an empty user config gives exactly the defaults", () => {
  assert.deepEqual({ ...mergeSettings(schema, defaults, {}) }, defaults);
});

test("a stored setting changes only its own key", () => {
  assert.deepEqual(mergeSettings(schema, defaults, { t1foc: false }), {
    ...defaults,
    t1foc: false,
  });
});

test("an unknown stored setting is refused", () => {
  assert.throws(() => mergeSettings(schema, defaults, { t1tabs: false }), /Unknown setting "t1tabs"/);
});

test("a stored setting of the wrong type is refused", () => {
  assert.throws(() => mergeSettings(schema, defaults, { t1tab: "yes" }), /"t1tab" must be a boolean/);
});

test("a setting with no value is refused", () => {
  const { t1pop, ...partial } = defaults;
  assert.throws(() => validateSettings(schema, partial), /"t1pop" has no value/);
});
