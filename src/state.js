const errBox = document.getElementById('err');
function fail(msg){ errBox.textContent = String(msg); throw new Error(msg); }
window.addEventListener('error', e => { errBox.textContent = 'Error: ' + e.message; });

// ---------- settings (fixed look; S holds dev switches for debugging, there is no UI for them) ----------
const dpr = window.devicePixelRatio || 1;
const PIXEL = Math.max(1, Math.round(dpr * 2 / 3)); // device pixels per scene pixel (2 on a 3x phone)
const DOT_SPACING = 4.5;                             // on-screen dot spacing, in scene pixels
const DARK = [0, 0, 0], LIGHT = [1, 1, 1];
const S = { mode: 0, edges: true, raw: false, spin: true }; // mode 1 = screen-space Bayer, for comparison; 2 = the Atkinson-like look
const ATK_SPACING = 2.4;                             // its lattice spacing, in scene pixels (dots are about 1.7 px squares)
if (new URLSearchParams(location.search).get('dither') === 'atkinson') S.mode = 2;
