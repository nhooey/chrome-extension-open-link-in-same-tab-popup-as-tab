# Open link in same tab, pop-up as tab

A Chrome extension (Manifest V2), downloaded from the Chrome Web Store
through Extpose, that opens pop-up windows as tabs and makes links open
in the same tab instead of a new one.

- `manifest.json`: the extension's manifest.
- `UseOneWindow.js`: the background script that turns pop-up windows
  into tabs.
- `OpenInTheSameTab.js`: the content script that retargets
  `target="_blank"` links to the same tab.
- `popup.html` and `popup.js`: the options pop-up, saving to
  `chrome.storage.sync`.

## Build and test

There is no build step and no test suite. Load the directory as an
unpacked extension at `chrome://extensions` with Developer mode on, and
try it by hand.

`nix develop` installs the project's agent skills into
`.agents/skills/`, and `nix flake check` checks the flake.
