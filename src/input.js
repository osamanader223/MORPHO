import { $ } from './env.js';
import { now, tap, replay } from './timeline.js';
import { quietHint } from './ui.js';

var hero = $('hero');

/* ---------------- input ---------------- */
// read by the frame loop through live imports; only this module writes them
export var ptr = { x:-1e4, y:-1e4, on:false }, mx = .5, my = .5;
export var rotY = -.35, rotX = 0, vY = .0, vX = 0, ptrF = 0;
var drag = false, decided = null, sx=0, sy=0, lx=0, ly=0, t0=0, moved=0;

export function initInput(){
  $('replay').addEventListener('click', replay);
  window.addEventListener('pointermove', function(e){ mx = e.clientX/window.innerWidth; my = e.clientY/window.innerHeight; }, {passive:true});
  hero.addEventListener('pointerdown', function(e){
    if(e.target.closest && e.target.closest('.replay')) return;
    drag = true; decided = e.pointerType === 'mouse' ? 'turn' : null;
    sx = lx = e.clientX; sy = ly = e.clientY; t0 = now(); moved = 0; vX = vY = 0;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
  });
  hero.addEventListener('pointermove', function(e){
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
    if(!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy);
    if(decided === null){
      // touch: a sideways drag turns the butterfly, a vertical one scrolls the page
      var ax = Math.abs(e.clientX - sx), ay = Math.abs(e.clientY - sy);
      if(ax > 8 && ax > ay){ decided = 'turn'; try{ hero.setPointerCapture(e.pointerId); }catch(_){} }
      else if(ay > 10){ decided = 'scroll'; drag = false; ptr.on = false; return; }
      else return;
    }
    if(decided !== 'turn') return;
    hero.classList.add('drag'); quietHint();
    vY = dx*.0075; vX = dy*.005;
    rotY += vY; rotX = Math.max(-.9, Math.min(.9, rotX + vX));
    lx = e.clientX; ly = e.clientY;
  });
  hero.addEventListener('pointerup', up);
  hero.addEventListener('pointercancel', up);
  hero.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse') ptr.on = false; });
}
function up(e){
  var wasDrag = drag; drag = false; hero.classList.remove('drag');
  if(wasDrag && moved < 10 && now() - t0 < 350 && e.type === 'pointerup') tap();
  if(e.pointerType !== 'mouse') ptr.on = false;
}

// once per frame: drag, inertia, and a slow return to face the viewer
export function coast(){
  if(!drag){
    rotY += vY; rotX += vX; vY *= .945; vX *= .9;
    if(Math.abs(vY) < .002){ var home = Math.round(rotY/(Math.PI*2))*Math.PI*2 - .0; rotY += (home - rotY)*.018; }
    rotX += (0 - rotX)*.03;
  }
}
// once per frame: pointer pressure eases in and out
export function press(){ ptrF += ((ptr.on ? 1 : 0) - ptrF)*.12; }
