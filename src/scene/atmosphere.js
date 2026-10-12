import * as THREE from 'three';

var R = Math.random;

/* shared atmosphere: every object fogs into the same backdrop, pixel for pixel */
export var BGU = {
  uRes:{value:new THREE.Vector2(1,1)}, uGlow:{value:new THREE.Vector2(.5,.62)},
  uAspect:{value:1}, uGlowR:{value:.5}, uHorizon:{value:.5}, uTime:{value:0}
};
export var BG = [
  'uniform vec2 uRes; uniform vec2 uGlow; uniform float uAspect; uniform float uGlowR; uniform float uHorizon; uniform float uTime;',
  'vec3 bg(vec2 uv){',
  '  vec2 q = uv - uGlow; q.x *= uAspect;',
  '  float d = length(q) / uGlowR;',
  '  vec3 c = mix(vec3(0.215,0.218,0.229), vec3(0.066,0.067,0.072), smoothstep(0.0,0.8,d));',
  '  c = mix(c, vec3(0.0), smoothstep(0.6,1.8,d));',
  '  c += exp(-pow((uv.y-uHorizon)*7.0,2.0)) * 0.035 * (1.0-smoothstep(0.5,1.9,d));',
  '  return c;',
  '}'
].join('\n');
export var NOISE = [
  'float hsh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
  'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
  '  return mix(mix(hsh(i),hsh(i+vec2(1.0,0.0)),f.x), mix(hsh(i+vec2(0.0,1.0)),hsh(i+vec2(1.0,1.0)),f.x), f.y); }',
  'float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*vn(p); p*=2.03; a*=0.5; } return v; }'
].join('\n');
export function U(extra){ var o = {}; for(var k in BGU) o[k] = BGU[k]; for(var j in extra) o[j] = extra[j]; return o; }

// Builds the backdrop, forest, mist and motes in the reference's order.
// Returns the mist planes and motes so low-power mode can switch them off.
export function atmosphere(scene, small){
  /* backdrop: fog glow + moving film grain */
  var back = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
    uniforms: U({}),
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: BG + '\n' + NOISE + '\nvoid main(){ vec2 uv = gl_FragCoord.xy/uRes; vec3 c = bg(uv);' +
      ' c += (hsh(gl_FragCoord.xy + fract(uTime*7.0)*97.0) - 0.5) * 0.028;' +
      ' gl_FragColor = vec4(max(c,0.0),1.0); }',
    depthWrite:false, depthTest:false
  }));
  back.frustumCulled = false; back.renderOrder = -1000; scene.add(back);

  /* ---------------- the burnt forest (moodboard) ---------------- */
  var forestMat = new THREE.ShaderMaterial({
    uniforms: U({ uNear:{value:12}, uFar:{value:54} }),
    vertexShader: [
      'varying float vD; varying float vY;',
      'void main(){',
      '  vec4 lp = vec4(position,1.0);',
      '  #ifdef USE_INSTANCING',
      '  lp = instanceMatrix * lp;',
      '  #endif',
      '  vec4 wp = modelMatrix * lp; vY = wp.y;',
      '  vec4 mv = viewMatrix * wp; vD = -mv.z;',
      '  gl_Position = projectionMatrix * mv;',
      '}'].join('\n'),
    fragmentShader: BG + '\nuniform float uNear; uniform float uFar; varying float vD; varying float vY;\n' +
      'void main(){ vec2 uv = gl_FragCoord.xy/uRes; float f = pow(smoothstep(uNear,uFar,vD),0.75);' +
      ' f = clamp(f + smoothstep(-1.0,-4.4,vY)*0.55, 0.0, 1.0);' +
      ' gl_FragColor = vec4(mix(vec3(0.004,0.004,0.005), bg(uv), f), 1.0); }',
    side: THREE.DoubleSide
  });

  var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3();
  var trunkGeo = new THREE.CylinderGeometry(0.4, 1, 1, 6, 1, true); trunkGeo.translate(0, .5, 0);
  var TR = small ? 120 : 170, trunks = new THREE.InstancedMesh(trunkGeo, forestMat, TR), tdata = [], placed = 0, guard = 0;
  while(placed < TR && guard < 6000){
    guard++;
    var tx = (R()*2-1)*30, tz = -5 - R()*38;
    if(Math.abs(tx) < 3.6 && tz > -16) continue;          // keep a clearing behind the butterfly
    var th = .05 + R()*.11, h = 9 + R()*10;
    E.set((R()-.5)*.06, R()*6.28, (R()-.5)*.09); Q.setFromEuler(E);
    P3.set(tx, -4.4, tz); S3.set(th, h, th); M4.compose(P3, Q, S3);
    trunks.setMatrixAt(placed, M4);
    tdata.push({x:tx, z:tz, h:h, th:th});
    placed++;
  }
  trunks.count = placed; scene.add(trunks);

  var brGeo = new THREE.CylinderGeometry(0.3, 1, 1, 4, 1, true); brGeo.translate(0, .5, 0);
  var BR = small ? 200 : 320, branches = new THREE.InstancedMesh(brGeo, forestMat, BR);
  for(var b=0; b<BR; b++){
    var tr = tdata[(R()*tdata.length)|0];
    E.set(0, R()*6.2832, .5 + R()*.65, 'YXZ'); Q.setFromEuler(E);
    P3.set(tr.x, -4.4 + tr.h*(.35 + R()*.6), tr.z);
    var bt = tr.th*(.22 + R()*.3); S3.set(bt, .5 + R()*2.1, bt);
    M4.compose(P3, Q, S3); branches.setMatrixAt(b, M4);
  }
  scene.add(branches);

  /* drifting mist banks between the trunks */
  function mist(z, y, w, h, a, seed){
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
      uniforms: U({ uA:{value:a}, uSeed:{value:seed} }),
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: BG + '\n' + NOISE + '\nuniform float uA; uniform float uSeed; varying vec2 vU;\n' +
        'void main(){ vec2 p = vU*vec2(7.0,1.5) + vec2(uTime*0.014 + uSeed, uSeed*0.37);' +
        ' float n = fbm(p); float a = smoothstep(0.42,0.86,n) * uA;' +
        ' a *= smoothstep(0.0,0.3,vU.y) * smoothstep(1.0,0.4,vU.y) * smoothstep(0.0,0.12,vU.x) * smoothstep(1.0,0.88,vU.x);' +
        ' vec3 c = mix(bg(gl_FragCoord.xy/uRes), vec3(0.6,0.61,0.64), 0.5);' +
        ' gl_FragColor = vec4(c, a); }',
      transparent:true, depthWrite:false
    }));
    m.position.set(0, y, z); scene.add(m); return m;
  }
  var mists = [];
  mists.push(mist(-7, -3.1, 64, 9, .13, 1.7));
  mists.push(mist(-15, -2.4, 80, 11, .15, 5.3));
  if(!small) mists.push(mist(-25, -1.6, 110, 14, .17, 9.1));

  /* motes of ash in the air */
  var MN = small ? 140 : 240, mp = new Float32Array(MN*3), mr = new Float32Array(MN);
  for(var i=0;i<MN;i++){ mp[i*3]=(R()*2-1)*16; mp[i*3+1]=(R()*2-1)*7; mp[i*3+2]=-2-R()*14; mr[i]=R(); }
  var mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp,3)); mg.setAttribute('aR', new THREE.BufferAttribute(mr,1));
  var motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: U({ uPR:{value:1} }),
    vertexShader: 'attribute float aR; uniform float uTime; uniform float uPR; varying float vA;' +
      'void main(){ vec3 p = position; p.y = mod(p.y + uTime*(0.06+aR*0.1) + 7.0, 14.0) - 7.0;' +
      ' p.x += sin(uTime*0.2 + aR*40.0)*0.35; vec4 mv = modelViewMatrix*vec4(p,1.0);' +
      ' gl_Position = projectionMatrix*mv; gl_PointSize = (14.0 + aR*20.0)*uPR / -mv.z; vA = 0.12 + aR*0.22; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard;' +
      ' gl_FragColor = vec4(vec3(0.85), smoothstep(0.5,0.0,d)*vA); }',
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  }));
  motes.frustumCulled = false; scene.add(motes);

  return { mists:mists, motes:motes };
}
