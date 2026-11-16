// Pure decisions shared by the background script, the content script and
// the options pop-up. manifest.json and popup.html load this file before
// the scripts that use it; Node's tests load it through module.exports.

// The target a link should get: "_blank" links open in the same tab.
function retargetedTarget(target) {
  return target == "_blank" ? "_top" : target;
}

// Whether a newly created window is a pop-up to move into the main window.
function shouldMovePopup(windowType, movePopupsEnabled) {
  return windowType == "popup" && movePopupsEnabled == true;
}

// Whether a pop-up's tab may be moved: other extensions' pop-ups stay put.
function isMovableUrl(url) {
  return url.startsWith("chrome-extension://") == false;
}

// The window pop-ups move into after focus changes to focusedWindow.
function nextMainWindowId(mainWindowId, focusedWindow) {
  return focusedWindow.type == "normal" ? focusedWindow.id : mainWindowId;
}

// Whether changing an option has to reload the extension to take effect.
// The background script reads its options only once, at start-up.
function optionNeedsReload(key) {
  return key == "t1pop" || key == "t1foc";
}

if (typeof module === "object") {
  module.exports = {
    retargetedTarget,
    shouldMovePopup,
    isMovableUrl,
    nextMainWindowId,
    optionNeedsReload,
  };
}
