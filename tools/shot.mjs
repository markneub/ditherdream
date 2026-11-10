// Renders fixed camera angles to shots/*.png so changes can be checked visually.
// Usage: npm install && npm run shots   (set CHROME_PATH to use an installed Chrome)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const page = new URL('../index.html', import.meta.url).href;
const out = fileURLToPath(new URL('../shots/', import.meta.url));
mkdirSync(out, { recursive: true });

// [name, theta, phi, radius]
const VIEWS = [
  ['wide', 0.22, 1.2, 27],
  ['low-mast', 0.9, 1.45, 16],
  ['deck-close', -0.6, 1.0, 13],
  ['shadow-side', -1.05, 1.22, 27],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const p = await browser.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 3 });
let errors = 0;
p.on('pageerror', e => { errors++; console.log('pageerror:', e.message); });
await p.goto(page);
await p.evaluate(() => { __dbg.S.spin = false; });
await p.waitForTimeout(1500);
for (const [name, t, ph, r] of VIEWS) {
  await p.evaluate(([t, ph, r]) => __dbg.cam(t, ph, r), [t, ph, r]);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}${name}.png` });
}
await p.evaluate(() => { __dbg.S.mode = 1; }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}shadow-side-screen-bayer.png` });
await p.evaluate(() => { __dbg.S.mode = 0; __dbg.S.raw = true; }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}shadow-side-raw.png` });
const err = await p.textContent('#err');
if (err) { errors++; console.log('error box:', err); }
await browser.close();
console.log(errors ? 'FAILED' : `ok, wrote ${VIEWS.length + 2} shots to shots/`);
process.exit(errors ? 1 : 0);
