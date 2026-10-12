import { $ } from './env.js';
import { caption, scrambleWord, showTools, quietHint } from './ui.js';

var tools = $('tools');

/* ---------------- timeline ---------------- */
export var S = { stage:0, scatter:1, crack:0, fade:0, flap:0 };
var tweens = [], events = [], busy = true;
export function now(){ return performance.now(); }
function EIO(p){ return p<.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2; }
function EOUT(p){ return 1-Math.pow(1-p,3); }
function EIN(p){ return p*p*p; }
function tw(key,to,dur,delay,ease){ tweens.push({key:key,to:to,dur:Math.max(1,dur),start:now()+(delay||0),ease:ease||EIO,from:null}); }
function at(delay,fn){ events.push({t:now()+delay,fn:fn}); }
function clearTL(){ tweens = []; events = []; }
export function stepTL(){
  var t = now(), due = [], keep = [];
  events.forEach(function(e){ (e.t <= t ? due : keep).push(e); });
  events = keep;
  due.sort(function(a,b){ return a.t-b.t; }).forEach(function(e){ e.fn(); });
  // apply in start order, so a slow frame that skips past several steps still lands on the right state
  tweens.sort(function(a,b){ return a.start-b.start; });
  var live = [];
  for(var i=0;i<tweens.length;i++){
    var w = tweens[i]; if(t < w.start){ live.push(w); continue; }
    if(w.from === null) w.from = S[w.key];
    var p = Math.min(1,(t-w.start)/w.dur);
    S[w.key] = w.from + (w.to-w.from)*w.ease(p);
    if(p < 1) live.push(w);
  }
  tweens = live;
}

export function intro(fast){
  clearTL(); busy = true;
  var k = fast ? 0.55 : 1;
  S.stage = 0; S.crack = 0;
  tw('fade',1,700*k);
  tw('scatter',0,1400*k,0,EOUT);
  at(350*k,function(){ caption(0); });
  tw('stage',1,1050*k,2000*k);
  at(2050*k,function(){ caption(1); });
  tw('stage',2,1050*k,3750*k);
  at(3800*k,function(){ caption(2); });
  // the chrysalis splits, the butterfly emerges
  tw('crack',1,170*k,5350*k,EOUT);
  tw('crack',0,950*k,5520*k,EIO);
  tw('stage',3,1300*k,5400*k);
  at(5500*k,function(){ caption(3); });
  at(6500*k,function(){ scrambleWord(); });
  tw('flap',1,900*k,6300*k);
  at(7600*k,function(){ caption(4); });
  at(9600*k,function(){ caption(-1); busy = false; showTools(); });
}
function skip(){
  clearTL(); busy = true;
  tw('fade',1,300); tw('scatter',0,500,0,EOUT); tw('crack',0,300);
  tw('stage',3,800,0,EIO); tw('flap',1,600,400);
  at(100,function(){ caption(3); });
  at(700,function(){ scrambleWord(); });
  at(1800,function(){ caption(4); });
  at(3600,function(){ caption(-1); busy = false; showTools(); });
}
function remorph(){
  clearTL(); busy = true; tools.classList.remove('on');
  tw('flap',0,300); tw('scatter',1,450,0,EIN);
  at(470,function(){ S.scatter = 1; intro(true); });
}
export function tap(){
  if(navigator.vibrate) { try{ navigator.vibrate(10); }catch(_){} }
  quietHint();
  if(busy) skip(); else remorph();
}
export function replay(){ if(!busy) remorph(); }

// reduced motion: no intro, the butterfly is already formed
export function formed(){
  S.stage = 3; S.scatter = 0; S.fade = 1; S.flap = .3; busy = false; caption(4); setTimeout(function(){ caption(-1); showTools(); }, 2500);
}
