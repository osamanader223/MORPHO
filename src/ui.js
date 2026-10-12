import { $, reduce, canHover } from './env.js';

var cap=$('cap'), capN=$('capN'), capW=$('capW'), capD=$('capD');
var tools=$('tools'), hint=$('hint');

/* ---------------- ticker ---------------- */
var words = [['Drop 02 pre-order is open'],['مورفو','ar'],['Born to morph'],['Wear your culture'],['Made in Jeddah']];
var unit = words.map(function(w){ return '<span'+(w[1]?' lang="ar"':'')+'>'+w[0]+'<i class="mk"></i></span>'; }).join('');

export function initUI(){
  $('run').innerHTML = unit+unit+unit+unit;
  window.addEventListener('resize', function(){ wmLetters.forEach(function(s){ s.style.width=''; }); });
}

/* ---------------- captions: the brand personality, in order ---------------- */
var CAPS = [
  ['1 / 4','Confident','Bold, expressive and unapologetic.'],
  ['2 / 4','Creative','Design-led and experimental.'],
  ['3 / 4','Progressive','Constantly evolving.'],
  ['4 / 4','Urban','Rooted in modern city culture.'],
  ['','Born to morph','Founded in Jeddah, 2025.']
];
export function caption(i){
  cap.classList.add('out');
  clearTimeout(caption.t);
  if(i < 0) return;
  caption.t = setTimeout(function(){
    capN.textContent = CAPS[i][0]; capW.textContent = CAPS[i][1]; capD.textContent = CAPS[i][2];
    capN.style.display = CAPS[i][0] ? '' : 'none';
    cap.classList.remove('out');
  }, 200);
}

/* ---------------- wordmark morph ---------------- */
var wmLetters = Array.prototype.slice.call($('wm').querySelectorAll('span[data-ch]'));
function lockWidths(){
  wmLetters.forEach(function(s){ s.style.width = ''; });
  wmLetters.forEach(function(s){ s.style.width = s.getBoundingClientRect().width + 'px'; });
}
export function scrambleWord(){
  if(reduce) return;
  lockWidths();
  var glyphs = 'MORPH0/\\|#XK';
  wmLetters.forEach(function(s, i){
    var n = 0, total = 5 + i*2, fin = s.getAttribute('data-ch');
    var id = setInterval(function(){
      n++;
      s.textContent = n >= total ? fin : glyphs.charAt((Math.random()*glyphs.length)|0);
      if(n >= total) clearInterval(id);
    }, 46);
  });
}

export function showTools(){
  hint.textContent = canHover ? 'Move through it. Drag to turn it.' : 'Touch it. Swipe sideways to turn it.';
  tools.classList.add('on');
}
export function quietHint(){ hint.textContent = ''; }

/* ---------------- no WebGL, or it was lost: the drawn butterfly stands in ---------------- */
export function noGL(){
  document.documentElement.classList.add('nogl');
  caption(4); showTools(); $('replay').style.display='none';
  hint.textContent = '';
}
