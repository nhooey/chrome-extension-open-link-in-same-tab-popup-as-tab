// Saves options to chrome.storage
function save_options(reload) {
  var t1pop = document.getElementById('cb_t1pop').checked;
  var t1foc = document.getElementById('cb_t1foc').checked;
  var t1tab = document.getElementById('cb_t1tab').checked;

  chrome.storage.sync.set({
    t1pop: t1pop,
    t1foc: t1foc,
    t1tab: t1tab
  }, function () {
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
    save_options(optionNeedsReload(key));
  });
});
