const errBox = document.getElementById('err');
function fail(msg){ errBox.textContent = String(msg); throw new Error(msg); }
window.addEventListener('error', e => { errBox.textContent = 'Error: ' + e.message; });

// ---------- state ----------
const dpr = window.devicePixelRatio || 1;
const PIX = [2,3,4,6], DOTS = [['fine',4.5],['medium',6],['coarse',8]];
const S = { mode: 0, dots: 1, edges: true, pix: Math.max(0, PIX.indexOf(Math.max(2, Math.min(4, Math.round(dpr))))), pal: 0, raw: false, spin: true };
const PALS = [
  { name: 'Obra Dinn', dark: '#333319', light: '#e5ffff' },
  { name: '1-bit',     dark: '#000000', light: '#ffffff' },
  { name: 'Amber',     dark: '#1e1208', light: '#ffb000' },
  { name: 'LCD',       dark: '#0f380f', light: '#9bbc0f' },
];
const hex = h => [1,3,5].map(i => parseInt(h.substr(i,2),16)/255);
