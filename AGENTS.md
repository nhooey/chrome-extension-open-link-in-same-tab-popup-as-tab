# Open link in same tab, pop-up as tab

A Chrome extension (Manifest V2) that opens pop-up windows as tabs and
makes links open in the same tab instead of a new one.

- `manifest.json`: the extension's manifest.
- `UseOneWindow.js`: the background script that turns pop-up windows
  into tabs.
- `OpenInTheSameTab.js`: the content script that retargets
  `target="_blank"` links to the same tab.
- `popup.html` and `popup.js`: the options pop-up, saving to
  `chrome.storage.sync`.
- `core.js`: the pure decisions the three scripts share, loaded before
  each of them.
- `defaults.json`: every setting at its default, shipped with the
  extension. `settings.schema.json` documents each setting and its type.
  `settings.js` loads the defaults, merges the user's
  `chrome.storage.sync` values over them and refuses an unknown key; no
  script carries a default of its own.
- `test/`: Node tests. `core.test.js` covers `core.js`; `scripts.test.js`
  runs the real scripts against the fake `chrome` API and DOM in
  `test/support/extension.js`; `manifest.test.js` checks the load
  order; `settings.test.js` checks the defaults file against the schema
  and the merge.
- `tools/extension.js`: the `extension` command in the dev shell.

## Build and test

There is no build step. `nix develop` puts the project's commands on
the `PATH`, listed by `menu`, and installs its agent skills into
`.agents/skills/`.

- `extension test`: runs the Node tests; `--only <text>` narrows them
  to the matching files.
- `extension check`: runs `nix flake check`, which runs the same tests
  in Nix.
- `extension --help`: lists the commands and their options.

The tool is `tools/extension.js`; `test/tools.test.js` covers its
argument parsing. To try the extension in Chrome, load the directory as
an unpacked extension at `chrome://extensions` with Developer mode on.
