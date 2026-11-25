// runs before the page paints: the intro plays once per visit, and never blocks the page for long
(function () {
  try {
    var seen = sessionStorage.getItem('stockz:intro') === '1';
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!seen && !calm) { document.documentElement.classList.add('intro'); setTimeout(function () { document.documentElement.classList.remove('intro'); var i = document.getElementById('intro'); if (i) i.remove(); }, 6000); }
  } catch (e) { }
})();
