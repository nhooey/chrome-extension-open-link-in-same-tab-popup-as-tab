// Saves the one option the user changed to chrome.storage, so storage
// holds only the user's choices and later defaults still reach the rest.
function save_option(key, reload) {
  var items = {};
  items[key] = document.getElementById('cb_' + key).checked;

  chrome.storage.sync.set(items, function () {
    console.log('Options saved');
    if (reload == true) {
      chrome.runtime.reload();
    }

  });
}

// Restores select box and checkbox state using the preferences stored in chrome.storage.
window.onload = function restore_options() {
  loadSettings(function (settings) {
    document.getElementById('cb_t1pop').checked = settings.t1pop;
    document.getElementById('cb_t1foc').checked = settings.t1foc;
    document.getElementById('cb_t1tab').checked = settings.t1tab;
    console.log('Options restored');
  });
};

['t1pop', 't1foc', 't1tab'].forEach(function (key) {
  document.getElementById('cb_' + key).addEventListener('click', function () {
    save_option(key, optionNeedsReload(key));
  });
});
