import * as THREE from 'three';
import { $, reduce, canHover } from '../env.js';
import { S, now, stepTL, intro, formed } from '../timeline.js';
import { noGL } from '../ui.js';
import { initInput, coast, press, ptr, mx, my, rotX, rotY, vY, ptrF } from '../input.js';
import { BGU, atmosphere } from './atmosphere.js';
import { PU, specimen, MASKS, loadImg, particles } from './specimen.js';
import { buildFlyers, flutter } from './flyers.js';

var hero = $('hero');
var renderer, scene, camera, heroG, mists, motes, small, N;
var CAMZ = 11.5;
var raf = 0, dead = false;

/* ---------------- WebGL ---------------- */
export function initStage(){
  try{ renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'}); }
  catch(e){ noGL(); return; }
  if(!renderer || !renderer.getContext()){ noGL(); return; }

  small = window.innerWidth < 760;
  var cores = navigator.hardwareConcurrency || 4;
  N = small ? (cores <= 4 ? 8500 : 11500) : 17000;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 1.75));
  renderer.setClearColor(0x000000, 1);
  $('stage').appendChild(renderer.domElement);

  // the GPU can drop the context (backgrounded tab, driver reset): fall back, never go blank
  renderer.domElement.addEventListener('webglcontextlost', function(e){
    e.preventDefault();
    dead = true; cancelAnimationFrame(raf);
    noGL();
  }, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, .35, CAMZ);

  var air = atmosphere(scene, small);
  mists = air.mists; motes = air.motes;
  heroG = specimen(scene);

  Promise.all(MASKS.map(loadImg)).then(function(im){
    if(dead) return;
    if(!im[0] || !im[1] || !im[2] || !im[3]){ noGL(); return; }
    particles(im, N, heroG);
    if(!reduce) buildFlyers(scene, im[3], small);

    if(reduce) formed();
    else intro(false);
    resize();
    raf = requestAnimationFrame(frame);
  });

  window.addEventListener('resize', resize);
  initInput();
}

/* ---------------- sizing ---------------- */
var bufSize = new THREE.Vector2();
function resize(){
  small = window.innerWidth < 760;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.getDrawingBufferSize(bufSize);
  BGU.uRes.value.copy(bufSize);
  BGU.uAspect.value = window.innerWidth/window.innerHeight;
  BGU.uGlowR.value = small ? .42 : .56;
  PU.uPR.value = renderer.getPixelRatio();
  motes.material.uniforms.uPR.value = renderer.getPixelRatio();
}

/* ---------------- low-power mode ---------------- */
// Most visits come from Instagram's in-app browser on phones. Skip 20 warm-up frames,
// time the next 120, and if the median is over 30 ms step down once and stay down:
// pixel ratio 1, no mist, no motes. The specimen, forest and flyers stay.
var warmup = 20, times = [];
function watch(ms){
  if(!times) return;
  if(warmup > 0){ warmup--; return; }
  times.push(ms);
  if(times.length < 120) return;
  times.sort(function(a,b){ return a-b; });
  var median = (times[59] + times[60])/2;
  times = null;
  if(median > 30) lowPower();
}
function lowPower(){
  renderer.setPixelRatio(1);
  for(var i=0;i<mists.length;i++) mists[i].visible = false;
  motes.visible = false;
  resize();
  console.info('[morpho] low-power mode');
}

/* ---------------- frame ---------------- */
var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
var hitA = new THREE.Vector3(), hitB = new THREE.Vector3(), camX = 0, camY = .35, T0 = now(), last = T0;

function worldAt(px, py, out){
  ndc.set(px/window.innerWidth*2-1, -(py/window.innerHeight)*2+1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, out);
}

function frame(tn){
  if(dead) return;
  raf = requestAnimationFrame(frame);
  if(document.hidden) return;
  var t = (tn - T0)/1000, dt = Math.min(.05, (tn - last)/1000);
  watch(tn - last);
  last = tn;
  BGU.uTime.value = t;
  stepTL();
  var motion = reduce ? 0 : 1;

  // camera drifts with the cursor; the forest shows its depth
  var wantX = canHover ? (mx-.5)*1.2 : Math.sin(t*.13)*.45;
  var wantY = canHover ? .35-(my-.5)*.6 : .35+Math.sin(t*.11)*.12;
  camX += (wantX*motion - camX)*.04; camY += (wantY - camY)*.04;
  camera.position.set(camX, camY, CAMZ); camera.lookAt(camX*.35, camY*.35, -10);
  camera.updateMatrixWorld();

  // pin the specimen to the hero box, whatever the scroll
  var r = hero.getBoundingClientRect();
  var cx = r.left + r.width*.5, cy = r.top + r.height*(small ? .44 : .47);
  if(worldAt(cx, cy, hitA) && worldAt(cx+100, cy, hitB)){
    var wpp = hitA.distanceTo(hitB)/100;
    var wantPx = Math.min(r.width*(small ? .86 : .74), r.height*(small ? 1.15 : .95));
    var sc = (wantPx*wpp)/5.0;
    heroG.position.copy(hitA);
    heroG.scale.setScalar(sc);
    PU.uSize.value = 40*(.62 + .38*Math.min(sc, 1.3));
  }
  BGU.uGlow.value.set(cx/window.innerWidth, 1 - cy/window.innerHeight);

  // drag, inertia, and a slow return to face the viewer
  coast();
  heroG.rotation.set(rotX + Math.sin(t*.31)*.05*motion, rotY + Math.sin(t*.4)*.24*motion, Math.sin(t*.27)*.03*motion);

  // uniforms
  PU.uStage.value = S.stage; PU.uScatter.value = S.scatter; PU.uCrack.value = S.crack; PU.uFade.value = S.fade;
  var spin = Math.min(Math.abs(vY)*60, 1);
  PU.uFlap.value = (motion ? 1 : .2) * S.flap * (.3 + spin*.45) * Math.sin(t*(5.2 + spin*7.0));

  // pointer pressure, in the specimen's own space
  press();
  if(ptr.on){
    plane.constant = -heroG.position.z;
    if(worldAt(ptr.x, ptr.y, hitB)){ heroG.updateMatrixWorld(); PU.uPtr.value.copy(heroG.worldToLocal(hitB)); }
    plane.constant = 0;
  }
  PU.uPtrF.value = ptrF;

  // other butterflies, deep in the fog
  flutter(t);

  renderer.render(scene, camera);
}
