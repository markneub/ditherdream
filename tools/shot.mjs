// Renders fixed views of every scene to shots/*.png and runs the walk tests, so changes can be checked.
// Usage: npm install && npm run shots            (set CHROME_PATH to use an installed Chrome)
//        npm run shots -- forest                 only views whose name starts with "forest" (skips the walk tests)
//        npm run shots -- tests                  only the walk tests
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

// The page is served over http (not opened from file://) because the model scene fetches its files.
const root = fileURLToPath(new URL('../', import.meta.url));
const MIME = { html: 'text/html', js: 'text/javascript', json: 'application/json', gltf: 'model/gltf+json', jpg: 'image/jpeg', png: 'image/png' };
const server = createServer((q, res) => {
  const f = decodeURIComponent(new URL(q.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  try { if (f.includes('..')) throw 0; const body = readFileSync(root + f); res.writeHead(200, { 'content-type': MIME[f.split('.').pop()] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const page = `http://127.0.0.1:${server.address().port}/index.html` + (process.env.DITHER ? `?dither=${process.env.DITHER}` : ''); // DITHER=atkinson npm run shots
const out = fileURLToPath(new URL('../shots/', import.meta.url));
mkdirSync(out, { recursive: true });

// orbit views: [name, scene, theta, phi, radius]
const VIEWS = [
  ['deck-wide', 'deck', 0.22, 1.2, 27], ['deck-shadow-side', 'deck', -1.05, 1.22, 27],
  ['anchor-wide', 'anchor', 0.75, 1.25, 38], ['anchor-shadow-side', 'anchor', -1.05, 1.3, 36], ['anchor-close', 'anchor', 0.4, 1.0, 18],
  ['lighthouse-orbit', 'lighthouse', 0.6, 1.25, 62], ['lighthouse-low', 'lighthouse', 2.4, 1.45, 40],
  ['forest-orbit', 'forest', 0.5, 0.95, 40], ['ruins-orbit', 'ruins', 0.9, 1.15, 50], ['ruins-low', 'ruins', -0.7, 1.42, 34],
];
// on foot: [name, scene, x, z, yaw, pitch, y]
const WALKS = [
  ['deck-bow', 'deck', 10.5, 0, 1.571, 0], ['deck-quarterdeck', 'deck', -11, 3, -1.9, -0.1],
  ['anchor-deck', 'anchor', -4.6, 0.9, -1.571, 0], ['anchor-aft', 'anchor', 3.0, -1.3, 1.571, 0.1], ['anchor-up', 'anchor', -3.6, -1.1, -1.2, 0.75], ['anchor-quarterdeck', 'anchor', -7.2, 0.9, -1.75, -0.2, 3.1],
  ['office-reception', 'office', -17.6, 12.6, -1.571, 0], ['office-hall', 'office', -8.5, 12.5, -1.4, 0], ['office-clock', 'office', -13, 12.9, 3.1416, 0.22], ['office-door', 'office', -15, 10, 3.1416, 0], ['office-farm', 'office', -18.5, 0.5, -1.571, 0], ['office-cubicle', 'office', -14.2, -6.3, 2.72, -0.3],
  ['office-corridor', 'office', 1.5, -8.5, -1.571, 0], ['office-lone', 'office', 12.6, 12.7, -1.2, -0.25], ['office-meeting', 'office', -10.2, -8.2, 1.1, -0.1], ['office-office', 'office', 10.5, 0.6, -1.571, -0.05],
  ['rush-run', 'rush', 0, 0, 0, 0], ['bounce-start', 'bounce', 0, 0, 0, 0],
  ['hold-arrive', 'hold', 4.0, -1.0, 1.271, 0], ['hold-hammocks', 'hold', -2, 1.6, 2.2, 0.05], ['hold-ladder', 'hold', 2.2, -2.4, -1.95, 0.3],
  ['lighthouse-door', 'lighthouse', 9.5, 0, 1.571, 0.25], ['lighthouse-stairs', 'lighthouse', 1.3, -0.9, 1.9, 0.35, 0], ['lighthouse-lamp', 'lighthouse', 1.2, -1.0, 1.0, 0.1, 16], ['lighthouse-gallery', 'lighthouse', 1.9, -2.35, -2.2, -0.2, 16],
  ['forest-path', 'forest', 24, 0, 1.571, 0], ['forest-fire', 'forest', 4.5, -1.5, 1.2, 0], ['forest-deep', 'forest', -14, -12, -2.2, 0.15],
  ['cathedral-nave', 'cathedral', -17.5, 0, -1.571, 0.12], ['cathedral-aisle', 'cathedral', -6, -5.5, -1.1, 0.2], ['cathedral-altar', 'cathedral', 12, 0.2, -1.571, 0.1],
  ['train-aisle', 'train', -7.9, 0, -1.571, 0], ['train-window', 'train', 1, 0.2, 0.5, 0], ['train-back', 'train', 7.5, 0, 1.571, 0.05],
  ['ruins-approach', 'ruins', 24, 2.5, 1.571, 0.1], ['ruins-inside', 'ruins', 8, 0, 1.571, 0.2, 1.2], ['ruins-gate', 'ruins', 17, -17, 0, 0.1],
];
const only = process.argv[2];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const p = await browser.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 3 });
let errors = 0, shots = 0;
p.on('pageerror', e => { errors++; console.log('pageerror:', e.message); });
p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || /GL_INVALID|GL ERROR|WebGL: INVALID/.test(t)) && !/GPU stall/.test(t)) console.log('console:', t); });
await p.goto(page);
await p.waitForTimeout(1500);
if (await p.textContent('#err')) { console.log('error box:', await p.textContent('#err')); process.exit(1); }
await p.evaluate(() => { __dbg.S.spin = false; });
await p.evaluate(() => Promise.all(Object.values(__dbg.scenes).filter(s => s.load).map(s => s.load()))); // fetch the models before any shot or test needs them
const snap = async name => { await p.evaluate(() => { document.getElementById('hint').style.display = 'none'; const f = document.getElementById('fade'); f.style.transition = 'none'; f.style.opacity = 0; }); await p.waitForTimeout(700); await p.screenshot({ path: `${out}${name}.png` }); shots++; };
for (const [name, sc, t, ph, r] of VIEWS) { if (only && !name.startsWith(only)) continue;
  await p.evaluate(([sc, t, ph, r]) => { __dbg.setScene(__dbg.scenes[sc]); __dbg.setView('orbit'); __dbg.cam(t, ph, r); }, [sc, t, ph, r]); await snap(name); }
for (const [name, sc, x, z, yaw, pitch, y] of WALKS) { if (only && !name.startsWith(only)) continue;
  await p.evaluate(a => __dbg.walk(a[1], a[2], a[3], a[4], a[0], a[5]), [sc, x, z, yaw, pitch, y]); await snap(name); }

if (!only || only === 'tests') {
  // Walk tests, simulated at 60 steps/s.
  const res = await p.evaluate(() => {
    const P = __dbg.player, S = __dbg.scenes, bad = [];
    const run = (sc, x, z, yaw, s) => { __dbg.walk(x, z, yaw, 0, sc); P.keys.add('KeyW'); for (let i = 0; i < s * 60; i++) P.update(1 / 60); P.keys.clear(); return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +P.y.toFixed(2), floor: floorAt(P.x, P.z, P.y) }; };
    // deck: aft past the mast and up the steps to the stern rail; into the side rail; to the bow; not off the quarterdeck edge
    const aft = run('deck', 10.5, 1.2, 1.571, 14), rail = run('deck', 0, 3, 3.1416, 6), bow = run('deck', 10, 0.5, -1.571, 8), edge = run('deck', -8, 4, -1.571, 5);
    if (aft.y < 1.39 || aft.x > -11 || Math.abs(rail.z) > 6.41 || edge.y < 1.39 || [aft, rail, bow, edge].some(r => r.floor === null)) bad.push({ deck: { aft, rail, bow, edge } });
    // down the hatch and back up the ladder
    __dbg.walk(4.6, 0.2, -1.571, 0, 'deck'); P.keys.add('KeyW'); let down = null, up = null;
    for (let i = 0; i < 300 && !down; i++) { P.update(1 / 60); const go = S.deck.exit(P); if (go) down = go.scene.name; }
    __dbg.walk(3.9, 0, -1.571, 0, 'hold');
    for (let i = 0; i < 300 && !up; i++) { P.update(1 / 60); const go = S.hold.exit(P); if (go) up = go.scene.name; }
    P.keys.clear(); if (down !== 'hold' || up !== 'deck') bad.push({ hatch: { down, up } });
    // lighthouse: in at the door, round the stair to the lamp room (heading for a point a little further round each step), out onto the gallery
    __dbg.walk(9.5, 0, 1.571, 0, 'lighthouse'); P.keys.add('KeyW');
    for (let i = 0; i < 60 * 12 && Math.hypot(P.x, P.z) > 1.5; i++) P.update(1 / 60);
    for (let i = 0; i < 60 * 120 && P.y < 15.95; i++) { const th = Math.atan2(P.z, P.x) + 0.5, tx = 1.25 * Math.cos(th), tz = 1.25 * Math.sin(th); P.yaw = Math.atan2(-(tx - P.x), -(tz - P.z)); P.update(1 / 60); }
    const climbed = +P.y.toFixed(2);
    const step = () => { const th = Math.atan2(P.z, P.x) + 0.5, tx = 1.25 * Math.cos(th), tz = 1.25 * Math.sin(th); P.yaw = Math.atan2(-(tx - P.x), -(tz - P.z)); P.update(1 / 60); };
    for (let i = 0; i < 90; i++) step();                                                  // on round, clear of the stair well
    const gd = GDOOR;
    for (const k of [1.3, 3.15]) for (let i = 0; i < 60 * 5; i++) { const gx = k * Math.cos(gd), gz = k * Math.sin(gd); if (Math.hypot(gx - P.x, gz - P.z) < 0.1) break; P.yaw = Math.atan2(-(gx - P.x), -(gz - P.z)); P.update(1 / 60); }
    const gallery = { r: +Math.hypot(P.x, P.z).toFixed(2), y: +P.y.toFixed(2) }; P.keys.clear();
    if (climbed < 15.95 || gallery.r < 2.6 || gallery.r > 3.31 || gallery.y < 15.9) bad.push({ lighthouse: { climbed, gallery } });
    // the anchored ship: up the ladder to the quarterdeck, and not through the bulwark
    const qd = run('anchor', -4.2, -0.65, 1.571, 4), fc = run('anchor', 2.6, -0.8, -1.571, 4), side = run('anchor', -2, 1, 3.1416, 4);
    if (qd.y < 3 || qd.x > -5.6 || fc.y < 2.9 || fc.x < 4 || Math.abs(side.z) > 2.3 || side.y > 2.1) bad.push({ anchor: { qd, fc, side } });
    // the office: every room can be reached on foot from the spawn (flood fill over floorAt on a 20 cm grid)
    { const f = S.office.floorAt, k = (i, j) => i * 1000 + j, seen = new Set(), q = [[Math.round(S.office.spawn.x / 0.2), Math.round(S.office.spawn.z / 0.2)]];
      seen.add(k(...q[0]));
      while (q.length) { const [i, j] = q.pop(); for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (!seen.has(k(a, b)) && f(a * 0.2, b * 0.2) !== null) { seen.add(k(a, b)); q.push([a, b]); } }
      const rooms = { hall: [0, 11], lone: [12, 12], farm: [-18.4, 0], corridor: [7.6, 0], officeN: [12, -4.6], officeM: [12, 0.8], officeS: [12, 4.6], meeting: [-11, -13], breakRoom: [-3, -11], long: [15, -8.4], store: [12, -12.6], aisle: [-10, 0], bay: [-10.1, -4.6] };
      const lost = Object.keys(rooms).filter(n => !seen.has(k(Math.round(rooms[n][0] / 0.2), Math.round(rooms[n][1] / 0.2))));
      if (lost.length) bad.push({ office: { unreachable: lost } }); }
    // tunnel run: a bot that reads the next gate and steers or inverts gets through ten; flying straight on without input crashes
    { const sc = S.rush, play = bot => { __dbg.setScene(sc); for (let i = 0; i < 60 * 40 && R.state === 'run' && R.score < 10; i++) {
        if (bot) { const g = R.gates.filter(g => g.d > R.dist).sort((a, b) => a.d - b.d)[0], ok = sc.invert ? 'B' : 'A';
          let q = [...g.pat].findIndex(c => c === '.' || c === ok); if (q < 0) { sc.invert = !sc.invert; q = 0; }
          R.x = q % 2 ? 1.5 : -1.5; R.y = 3.5 + (q < 2 ? 1.5 : -1.5); }
        sc.update(0, 1 / 60); } return { score: R.score, state: R.state }; };
      const good = play(true), idle = play(false);
      if (good.score < 10 || idle.state !== 'dead') bad.push({ rush: { good, idle } }); }
    // bounce: a bot that turns the tower so a platform of the level below the falling ball is under it climbs 12 levels
    { __dbg.setScene(S.bounce); for (let i = 0; i < 60 * 60 && BS.state === 'run' && BS.score < 12; i++) {
        if (BS.vy < 0) { const lv = Math.floor((BS.y - BO.BALL) / BO.SP + 1e-6); if (lv > 0) { const p = boLevel(lv)[0]; BS.ang = BO.WID[p.w] / 2 - Math.PI / 2 - p.a; } }
        S.bounce.update(0, 1 / 60); }
      if (BS.score < 12) bad.push({ bounce: { score: BS.score, state: BS.state } }); }
    // every scene: the spawn is standable, and walking straight ahead for a while never leaves the floor
    for (const name in S) { const sp = S[name].spawn, r = run(name, sp.x, sp.z, sp.yaw, 20); if (r.floor === null) bad.push({ [name]: r }); }
    __dbg.setScene(S.deck); return bad;
  });
  if (res.length) { errors++; console.log('walk tests FAILED', JSON.stringify(res)); } else console.log('walk tests ok');
}
const err = await p.textContent('#err');
if (err) { errors++; console.log('error box:', err); }
await browser.close(); server.close();
console.log(errors ? 'FAILED' : `ok, wrote ${shots} shots to shots/`);
process.exit(errors ? 1 : 0);
