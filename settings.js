// Loads the settings in effect: the shipped defaults.json with the user's
// chrome.storage.sync values merged over it, checked against
// settings.schema.json. The defaults live only in defaults.json; no script
// carries a fallback of its own.
function loadSettings(callback) {
  Promise.all(["settings.schema.json", "defaults.json"].map(function (file) {
    return fetch(chrome.runtime.getURL(file)).then(function (response) {
      return response.json();
    });
  })).then(function (files) {
    chrome.storage.sync.get(null, function (stored) {
      callback(mergeSettings(files[0], files[1], stored));
    });
  });
}
