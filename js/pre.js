// runs before the page paints: the intro plays once per visit, and never blocks the page for long
(function () {
  try {
    var seen = sessionStorage.getItem('stockz:intro') === '1';
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!seen && !calm) {
      document.documentElement.classList.add('intro');
      var drop = function (force) { var i = document.getElementById('intro'); if (!force && i && i.classList.contains('intro-on')) return; document.documentElement.classList.remove('intro'); if (i) i.remove(); };
      setTimeout(function () { drop(false); }, 4500);   // the intro never started: show the page
      setTimeout(function () { drop(true); }, 12000);   // last resort
    }
  } catch (e) { }
})();
