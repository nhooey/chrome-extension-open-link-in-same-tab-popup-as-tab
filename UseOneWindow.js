// background script

loadSettings(function (settings) {

  // open pop-up as a tab
  chrome.windows.getCurrent({}, function (w) {
    var mainwindow = w.id;
    chrome.windows.onCreated.addListener(function (w) {
      if (shouldMovePopup(w.type, settings.t1pop)) {
        chrome.windows.get(w.id, {populate: true}, function (w) {

          chrome.tabs.query({
            active: true,
            windowId: w.id
          }, function (tabs) {
            var t1popUrl = tabs[0].url;
            if (isMovableUrl(t1popUrl)) {
              chrome.tabs.move(w.tabs[0].id, {windowId: mainwindow, index: -1}, function () {
                chrome.tabs.update(w.tabs[0].id, {active: settings.t1foc /* focus new window or not */});
              });
            }

          });
        });
      }
    });

    chrome.windows.onFocusChanged.addListener(function (w) {
      chrome.windows.get(w, {}, function (w) {
        mainwindow = nextMainWindowId(mainwindow, w);
      });
    });
  });
});
