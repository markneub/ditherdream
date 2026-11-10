// ---------- below decks: the hold, lit by swinging lanterns and moonlight through the hatch ----------
// Same ship coordinates as the deck above: the deck's underside is the ceiling (y = -0.2), the hatch at
// (7, 0) is the opening, the mast comes down through at (2, 0). Floor at FY.
const FY=-2.6;
beginScene();
for(let i=0;i<14;i++) add(box(24,0.2,1),[0,FY-0.1,-6.5+i],[0,0,0],0.62+0.06*((i*5)%3));   // floor planks
// ceiling = the deck, open at the hatch (x 5.7..8.3, z +-1.3)
add(box(17.7,0.2,14),[-3.15,-0.1,0],[0,0,0],0.6); add(box(3.7,0.2,14),[10.15,-0.1,0],[0,0,0],0.6);
for(const z of [-4.15,4.15]) add(box(2.6,0.2,5.7),[7,-0.1,z],[0,0,0],0.6);
// grating over the forward part of the hatch; the aft part is open for the ladder
for(let x=6.84;x<8.3;x+=0.28) add(box(0.1,0.08,2.6),[x,-0.04,0],[0,0,0],0.85);
for(const z of [-0.45,0.45]) add(box(1.6,0.08,0.08),[7.5,-0.04,z],[0,0,0],0.85);
// deck beams, and a rib down each side under every beam
for(let x=-11;x<=11;x+=2){ if(x!==7) add(box(0.26,0.28,13.4),[x,-0.34,0],[0,0,0],0.72);
  for(const sg of [1,-1]) add(box(0.22,2.4,0.3),[x,-1.4,sg*6.55],[0,0,0],0.75); }
for(const z of [-1.42,1.42]) add(box(3.0,0.24,0.2),[7,-0.32,z],[0,0,0],0.72);            // carlings round the hatch
// hull sides (with a stringer along each) and end bulkheads
for(const sg of [1,-1]){ add(box(24,2.6,0.3),[0,-1.4,sg*6.85],[0,0,0],0.5); add(box(24,0.26,0.1),[0,-1.5,sg*6.66],[0,0,0],0.7); }
for(const sg of [1,-1]) add(box(0.3,2.6,14),[sg*12.15,-1.4,0],[0,0,0],0.55);
// pillars and the mast
for(const x of [-9,-5,-1,9]) add(cyl(0.11,0.13,2.12,10),[x,-1.54,0],[0,0,0],0.7);
add(cyl(0.42,0.45,2.4,18),[2,-1.4,0],[0,0,0],0.62);
// hammocks, port side
const HAMMOCKS=[[-8,3.2],[-4,3.4],[-8,5.1],[-4,5.0],[0,4.4]];
for(const [x,z] of HAMMOCKS) add(sling(2.7,0.95,0.6),[x,-0.62,z],[0,0,0],0.95);
// stores, starboard side
const BARRELS=[[-10.6,-5.6],[-9.4,-5.6],[-8.2,-5.6],[-9.9,-4.5],[9.6,-5.5],[10.7,-4.6]];
for(const [x,z] of BARRELS) add(cyl(0.55,0.55,1.4,18),[x,FY+0.7,z],[0,0,0],0.78);
for(const [x,y] of [[-2.6,0.55],[-1.1,0.55],[-1.85,1.5]]) add(cyl(0.55,0.55,1.4,18),[x,FY+y,-5.6],[0,0,HP],0.78);   // lying stack
add(box(1.2,1.2,1.2),[3.5,FY+0.6,-5.5],[0,0.1,0],0.9); add(box(1.0,1.0,1.0),[4.9,FY+0.5,-5.65],[0,-0.25,0],0.8);
add(box(0.9,0.9,0.9),[3.6,FY+1.65,-5.5],[0,0.5,0],0.95);
// mess table under the first lantern
add(box(1.8,0.08,0.9),[-6.5,FY+0.78,-2.2],[0,0,0],0.9);
for(const dx of [-0.8,0.8]) for(const dz of [-0.36,0.36]) add(box(0.08,0.74,0.08),[-6.5+dx,FY+0.37,-2.2+dz],[0,0,0],0.7);
for(const z of [-3.05,-1.35]) add(cyl(0.2,0.2,0.46,12),[-6.5,FY+0.23,z],[0,0,0],0.75);
add(cyl(0.05,0.05,0.12,10),[-6.2,FY+0.88,-2.35],[0,0,0],1); add(cyl(0.03,0.055,0.3,10),[-6.9,FY+0.97,-2.1],[0,0,0],0.5);
add(cyl(0.15,0.15,0.02,14),[-6.5,FY+0.83,-2.05],[0,0,0],1);
// sea chest and a bucket
add(box(1.1,0.5,0.6),[10.4,FY+0.25,4.6],[0,0,0],0.7); add(box(1.16,0.14,0.66),[10.4,FY+0.57,4.6],[0,0,0],0.9);
add(cyl(0.2,0.15,0.3,12),[3.3,FY+0.15,1.6],[0,0,0],0.8);
// ladder up to the hatch: foot at x 4.75, head at the hatch's aft edge
for(const z of [-0.3,0.3]) add(box(0.08,2.95,0.08),[5.26,FY+1.38,z],[0,0,-0.355],0.85);
for(let t=0.1;t<0.95;t+=0.125) add(box(0.06,0.05,0.6),[4.75+t*1.03,FY+t*2.78,0],[0,0,0],0.85);
// lanterns hung from the beams
const holdLamps=[lantern([-7,-0.48,-2.2],0.24,0,2.8,11), lantern([1,-0.48,2.6],0.24,2.1,2.7,11), lantern([9,-0.48,-2.4],0.24,4.2,2.6,10)];
for(const l of holdLamps) add(box(0.05,0.1,0.05),[l.pivot[0],l.pivot[1]+0.03,l.pivot[2]],[0,0,0],0.6);

const HOLD=endScene({ name:'hold', title:'Below decks', sky:0.3, fill:0.1, tip:'the ladder leads back up' });
HOLD.lamps.push(...holdLamps);
