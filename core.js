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

// Throws unless settings has exactly the schema's keys, each of its type.
// The schema's types are those typeof names, such as "boolean".
function validateSettings(schema, settings) {
  var known = Object.keys(schema.properties);
  Object.keys(settings).forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(schema.properties, key)) {
      throw new Error('Unknown setting "' + key + '"; the settings are: ' +
        known.join(", "));
    }
    var type = schema.properties[key].type;
    if (typeof settings[key] !== type) {
      throw new Error('Setting "' + key + '" must be a ' + type + ", not " +
        JSON.stringify(settings[key]));
    }
  });
  known.forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) {
      throw new Error('Setting "' + key + '" has no value');
    }
  });
}

// The settings in effect: the defaults with the stored values over them,
// key by key. An unknown stored key or a value of the wrong type is
// refused rather than silently ignored.
function mergeSettings(schema, defaults, stored) {
  var merged = {};
  [defaults, stored].forEach(function (layer) {
    Object.keys(layer).forEach(function (key) {
      merged[key] = layer[key];
    });
  });
  validateSettings(schema, merged);
  return merged;
}

if (typeof module === "object") {
  module.exports = {
    retargetedTarget,
    shouldMovePopup,
    isMovableUrl,
    nextMainWindowId,
    optionNeedsReload,
    validateSettings,
    mergeSettings,
  };
}
