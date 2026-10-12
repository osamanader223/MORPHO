import * as THREE from 'three';
import { reduce } from '../env.js';
import { BGU } from './atmosphere.js';
import leafUrl from '../assets/morph/leaf.png';
import caterUrl from '../assets/morph/caterpillar.png';
import chrysUrl from '../assets/morph/chrysalis.png';
import flyUrl from '../assets/morph/butterfly.png';

var R = Math.random;

/* ---------------- the specimen: particle metamorphosis ---------------- */
export var PU = {
  uStage:{value:0}, uScatter:{value:1}, uCrack:{value:0}, uFlap:{value:0}, uFade:{value:0},
  uPR:{value:1}, uSize:{value:34}, uPtr:{value:new THREE.Vector3(99,99,0)}, uPtrF:{value:0},
  uCol:{value:new THREE.Color(0xf3f4f7)}, uGlowCol:{value:new THREE.Color(0x8c9cff)},
  uTime:BGU.uTime, uMotion:{value: reduce ? 0 : 1}
};
var PVERT = [
  'attribute vec3 aS0; attribute vec3 aS1; attribute vec3 aS2; attribute vec4 aR;',
  'uniform float uStage, uScatter, uCrack, uFlap, uPR, uSize, uTime, uPtrF, uMotion;',
  'uniform vec3 uPtr;',
  'varying float vA; varying float vGlow;',
  'vec3 pick(float i){ vec3 p = aS0; p = mix(p, aS1, step(0.5,i)); p = mix(p, aS2, step(1.5,i)); p = mix(p, position, step(2.5,i)); return p; }',
  'void main(){',
  '  float s = clamp(uStage, 0.0, 3.0);',
  '  float i0 = floor(s); float f = s - i0;',
  '  float k = clamp((f - aR.x*0.45)/0.55, 0.0, 1.0); k = k*k*(3.0-2.0*k);',
  '  vec3 p = mix(pick(i0), pick(min(i0+1.0,3.0)), k);',
  '  float mid = sin(k*3.14159265);',
  '  p += vec3(sin(aR.y*6.2832+uTime*0.9), cos(aR.z*6.2832+uTime*0.7), sin(aR.w*6.2832+uTime*0.8)) * mid * (0.35+aR.w*0.55);',
  '  p.z += mid*(aR.y-0.5)*1.6;',
  // wing flap, hinged on the body
  '  float bw = smoothstep(2.2, 3.0, s);',
  '  float ax = abs(p.x); float sx = sign(p.x);',
  '  float ang = uFlap * bw * smoothstep(0.05, 0.6, ax);',
  '  float ca = cos(ang), sa = sin(ang);',
  '  vec3 q = p; q.x = p.x*ca - sx*p.z*sa; q.z = ax*sa + p.z*ca; p = q;',
  // chrysalis splits open
  '  p += normalize(p + vec3(0.0001)) * uCrack * (0.35 + aR.y*1.1);',
  // dust cloud
  '  float th = aR.y*6.2832; float ph = acos(2.0*aR.z-1.0); float rr = 2.4 + aR.w*5.6;',
  '  vec3 dust = vec3(sin(ph)*cos(th)*1.3, sin(ph)*sin(th)*0.75, cos(ph)*0.9) * rr;',
  '  dust += vec3(sin(uTime*0.23+aR.x*30.0), cos(uTime*0.19+aR.y*30.0), sin(uTime*0.21+aR.z*30.0)) * 0.4;',
  '  p = mix(p, dust, uScatter);',
  '  p += vec3(sin(uTime*1.7+aR.y*50.0), cos(uTime*1.3+aR.z*50.0), sin(uTime*1.1+aR.w*50.0)) * 0.012 * uMotion;',
  // the finger pushes the particles away
  '  vec2 dv = p.xy - uPtr.xy; float dl = length(dv);',
  '  float push = uPtrF * smoothstep(1.3, 0.0, dl);',
  '  p.xy += (dv / max(dl,0.001)) * push * (0.5 + aR.y*0.9);',
  '  p.z += push * (aR.z - 0.3) * 1.3;',
  '  vec4 mv = modelViewMatrix * vec4(p,1.0);',
  '  gl_Position = projectionMatrix * mv;',
  '  gl_PointSize = uSize * (0.55 + aR.w*0.9) * mix(0.82, 1.28, bw) * (1.0 + mid*0.5 + uCrack*0.7) * uPR / -mv.z;',
  '  vA = (0.6 + aR.x*0.4) * (1.0 - uScatter*0.4) * mix(1.0, 1.15, bw);',
  '  vGlow = clamp(mid + uCrack + push*0.7, 0.0, 1.0);',
  '}'
].join('\n');
var PFRAG = [
  'uniform vec3 uCol; uniform vec3 uGlowCol; uniform float uFade;',
  'varying float vA; varying float vGlow;',
  'void main(){',
  '  float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;',
  '  float a = (smoothstep(0.24,0.0,d) + smoothstep(0.5,0.05,d)*0.22) * vA * uFade;',
  '  gl_FragColor = vec4(mix(uCol, uGlowCol, vGlow*0.6), a);',
  '}'
].join('\n');
var pmat;

// The group the frame loop pins to the hero, then the particle material.
export function specimen(scene){
  var heroG = new THREE.Group(); scene.add(heroG);
  pmat = new THREE.ShaderMaterial({ uniforms:PU, vertexShader:PVERT, fragmentShader:PFRAG,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  return heroG;
}

/* ---------------- shapes from the brand's own drawings ---------------- */
export var MASKS = [leafUrl, caterUrl, chrysUrl, flyUrl];
export function loadImg(src){ return new Promise(function(res){ var im = new Image(); im.onload=function(){res(im);}; im.onerror=function(){res(null);}; im.src = src; }); }
function sample(img, n, fitW, fitH, edgeBias, depth){
  var W = img.naturalWidth, H = img.naturalHeight;
  var c = document.createElement('canvas'); c.width = W; c.height = H;
  var x = c.getContext('2d'); x.drawImage(img, 0, 0);
  var d = x.getImageData(0,0,W,H).data, ink = new Uint8Array(W*H), i;
  for(i=0;i<W*H;i++) ink[i] = d[i*4] > 127 ? 1 : 0;
  var edge = [], fill = [];
  for(var yy=1; yy<H-1; yy++) for(var xx=1; xx<W-1; xx++){
    var kk = yy*W+xx; if(!ink[kk]) continue;
    if(!ink[kk-1] || !ink[kk+1] || !ink[kk-W] || !ink[kk+W]) edge.push(kk); else fill.push(kk);
  }
  if(!fill.length) fill = edge; if(!edge.length) edge = fill;
  var s = Math.min(fitW/W, fitH/H), hw = W*s/2, hh = H*s/2, out = new Float32Array(n*3);
  for(var j=0;j<n;j++){
    var pool = R() < edgeBias ? edge : fill, k2 = pool[(R()*pool.length)|0];
    var wx = ((k2 % W) + R() - W/2)*s, wy = (H/2 - (((k2/W)|0) + R()))*s;
    out[j*3] = wx; out[j*3+1] = wy; out[j*3+2] = depth(wx/hw, wy/hh);
  }
  // order top to bottom so each stage pours into the next instead of exploding
  var idx = new Array(n); for(i=0;i<n;i++) idx[i] = i;
  idx.sort(function(a,b){ return (out[b*3+1] + out[b*3]*0.12) - (out[a*3+1] + out[a*3]*0.12); });
  var o = new Float32Array(n*3);
  for(i=0;i<n;i++){ var s3 = idx[i]*3; o[i*3]=out[s3]; o[i*3+1]=out[s3+1]; o[i*3+2]=out[s3+2]; }
  return o;
}

// leaf, caterpillar, chrysalis, butterfly: one cloud of N particles that pours through all four
export function particles(im, N, heroG){
  var leaf  = sample(im[0], N, 2.7, 3.7, 0, function(nx){ return .42*nx*nx - .14 + (R()-.5)*.08; });
  var cater = sample(im[1], N, 4.7, 3.3, 0, function(){ return (R()-.5)*.36; });
  var chrys = sample(im[2], N, 2.5, 3.9, 0, function(nx){ return (R()<.5?-1:1)*.34*Math.sqrt(Math.max(0,1-nx*nx)) + (R()-.5)*.04; });
  var fly   = sample(im[3], N, 5.0, 4.0, .46, function(nx){ return .34*Math.pow(Math.abs(nx),1.7) + (R()-.5)*.05; });
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(fly,3));
  g.setAttribute('aS0', new THREE.BufferAttribute(leaf,3));
  g.setAttribute('aS1', new THREE.BufferAttribute(cater,3));
  g.setAttribute('aS2', new THREE.BufferAttribute(chrys,3));
  var r4 = new Float32Array(N*4); for(var i=0;i<N*4;i++) r4[i] = R();
  g.setAttribute('aR', new THREE.BufferAttribute(r4,4));
  var pts = new THREE.Points(g, pmat); pts.frustumCulled = false; heroG.add(pts);
}
