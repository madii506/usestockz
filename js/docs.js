// docs: the shared shell plus a table of contents that follows the reader
import { $$ } from './util.js';
import { shell } from './shell.js';
shell({ page: 'docs' });
const links = $$('#toc a'), secs = links.map(a => document.querySelector(a.getAttribute('href')));
const spy = () => { let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.35) cur = i; }); links.forEach((a, i) => a.classList.toggle('on', i === cur)); };
addEventListener('scroll', spy, { passive: true }); spy();
