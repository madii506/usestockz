// rolling digits: every digit is a column of 0-9 that slides to its new value, so live prices tick like an odometer
export function roll(el, text) {
  text = String(text);
  const same = el.dataset.shape === text.replace(/\d/g, '0');
  if (!same) {
    el.dataset.shape = text.replace(/\d/g, '0');
    el.innerHTML = [...text].map(ch => /\d/.test(ch)
      ? `<span class="dg"><span>${'0123456789'.split('').map(d => `<b>${d}</b>`).join('')}</span></span>`
      : `<span>${ch}</span>`).join('');
    requestAnimationFrame(() => roll(el, text));
    return;
  }
  const cols = el.querySelectorAll('.dg > span'); let i = 0;
  [...text].forEach(ch => { if (/\d/.test(ch)) { const c = cols[i++]; if (c) c.style.transform = `translateY(${-(+ch) * 10}%)`; } });
}
