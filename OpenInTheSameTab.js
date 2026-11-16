loadSettings(function (settings) {
  if (settings.t1tab == true) {
    var a = document.getElementsByTagName("a");
    for (var i = 0; i < a.length; i++) {
      var target = retargetedTarget(a[i].target);
      if (target != a[i].target) {
        a[i].target = target;
      }
    }
  }
});
