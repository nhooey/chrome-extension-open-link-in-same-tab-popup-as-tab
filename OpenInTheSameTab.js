// get settings
chrome.storage.sync.get({
  // default value
  t1tab: true
}, function (items) {
  t1tab = items.t1tab;

  if (t1tab == true) {
    var a = document.getElementsByTagName("a");
    for (i = 0; i < a.length; i++) {
      var target = retargetedTarget(a[i].target);
      if (target != a[i].target) {
        a[i].target = target;
      }
    }
  }

});
