#!/usr/bin/env node
// extension: the development commands for this Chrome extension.
//
//   extension test [--only <text>]   run the Node tests in test/
//   extension check [-- <args>]      run `nix flake check`, the tests in Nix
//   extension help [<command>]       print help for the tool or a command
//
// Every command takes --dry-run, which prints the command it would run and
// exits. Exit status: 0 on success, 1 when the command run fails, 2 on bad
// usage.
//
// The functions down to `main` are pure: they parse arguments and plan the
// command to run. `main` reads the test directory, runs the plan and exits.

"use strict";

const { parseArgs } = require("node:util");

const TOOL = "extension";

const COMMANDS = {
  test: {
    summary: "Run the Node tests in test/",
    usage: `${TOOL} test [--only <text>] [--dry-run]`,
    options: {
      only: { type: "string", help: "run only test files whose name contains <text>" },
      "dry-run": { type: "boolean", help: "print the command and exit" },
    },
    example: `${TOOL} test --only settings`,
  },
  check: {
    summary: "Run nix flake check: the tests, built in Nix",
    usage: `${TOOL} check [--dry-run] [-- <nix flake check arguments>]`,
    options: {
      "dry-run": { type: "boolean", help: "print the command and exit" },
    },
    example: `${TOOL} check -- --print-build-logs`,
  },
  help: {
    summary: "Print help for the tool or one command",
    usage: `${TOOL} help [<command>]`,
    options: {},
    example: `${TOOL} help test`,
  },
};

function toolHelp() {
  const width = Math.max(...Object.keys(COMMANDS).map((name) => name.length));
  const lines = Object.entries(COMMANDS).map(
    ([name, command]) => `  ${name.padEnd(width)}  ${command.summary}`,
  );
  return [
    `Usage: ${TOOL} <command> [options]`,
    "",
    "Development commands for the Chrome extension.",
    "",
    "Commands:",
    ...lines,
    "",
    "Options:",
    "  -h, --help  print help; after a command, that command's help",
    "",
    "Exit status: 0 on success, 1 when the command run fails, 2 on bad usage.",
    "",
    `Example: ${COMMANDS.test.example}`,
  ].join("\n");
}

function commandHelp(name) {
  const command = COMMANDS[name];
  const options = Object.entries({
    ...command.options,
    help: { short: "h", help: "print this help" },
  }).map(([option, spec]) => {
    const flag = spec.short ? `-${spec.short}, --${option}` : `    --${option}`;
    const value = spec.type === "string" ? " <text>" : "";
    return `  ${(flag + value).padEnd(24)}${spec.help}`;
  });
  return [
    `Usage: ${command.usage}`,
    "",
    `${command.summary}.`,
    "",
    "Options:",
    ...options,
    "",
    `Example: ${command.example}`,
  ].join("\n");
}

// Parse argv (without node and the script) into one of:
//   { kind: "help", text }
//   { kind: "run", command, options, rest }
//   { kind: "usage", message }   bad usage, exit 2
function parse(argv) {
  const [name, ...args] = argv;
  if (name === undefined || name === "-h" || name === "--help") {
    return { kind: "help", text: toolHelp() };
  }
  const command = COMMANDS[name];
  if (!command) {
    return { kind: "usage", message: `unknown command: ${name}\n\n${toolHelp()}` };
  }
  if (name === "help") {
    const [topic, ...extra] = args;
    if (topic === "-h" || topic === "--help") {
      return { kind: "help", text: commandHelp("help") };
    }
    if (extra.length > 0 || (topic !== undefined && !COMMANDS[topic])) {
      return { kind: "usage", message: `${TOOL} help takes one command name\n\n${toolHelp()}` };
    }
    return { kind: "help", text: topic === undefined ? toolHelp() : commandHelp(topic) };
  }
  const options = Object.fromEntries(
    Object.entries({ ...command.options, help: { type: "boolean", short: "h" } }).map(
      ([option, spec]) => [option, { type: spec.type ?? "boolean", ...(spec.short && { short: spec.short }) }],
    ),
  );
  let parsed;
  try {
    parsed = parseArgs({ args, options, allowPositionals: true, tokens: true });
  } catch (error) {
    return { kind: "usage", message: `${error.message}\n\n${commandHelp(name)}` };
  }
  if (parsed.values.help) {
    return { kind: "help", text: commandHelp(name) };
  }
  const separator = parsed.tokens.find((token) => token.kind === "option-terminator");
  const beforeSeparator = separator
    ? parsed.tokens.filter((token) => token.kind === "positional" && token.index < separator.index)
    : parsed.tokens.filter((token) => token.kind === "positional");
  if (beforeSeparator.length > 0) {
    return {
      kind: "usage",
      message: `unexpected argument: ${beforeSeparator[0].value}\n\n${commandHelp(name)}`,
    };
  }
  const rest = separator ? args.slice(separator.index + 1) : [];
  if (rest.length > 0 && name !== "check") {
    return { kind: "usage", message: `${TOOL} ${name} takes no arguments after --\n\n${commandHelp(name)}` };
  }
  return { kind: "run", command: name, options: { ...parsed.values }, rest };
}

// The test files to run, from the names in test/, in a stable order.
function testFiles(names, only) {
  return names
    .filter((file) => file.endsWith(".test.js"))
    .filter((file) => only === undefined || file.includes(only))
    .sort()
    .map((file) => `test/${file}`);
}

// The command a parsed "run" stands for, as { program, args }, or
// { error } when there is nothing to run.
function plan(run, testDirectory) {
  if (run.command === "test") {
    const files = testFiles(testDirectory, run.options.only);
    if (files.length === 0) {
      return { error: `no test file in test/ matches: ${run.options.only}` };
    }
    return { program: process.execPath, args: ["--test", ...files] };
  }
  return { program: "nix", args: ["flake", "check", ...run.rest] };
}

function quote(word) {
  return /^[\w./=:@%+-]+$/.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`;
}

function describe(step) {
  return [step.program, ...step.args].map(quote).join(" ");
}

function main(argv) {
  const fs = require("node:fs");
  const path = require("node:path");
  const { spawnSync } = require("node:child_process");

  const parsed = parse(argv);
  if (parsed.kind === "help") {
    console.log(parsed.text);
    return 0;
  }
  if (parsed.kind === "usage") {
    console.error(`${TOOL}: ${parsed.message}`);
    return 2;
  }
  const root = path.resolve(__dirname, "..");
  const step = plan(parsed, fs.readdirSync(path.join(root, "test")));
  if (step.error) {
    console.error(`${TOOL}: ${step.error}`);
    return 1;
  }
  if (parsed.options["dry-run"]) {
    console.log(describe(step));
    return 0;
  }
  const result = spawnSync(step.program, step.args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(`${TOOL}: cannot run ${step.program}: ${result.error.message}`);
    return 1;
  }
  return result.status === 0 ? 0 : 1;
}

module.exports = { COMMANDS, parse, testFiles, plan, describe, toolHelp, commandHelp };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
