import * as THREE from 'three';
import { BG, U } from './atmosphere.js';

var R = Math.random;

function wingTexture(img){
  var W = img.naturalWidth, H = img.naturalHeight, half = Math.floor(W/2), w = W-half;
  var c = document.createElement('canvas'); c.width = w; c.height = H;
  var x = c.getContext('2d'); x.drawImage(img, half, 0, w, H, 0, 0, w, H);
  var id = x.getImageData(0,0,w,H), p = id.data;
  for(var i=0;i<p.length;i+=4){ var v = p[i]; p[i]=p[i+1]=p[i+2]=255; p[i+3]=v; }
  x.putImageData(id,0,0);
  var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return { tex:t, aspect:w/H };
}

var flyers = [];
export function buildFlyers(scene, img, small){
  var wt = wingTexture(img), hgt = .9, wid = hgt*wt.aspect;
  var geo = new THREE.PlaneGeometry(wid, hgt); geo.translate(wid/2, 0, 0);
  var mat = new THREE.ShaderMaterial({
    uniforms: U({ uMap:{value:wt.tex} }),
    vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: BG + '\nuniform sampler2D uMap; varying vec2 vU; varying float vD;\n' +
      'void main(){ float a = texture2D(uMap, vU).a; if(a < 0.04) discard; float f = smoothstep(9.0, 30.0, vD);' +
      ' gl_FragColor = vec4(mix(vec3(0.88), bg(gl_FragCoord.xy/uRes), f), a*(1.0-f*0.6)); }',
    transparent:true, depthWrite:false, side:THREE.DoubleSide
  });
  var count = small ? 4 : 6;
  for(var i=0;i<count;i++){
    var g = new THREE.Group(), r = new THREE.Mesh(geo, mat), l = new THREE.Mesh(geo, mat);
    l.scale.x = -1; g.add(r); g.add(l);
    g.userData = { sp:.05+R()*.08, ph:R()*6.28, ax:(R()*2-1)*12, ay:-1.6+R()*4.2, z:-6-R()*12,
                   sc:.45+R()*.5, fl:7+R()*5, dir:R()<.5?1:-1, w:5+R()*6 };
    g.scale.setScalar(g.userData.sc);
    scene.add(g); flyers.push(g);
  }
}

// other butterflies, deep in the fog
export function flutter(t){
  for(var i=0;i<flyers.length;i++){
    var f = flyers[i], u = f.userData, a = t*u.sp + u.ph;
    f.position.set(u.ax + Math.sin(a)*u.w*u.dir, u.ay + Math.sin(a*1.7)*1.1, u.z + Math.cos(a*.8)*2.0);
    f.rotation.set(-.35 + Math.sin(a*2.1)*.15, Math.cos(a)*u.dir*1.1 + (u.dir>0?.4:-.4), Math.sin(a*1.3)*.2);
    var fl = Math.sin(t*u.fl + u.ph)*.95;
    f.children[0].rotation.y = -fl; f.children[1].rotation.y = fl;
  }
}
