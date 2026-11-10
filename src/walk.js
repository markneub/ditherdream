// ---------- first-person walking ----------
// Controls are a port of pacnw's (src/touch.js + player.js there): one thumb on touch,
// pointer lock + WASD on desktop. Yaw 0 faces -z; positive yaw turns left.

// Colliders per scene (keep in step with scene.js / hold.js). Circles: [x, z, r]; rects: [x, z, halfX, halfZ].
const DECK_CIRCLES = [[2,0,0.45],[5,4.6,0.55],[6.35,4.9,0.55],[5.7,3.5,0.55],[8.4,4.2,0.85],[-10.2,0.2,0.42],[-9.05,0,0.55],[-2.6,4.6,1.15]];
const DECK_RECTS = [[-1.6,-4.3,0.85,0.85],[0.2,-4.7,0.7,0.7],[4.5,-5.3,0.6,1.3],[8.5,-5.3,0.6,1.3]];
/** Height of the walkable surface at (x, z), or null where you can't stand (overboard, inside something). */
DECK.floorAt = (x, z) => {
  const az = Math.abs(z);
  if (x < -11.7 || x > 17 || az > Math.min(6.4, 7 * (18 - x) / 6 - 0.92)) return null;
  if (walkBlocked(x, z, DECK_CIRCLES, DECK_RECTS)) return null;
  if (x < -6) return 1.4;                                              // quarterdeck
  if (az < 1.5 && x < -4.5) return x < -5.5 ? 1.05 : x < -5 ? 0.7 : 0.35; // steps
  if (Math.abs(x - 7) < 1.6 && az < 1.6) return 0.22;                  // hatch
  return 0;
};
const HOLD_CIRCLES = [[2,0,0.47],[-9,0,0.14],[-5,0,0.14],[-1,0,0.14],[9,0,0.14],[-6.5,-3.05,0.22],[-6.5,-1.35,0.22],[3.3,1.6,0.2], ...BARRELS.map(b => [b[0], b[1], 0.55])];
const HOLD_RECTS = [[-1.85,-5.6,1.5,0.6],[3.5,-5.5,0.65,0.65],[4.9,-5.65,0.6,0.6],[-6.5,-2.2,0.9,0.45],[10.4,4.6,0.58,0.33], ...HAMMOCKS.map(h => [h[0], h[1], 1.25, 0.4])];
HOLD.floorAt = (x, z) => (Math.abs(x) > 11.7 || Math.abs(z) > 6.1 || walkBlocked(x, z, HOLD_CIRCLES, HOLD_RECTS)) ? null : FY;

// Ways between scenes: stepping into the open hatch on deck takes you below; walking into the ladder takes you up.
// Arrivals are outside both trigger zones, facing aft (yaw pi/2 looks along -x).
DECK.exit = p => (p.x > 5.6 && p.x < 6.7 && Math.abs(p.z) < 1.2) ? { scene: HOLD, x: 4.0, z: -1.0, yaw: Math.PI / 2 - 0.3 } : null;
HOLD.exit = p => (p.x > 4.55 && p.x < 5.5 && Math.abs(p.z) < 0.5) ? { scene: DECK, x: 4.6, z: 0, yaw: Math.PI / 2 } : null;
DECK.spawn = { x: 10.5, z: 0, yaw: Math.PI / 2 }; HOLD.spawn = { x: 4.0, z: -1.0, yaw: Math.PI / 2 - 0.3 };

let scene = DECK;
function floorAt(x, z, y) { return scene.floorAt(x, z, y); } // y: the height you're at now, for places with floors above each other

const player = {
  x: 10.5, z: 0, y: 0, yaw: Math.PI / 2, pitch: 0, vx: 0, vz: 0,
  stick: { x: 0, y: 0 },   // analog input: x strafe, y forward, length 0..1
  levelPitch: false,       // one-thumb steering: ease the view back to level
  spinX: 0,                // turn glide after a released look swipe (rad/s, decays)
  keys: new Set(), bob: 0, bobAmp: 0,
  look(dx, dy) { this.yaw -= dx; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy)); },
  canStand(x, z, from) { const h = floorAt(x, z, from); return h !== null && h - from <= WALK.stepUp && from - h <= WALK.drop; },
  update(dt) {
    if (this.spinX !== 0) { this.look(this.spinX * dt, 0); this.spinX *= Math.exp(-dt * 6); if (Math.abs(this.spinX) < 0.01) this.spinX = 0; }
    const k = this.keys;
    let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let running = k.has('ShiftLeft') || k.has('ShiftRight'), throttle = 1;
    const stickLen = Math.min(1, Math.hypot(this.stick.x, this.stick.y));
    if (stickLen > 0.12) { fwd = this.stick.y; strafe = this.stick.x; running = stickLen > 0.92; throttle = running ? 1 : Math.min(1, stickLen / 0.8); }
    if (this.levelPitch) this.pitch += (0 - this.pitch) * (1 - Math.exp(-dt * 3));
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let dx = -sy * fwd + cy * strafe, dz = -cy * fwd - sy * strafe;
    const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len; }
    const speed = (running ? WALK.run : WALK.speed) * throttle, blend = 1 - Math.exp(-dt * 10);
    this.vx += (dx * speed - this.vx) * blend; this.vz += (dz * speed - this.vz) * blend;
    const here = floorAt(this.x, this.z, this.y) ?? this.y;
    const nx = this.x + this.vx * dt; if (this.canStand(nx, this.z, here)) this.x = nx; else this.vx = 0;
    const nz = this.z + this.vz * dt; if (this.canStand(this.x, nz, here)) this.z = nz; else this.vz = 0;
    const floor = floorAt(this.x, this.z, this.y) ?? this.y;
    this.y += (floor - this.y) * (1 - Math.exp(-dt * 12));
    const v = Math.hypot(this.vx, this.vz);
    this.bobAmp += (Math.min(1, v / WALK.speed) - this.bobAmp) * (1 - Math.exp(-dt * 6));
    this.bob += dt * Math.PI * 2 * (1.5 + 0.35 * v);
  },
  eye() { return [this.x, this.y + WALK.eye + (Math.cos(this.bob) - 1) / 2 * 0.035 * this.bobAmp, this.z]; },
  dir() { const cp = Math.cos(this.pitch); return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp]; },
};

let view = 'orbit'; // 'orbit' | 'walk'

// ---- touch: one thumb (pacnw's scheme) ----
// Slide sideways to turn; how far up from where you touched sets your speed (near the top runs,
// pulling down backs up). Hold still for a moment and the drag becomes a free look instead.
// A second finger while walking is also a free look.
const THROTTLE_RANGE = 80, HOLD_MS = 260, HOLD_SLOP = 10;
const touch = { steerId: null, mode: null, ox: 0, oy: 0, steerLastX: 0, holdTimer: 0, last: { x: 0, y: 0, t: 0 }, velX: 0, lookId: null, lookLast: { x: 0, y: 0 } };
const lookCue = document.createElement('div'); lookCue.id = 'look-cue'; document.body.appendChild(lookCue);
const lookRate = () => 2.3 / Math.max(innerWidth, 320); // ~130 degrees per screen width

function touchStartLook() {
  if (touch.mode !== 'pending') return;
  touch.mode = 'look'; player.levelPitch = false;
  touch.last = { x: touch.ox, y: touch.oy, t: performance.now() }; touch.velX = 0;
  lookCue.classList.add('on');
}
function touchWalk(e) {
  player.look((e.clientX - touch.steerLastX) * lookRate(), 0); touch.steerLastX = e.clientX;
  const t = Math.max(-0.5, Math.min(1, (touch.oy - e.clientY) / THROTTLE_RANGE));
  player.stick.x = 0; player.stick.y = Math.abs(t) < 0.1 ? 0 : t;
}
canvas.addEventListener('pointerdown', e => {
  if (view !== 'walk' || e.pointerType === 'mouse') return;
  e.preventDefault();
  if (touch.steerId === null) {
    touch.steerId = e.pointerId; touch.mode = 'pending'; touch.ox = e.clientX; touch.oy = e.clientY;
    player.spinX = 0; clearTimeout(touch.holdTimer); touch.holdTimer = setTimeout(touchStartLook, HOLD_MS);
  } else if (touch.lookId === null && touch.mode === 'walk') {
    touch.lookId = e.pointerId; touch.lookLast = { x: e.clientX, y: e.clientY }; player.levelPitch = false;
  }
});
window.addEventListener('pointermove', e => {
  if (view !== 'walk') return;
  if (e.pointerId === touch.steerId) {
    if (touch.mode === 'pending') {
      if (Math.hypot(e.clientX - touch.ox, e.clientY - touch.oy) > HOLD_SLOP) {
        clearTimeout(touch.holdTimer); touch.mode = 'walk'; touch.steerLastX = touch.ox; // the slide so far counts as turning
        player.levelPitch = touch.lookId === null; touchWalk(e);
      }
    } else if (touch.mode === 'walk') touchWalk(e);
    else if (touch.mode === 'look') {
      const k = lookRate(), dx = (e.clientX - touch.last.x) * k, dy = (e.clientY - touch.last.y) * k;
      player.look(dx, dy);
      const now = performance.now(), dt = Math.max(1, now - touch.last.t) / 1000;
      touch.velX += (dx / dt - touch.velX) * 0.5;
      touch.last = { x: e.clientX, y: e.clientY, t: now };
    }
  } else if (e.pointerId === touch.lookId) {
    const k = lookRate(); player.look((e.clientX - touch.lookLast.x) * k, (e.clientY - touch.lookLast.y) * k);
    touch.lookLast = { x: e.clientX, y: e.clientY };
  }
}, { passive: false });
function touchEnd(e) {
  if (e.pointerId === touch.steerId) {
    clearTimeout(touch.holdTimer);
    const wasLook = touch.mode === 'look';
    // let go mid-swipe: keep turning briefly
    if (wasLook && performance.now() - touch.last.t < 80) player.spinX = Math.max(-3, Math.min(3, touch.velX));
    touch.steerId = null; touch.mode = null; lookCue.classList.remove('on');
    player.stick.x = 0; player.stick.y = 0;
    player.levelPitch = wasLook; // after a look, ease back to level
  } else if (e.pointerId === touch.lookId) { touch.lookId = null; player.levelPitch = touch.mode === 'walk'; }
}
window.addEventListener('pointerup', touchEnd); window.addEventListener('pointercancel', touchEnd);
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
function touchReset() { clearTimeout(touch.holdTimer); touch.steerId = touch.lookId = touch.mode = null; lookCue.classList.remove('on'); player.stick.x = player.stick.y = 0; }

// ---- desktop: click to capture the mouse, WASD / arrows to walk, Shift to run ----
let mouseDrag = false;
document.addEventListener('keydown', e => player.keys.add(e.code));
document.addEventListener('keyup', e => player.keys.delete(e.code));
window.addEventListener('blur', () => player.keys.clear());
canvas.addEventListener('mousedown', () => {
  if (view !== 'walk') return;
  mouseDrag = true;
  if (document.pointerLockElement !== canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
});
window.addEventListener('mouseup', () => { mouseDrag = false; });
document.addEventListener('mousemove', e => {
  if (view !== 'walk') return;
  // without pointer lock (some embeds refuse it) a held drag still looks around
  if (document.pointerLockElement === canvas || mouseDrag) player.look(e.movementX * 0.0022, e.movementY * 0.0022);
});
