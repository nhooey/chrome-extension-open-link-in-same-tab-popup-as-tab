const test = require("node:test");
const assert = require("node:assert/strict");
const tool = require("../tools/extension.js");

test("no command, -h or --help prints the tool's help", () => {
  for (const argv of [[], ["-h"], ["--help"], ["help"]]) {
    assert.deepEqual(tool.parse(argv), { kind: "help", text: tool.toolHelp() });
  }
});

test("the tool's help lists every command", () => {
  for (const name of Object.keys(tool.COMMANDS)) {
    assert.match(tool.toolHelp(), new RegExp(`^  ${name} `, "m"));
  }
});

test("each command's help lists its options", () => {
  for (const [name, command] of Object.entries(tool.COMMANDS)) {
    const help = tool.commandHelp(name);
    assert.deepEqual(tool.parse([name, "--help"]), { kind: "help", text: help });
    for (const option of [...Object.keys(command.options), "help"]) {
      assert.match(help, new RegExp(`--${option}\\b`));
    }
  }
});

test("help <command> prints that command's help", () => {
  assert.deepEqual(tool.parse(["help", "check"]), { kind: "help", text: tool.commandHelp("check") });
});

test("an unknown command, option or argument is bad usage", () => {
  for (const argv of [
    ["build"],
    ["test", "--verbose"],
    ["test", "core"],
    ["test", "--only"],
    ["test", "--", "x"],
    ["check", "x"],
    ["help", "build"],
    ["help", "test", "check"],
  ]) {
    assert.equal(tool.parse(argv).kind, "usage", argv.join(" "));
  }
});

test("test parses --only and --dry-run", () => {
  assert.deepEqual(tool.parse(["test", "--only", "core", "--dry-run"]), {
    kind: "run",
    command: "test",
    options: { only: "core", "dry-run": true },
    rest: [],
  });
});

test("check passes the arguments after -- to nix flake check", () => {
  const run = tool.parse(["check", "--dry-run", "--", "--print-build-logs", "-L"]);
  assert.deepEqual(run.rest, ["--print-build-logs", "-L"]);
  assert.deepEqual(tool.plan(run, []), {
    program: "nix",
    args: ["flake", "check", "--print-build-logs", "-L"],
  });
});

test("testFiles keeps the .test.js files, filtered and sorted", () => {
  const names = ["support", "settings.test.js", "core.test.js", "notes.md"];
  assert.deepEqual(tool.testFiles(names), ["test/core.test.js", "test/settings.test.js"]);
  assert.deepEqual(tool.testFiles(names, "set"), ["test/settings.test.js"]);
});

test("test plans node --test over the test files", () => {
  const step = tool.plan(tool.parse(["test"]), ["b.test.js", "a.test.js"]);
  assert.deepEqual(step, { program: process.execPath, args: ["--test", "test/a.test.js", "test/b.test.js"] });
});

test("test with an --only that matches nothing is an error", () => {
  assert.ok(tool.plan(tool.parse(["test", "--only", "nope"]), ["a.test.js"]).error);
});

test("describe quotes words a shell would split", () => {
  assert.equal(tool.describe({ program: "nix", args: ["flake", "check", "a b", "it's"] }),
    "nix flake check 'a b' 'it'\\''s'");
});
