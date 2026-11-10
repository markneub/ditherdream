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
// on foot: [name, x, z, yaw, pitch]
await p.evaluate(() => __dbg.setView('walk'));
for (const [name, x, z, yaw, pitch] of [['walk-bow', 10.5, 0, 1.571, 0], ['walk-steps', -2, 0.3, 1.571, 0.05], ['walk-quarterdeck', -11, 3, -1.9, -0.1], ['walk-lantern', 4.5, -2.2, 0.9, 0.1]]) {
  await p.evaluate(a => __dbg.walk(...a), [x, z, yaw, pitch]);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}${name}.png` });
}
// collision check (simulated, 60 steps/s): from the bow, walking aft at z = 1.2 must pass the mast, climb the
// steps and stop at the stern rail on the quarterdeck; walking at the rail must never leave the deck
const end = await p.evaluate(() => {
  const P = __dbg.player, run = (x, z, yaw, s) => { __dbg.walk(x, z, yaw); P.vx = P.vz = 0; P.keys.add('KeyW'); for (let i = 0; i < s * 60; i++) P.update(1 / 60); P.keys.clear(); return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +P.y.toFixed(2), floor: floorAt(P.x, P.z) }; };
  return { aft: run(10.5, 1.2, 1.571, 14), rail: run(0, 3, 3.1416, 6), bow: run(10, 0.5, -1.571, 8), offQuarterdeck: run(-8, 4, -1.571, 5) };
});
console.log('walk test', JSON.stringify(end));
const bad = Object.values(end).some(r => r.floor === null) || end.aft.y < 1.39 || end.aft.x > -11 || Math.abs(end.rail.z) > 6.41 || end.offQuarterdeck.y < 1.39;
if (bad) { errors++; console.log('walk test FAILED'); }
await p.evaluate(() => __dbg.setView('orbit')); await p.waitForTimeout(300);
await p.evaluate(() => { __dbg.S.mode = 1; }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}shadow-side-screen-bayer.png` });
await p.evaluate(() => { __dbg.S.mode = 0; __dbg.S.raw = true; }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}shadow-side-raw.png` });
const err = await p.textContent('#err');
if (err) { errors++; console.log('error box:', err); }
await browser.close();
console.log(errors ? 'FAILED' : `ok, wrote ${VIEWS.length + 6} shots to shots/`);
process.exit(errors ? 1 : 0);
