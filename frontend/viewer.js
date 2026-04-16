/**
 * EventPulse — 3D Venue Viewer
 * Three.js scene with PLY loading and cinematic camera system.
 */

import * as THREE from 'three';
import { PLYLoader } from 'three-stdlib';

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scene & Camera ──
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 450, 0);
camera.lookAt(0, 0, 0);

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Sky ──
const skyGeo = new THREE.SphereGeometry(800, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0x0a1628) },
    botColor: { value: new THREE.Color(0x1a3a1a) },
  },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor, botColor;
    varying vec3 vPos;
    void main() {
      float t = clamp((vPos.y + 200.0) / 600.0, 0.0, 1.0);
      gl_FragColor = vec4(mix(botColor, topColor, t), 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ── Lighting ──
const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
sunLight.position.set(100, 180, 80);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.far = 600;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
scene.add(sunLight);

scene.add(new THREE.AmbientLight(0x334422, 1.2));
scene.add(new THREE.HemisphereLight(0x223311, 0x112200, 0.8));

// ── Fog ──
scene.fog = new THREE.FogExp2(0x0d2010, 0.0018);

// ── Placeholder venue geometry (used when no PLY is loaded) ──
let hasLyraScene = false;
const placeholderGroup = new THREE.Group();

function buildPlaceholderScene() {
  // Terrain
  const w = 300, d = 300, segs = 80;
  const geo = new THREE.PlaneGeometry(w, d, segs, segs);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getY(i);
    let y = 0;
    y += Math.sin(x * 0.02) * 3;
    y += Math.sin(z * 0.015) * 2;
    y += Math.sin(x * 0.05 + z * 0.03) * 1.5;
    y += (Math.random() - 0.5) * 0.8;
    const dist = Math.sqrt(x * x + z * z);
    if (dist < 60) y -= 1.5 * (1 - dist / 60);
    pos.setZ(i, y);
  }
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);

  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    const isSand = (Math.abs(x - 30) < 12 && Math.abs(z + 20) < 8) ||
                   (Math.abs(x + 25) < 10 && Math.abs(z - 15) < 7);
    const isGreen = dist < 20;
    const isFairway = dist < 60 && dist > 20;
    if (isSand)         colors.push(0.76, 0.69, 0.50);
    else if (isGreen)   colors.push(0.18, 0.55, 0.20);
    else if (isFairway) colors.push(0.22, 0.48, 0.18);
    else                colors.push(0.12, 0.30, 0.10);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;
  placeholderGroup.add(terrain);

  // Water hazard
  const waterGeo = new THREE.PlaneGeometry(45, 20);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a4a6a, roughness: 0.05, metalness: 0.1,
    transparent: true, opacity: 0.85,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-50, -0.5, 30);
  waterMesh.rotation.y = 0.4;
  waterMesh.userData.isWater = true;
  placeholderGroup.add(waterMesh);

  // Trees
  const treePositions = [
    [-70,0,-80],[-65,1,-60],[-72,0,-40],[-68,0,-20],[-75,1,0],[-70,0,20],[-68,0,40],
    [75,0,-80],[70,1,-60],[72,0,-40],[68,0,-20],[75,1,0],[70,0,20],[72,0,40],
    [-40,0,80],[-20,0,85],[0,0,82],[20,0,85],[40,0,80],
    [-30,0,-90],[-10,0,-88],[10,0,-90],[30,0,-88],
  ];
  treePositions.forEach(([x, y, z]) => {
    const h = 0.7 + Math.random() * 0.6;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * h, 0.5 * h, 2 * h, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a2e0a }),
    );
    trunk.position.y = h;
    trunk.castShadow = true;
    g.add(trunk);
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(2.5 * h, 5 * h, 7),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.08 + Math.random() * 0.05, 0.35 + Math.random() * 0.1, 0.08),
      }),
    );
    foliage.position.y = 2 * h + 2.5 * h;
    foliage.castShadow = true;
    g.add(foliage);
    g.position.set(x, y, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    placeholderGroup.add(g);
  });

  // Clubhouse
  const clubG = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8, 15),
    new THREE.MeshLambertMaterial({ color: 0xe8e0cc }),
  );
  body.position.y = 4;
  body.castShadow = true;
  body.receiveShadow = true;
  clubG.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(32, 1.5, 17),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a }),
  );
  roof.position.y = 8.5;
  roof.castShadow = true;
  clubG.add(roof);
  for (let i = -12; i <= 12; i += 6) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    col.position.set(i, 4, 7.5);
    col.castShadow = true;
    clubG.add(col);
  }
  clubG.position.set(0, 0, -100);
  placeholderGroup.add(clubG);

  // Flags
  [[0, 0], [-80, 50], [85, -40]].forEach(([fx, fz]) => {
    const fg = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    pole.position.y = 2.25;
    fg.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xff3333, side: THREE.DoubleSide }),
    );
    flag.position.set(0.6, 4.2, 0);
    fg.add(flag);
    fg.position.set(fx, 0, fz);
    placeholderGroup.add(fg);
  });

  // Cart path
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 0.1, -95),
    new THREE.Vector3(-8, 0.1, -60),
    new THREE.Vector3(-15, 0.1, -30),
    new THREE.Vector3(-20, 0.1, 0),
    new THREE.Vector3(-15, 0.1, 30),
    new THREE.Vector3(-5, 0.1, 55),
    new THREE.Vector3(10, 0.1, 70),
  ]);
  const pathGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
  placeholderGroup.add(new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.4, transparent: true })));

  scene.add(placeholderGroup);
}

buildPlaceholderScene();

// ── PLY Loading ──
export function loadLyraScene(jobId, onProgress, onReady) {
  const loader = new PLYLoader();
  const url = `/api/scene/${jobId}/scene.ply`;

  loader.load(
    url,
    (geometry) => {
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      // Auto-scale: largest dimension = 200 units
      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 200 / maxDim : 1;

      const hasColors = geometry.hasAttribute('color');
      const material = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: hasColors,
        color: hasColors ? undefined : 0x4ade80,
        sizeAttenuation: true,
      });

      const pointCloud = new THREE.Points(geometry, material);
      pointCloud.scale.setScalar(scale);

      // Remove placeholder, add real scene
      scene.remove(placeholderGroup);
      scene.add(pointCloud);
      hasLyraScene = true;

      if (onProgress) onProgress(100);
      if (onReady) onReady(pointCloud);
    },
    (xhr) => {
      if (xhr.lengthComputable && onProgress) {
        onProgress(Math.round((xhr.loaded / xhr.total) * 100));
      }
    },
    (error) => {
      console.warn('PLY load failed, keeping placeholder scene:', error);
      // Keep placeholder scene visible
      if (onProgress) onProgress(100);
      if (onReady) onReady(null);
    },
  );
}

// ══════════════════════════════════════════════════════
//  CAMERA ANIMATION SYSTEM
// ══════════════════════════════════════════════════════

const camState = { phase: -1, t: 0 };

const phases = {
  dropin: {
    duration: 8,
    label: 'DROPPING IN',
    modeLabel: 'AERIAL',
    modeSub: 'Satellite descent',
    getPos(t) {
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = t * Math.PI * 3;
      const radius = 180 * (1 - ease * 0.8);
      const height = 450 - ease * 410;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius,
      );
    },
    getTarget() { return new THREE.Vector3(0, 0, 0); },
  },

  flyover: {
    duration: 12,
    label: 'COURSE FLYOVER',
    modeLabel: 'FLYOVER',
    modeSub: 'AI course mapping',
    getPos(t) {
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = -130 + ease * 260;
      const z = -30 + Math.sin(ease * Math.PI) * 60;
      const y = 18 + Math.sin(ease * Math.PI * 2) * 6;
      return new THREE.Vector3(x, y, z);
    },
    getTarget(t) {
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return new THREE.Vector3(-130 + ease * 260 + 40, 2, 0);
    },
  },

  walkthrough: {
    duration: Infinity,
    label: 'WALKTHROUGH MODE',
    modeLabel: 'GROUND',
    modeSub: 'First-person navigation',
    startPos: new THREE.Vector3(-10, 2.8, 50),
  },
};

// ── Walkthrough controls ──
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

let isPointerLocked = false;
let yaw = 0;
let pitch = 0;

renderer.domElement.addEventListener('click', () => {
  if (camState.phase === 2) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', (e) => {
  if (!isPointerLocked || camState.phase !== 2) return;
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
});

// ── Phase transitions ──
// HUD update callbacks (set by index.html)
let _updateAltitude = () => {};
let _updateMode = () => {};
let _showPhaseLabel = () => {};
let _setProgress = () => {};
let _showCrosshair = () => {};
let _setPhaseActive = () => {};

export function setHUDCallbacks({ updateAltitude, updateMode, showPhaseLabel, setProgress, showCrosshair, setPhaseActive }) {
  _updateAltitude = updateAltitude || _updateAltitude;
  _updateMode = updateMode || _updateMode;
  _showPhaseLabel = showPhaseLabel || _showPhaseLabel;
  _setProgress = setProgress || _setProgress;
  _showCrosshair = showCrosshair || _showCrosshair;
  _setPhaseActive = setPhaseActive || _setPhaseActive;
}

function goToPhase(n) {
  camState.phase = n;
  camState.t = 0;

  const ph = [phases.dropin, phases.flyover, phases.walkthrough][n];
  _updateMode(ph.modeLabel, ph.modeSub);
  _showPhaseLabel(ph.label);
  _setPhaseActive(n);

  if (n === 2) {
    camera.position.copy(phases.walkthrough.startPos);
    yaw = Math.PI;
    pitch = 0;
    _showCrosshair(true);
  } else {
    _showCrosshair(false);
  }
}

// ── Render loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Water shimmer
  placeholderGroup.traverse((child) => {
    if (child.userData && child.userData.isWater && child.material) {
      child.material.color.setHSL(0.58, 0.7, 0.18 + Math.sin(elapsed * 0.8) * 0.03);
    }
  });

  // Camera logic
  if (camState.phase === 0) {
    const ph = phases.dropin;
    camState.t = Math.min(camState.t + dt / ph.duration, 1);
    const pos = ph.getPos(camState.t);
    const tgt = ph.getTarget(camState.t);
    camera.position.lerp(pos, 0.06);
    camera.lookAt(tgt);
    _setProgress(camState.t * 100);
    if (camState.t >= 1) setTimeout(() => goToPhase(1), 800);
  } else if (camState.phase === 1) {
    const ph = phases.flyover;
    camState.t = Math.min(camState.t + dt / ph.duration, 1);
    const pos = ph.getPos(camState.t);
    const tgt = ph.getTarget(camState.t);
    camera.position.lerp(pos, 0.04);
    camera.lookAt(tgt);
    _setProgress(camState.t * 100);
    if (camState.t >= 1) setTimeout(() => goToPhase(2), 600);
  } else if (camState.phase === 2) {
    _setProgress(100);
    const speed = 12 * dt;
    const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (keys['KeyW'] || keys['ArrowUp'])    camera.position.addScaledVector(dir, speed);
    if (keys['KeyS'] || keys['ArrowDown'])  camera.position.addScaledVector(dir, -speed);
    if (keys['KeyA'] || keys['ArrowLeft'])  camera.position.addScaledVector(right, -speed);
    if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, speed);

    camera.position.y = 2.8;
    camera.position.x = Math.max(-130, Math.min(130, camera.position.x));
    camera.position.z = Math.max(-110, Math.min(110, camera.position.z));

    const lookTarget = new THREE.Vector3(
      camera.position.x + Math.sin(-yaw) * Math.cos(pitch),
      camera.position.y + Math.sin(pitch) * 10,
      camera.position.z + Math.cos(-yaw) * Math.cos(pitch),
    );
    camera.lookAt(lookTarget);
  }

  // HUD altitude
  const alt = Math.round(camera.position.y * 3.28);
  _updateAltitude(Math.max(0, alt));

  renderer.render(scene, camera);
}

animate();

export { scene, camera, renderer, camState, goToPhase };
