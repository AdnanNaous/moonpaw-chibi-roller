import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { GameState, Hazard, Platform, Quality, Stage, Theme } from './types';

type Palette = {
  sky: number; fog: number; far: number; mid: number; near: number;
  ground: number; top: number; edge: number; light: number;
  accent: number; accent2: number; glow: number; danger: number;
};

const PALETTES: Record<Theme, Palette> = {
  sakura: { sky: 0x090a0c, fog: 0x18191c, far: 0x17181a, mid: 0x282a2c, near: 0x111214, ground: 0x202124, top: 0xaaa9a5, edge: 0xe3e1db, light: 0xd7d5cb, accent: 0xf27aa0, accent2: 0x89d9e1, glow: 0xf2f1e8, danger: 0xff5e79 },
  sawmill: { sky: 0x0b0b0b, fog: 0x1d1c1b, far: 0x191817, mid: 0x2b2926, near: 0x10100f, ground: 0x292722, top: 0xaaa49a, edge: 0xe6e0d4, light: 0xe7e1d5, accent: 0xffa45e, accent2: 0x9adbe0, glow: 0xf3ede2, danger: 0xff6f54 },
  neon: { sky: 0x07090b, fog: 0x171c20, far: 0x131719, mid: 0x252b2d, near: 0x0f1214, ground: 0x1d2427, top: 0x9ba9aa, edge: 0xd8e3e1, light: 0xd9e5e6, accent: 0x48e5e5, accent2: 0xf05a9b, glow: 0xe8ffff, danger: 0xff577b },
  sky: { sky: 0x121417, fog: 0x282c2e, far: 0x25282a, mid: 0x3b3e3e, near: 0x181b1c, ground: 0x36393a, top: 0xb7b9b2, edge: 0xe9eae0, light: 0xf0f0e9, accent: 0x8ad9e5, accent2: 0xf0a0ba, glow: 0xf6f6ef, danger: 0xff7080 },
  glitch: { sky: 0x08070b, fog: 0x19151d, far: 0x1b1920, mid: 0x302b33, near: 0x0e0c12, ground: 0x292630, top: 0xada7ae, edge: 0xe8e2e8, light: 0xece9eb, accent: 0xe56dff, accent2: 0x4be4e2, glow: 0xf5eff8, danger: 0xff5c9b },
};

const rand = (n: number) => {
  const v = Math.sin(n * 127.1 + 78.233) * 43758.5453123;
  return v - Math.floor(v);
};

function roundedRect(w: number, h: number, r: number) {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function starShape(outer = 0.28, inner = 0.13, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const angle = i * Math.PI / points + Math.PI / 2;
    const radius = i % 2 ? inner : outer;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function polygonShape(points: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return s;
}

/** The renderer owns its scene, WebGL context, geometries, and materials. */
export class GameRenderer {
  readonly stats = { fps: 0, drawCalls: 0, triangles: 0 };
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly keyLight: THREE.DirectionalLight;
  private readonly camera = new THREE.PerspectiveCamera(37, 1, 0.1, 180);
  private readonly world = new THREE.Group();
  private readonly atmosphere = new THREE.Group();
  private readonly actor = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly feet: THREE.Group[] = [];
  private readonly platformNodes = new Map<string, THREE.Group>();
  private readonly hazardNodes = new Map<string, THREE.Group>();
  private readonly pickupNodes = new Map<string, THREE.Group>();
  private readonly checkpointNodes = new Map<string, THREE.Group>();
  private readonly materials = new Set<THREE.Material>();
  private readonly materialCache = new Map<string, THREE.Material>();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly actorMaterials = new Set<THREE.Material>();
  private readonly actorGeometries = new Set<THREE.BufferGeometry>();
  private readonly decorative: { mesh: THREE.Object3D; x: number; speed: number; phase: number; y: number; rain: boolean }[] = [];
  private palette: Palette = PALETTES.sakura;
  private stage?: Stage;
  private quality: Quality;
  private elapsed = 0;
  private cameraX = 0;
  private cameraY = 2;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private reducedMotion = false;
  private motionQuery?: MediaQueryList;
  private motionListener?: (event: MediaQueryListEvent) => void;
  private composer?: EffectComposer;
  private scarf!: THREE.Group;
  private eyes!: THREE.Group;
  private deathFlash!: THREE.Mesh;
  private readonly shared = {
    sphere: new THREE.SphereGeometry(1, 20, 12),
    box: new THREE.BoxGeometry(1, 1, 1),
    cone: new THREE.ConeGeometry(1, 1, 5),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    plane: new THREE.PlaneGeometry(1, 1),
    torus: new THREE.TorusGeometry(1, 0.1, 8, 24),
  };

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: false, powerPreference: quality === 'high' ? 'high-performance' : 'default' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.scene.add(this.atmosphere, this.world, this.actor);
    const hemi = new THREE.HemisphereLight(0xe9eaeb, 0x222327, 1.15);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xf5f5f2, 1.6);
    this.keyLight = key;
    key.position.set(-4, 9, 12);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -13; key.shadow.camera.right = 13;
    key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
    key.shadow.normalBias = 0.03;
    this.scene.add(key);
    this.camera.position.set(0, 4, 14.5);
    this.actor.add(this.tail, this.body);
    this.createCat();
    this.actor.scale.setScalar(0.65);
    for (const m of this.materials) this.actorMaterials.add(m);
    for (const g of this.geometries) this.actorGeometries.add(g);
    this.configureBloom();
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionQuery.matches;
      this.motionListener = e => { this.reducedMotion = e.matches; };
      this.motionQuery.addEventListener?.('change', this.motionListener);
    }
    this.resize();
  }

  private mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const key = `std:${color}:${JSON.stringify(opts)}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached as THREE.MeshStandardMaterial;
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true, ...opts });
    this.materials.add(m);
    this.materialCache.set(key, m);
    return m;
  }

  private unlit(color: number, opacity = 1) {
    const key = `basic:${color}:${opacity}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached as THREE.MeshBasicMaterial;
    const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1, side: THREE.DoubleSide });
    this.materials.add(m);
    this.materialCache.set(key, m);
    return m;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  private ellipsoid(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = this.mesh(this.shared.sphere, material, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }

  private box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = this.mesh(this.shared.box, material, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }

  private extrusion(parent: THREE.Object3D, shape: THREE.Shape, material: THREE.Material, depth = 0.12, bevel = 0.03) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 5, steps: 1 });
    this.geometries.add(geometry);
    return this.mesh(geometry, material, parent);
  }

  private line(parent: THREE.Object3D, points: THREE.Vector3[], color: number, width = 0.035) {
    const mat = this.unlit(color);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const v = new THREE.Vector3().subVectors(b, a);
      const m = this.mesh(this.shared.cylinder, mat, parent, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      m.scale.set(width, v.length(), width);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    }
  }

  private createCat() {
    const cream = this.mat(0xd8d8d4, { roughness: 1, flatShading: true });
    const white = this.mat(0xf8f7f1, { roughness: 1, flatShading: true });
    const amber = this.mat(0x36383b, { roughness: 1, flatShading: true });
    const dark = this.mat(0x101113, { roughness: 0.8 });
    const pink = this.mat(0x919397, { roughness: 1 });
    const coral = this.mat(0x54e5e5, { emissive: 0x27bdc5, emissiveIntensity: 0.5 });
    const scarf = this.mat(0x54e5e5, { emissive: 0x20b3bd, emissiveIntensity: 0.55, roughness: 0.8 });
    const scarfDark = this.mat(0xb6f6f4, { emissive: 0x2abcc5, emissiveIntensity: 0.4 });
    // The actor's origin is the feet. A large face occupies the upper half of its silhouette.
    this.ellipsoid(this.body, amber, 0, 0.53, 0, 0.31, 0.43, 0.27);
    this.ellipsoid(this.body, cream, 0, 0.48, 0.23, 0.24, 0.30, 0.09);
    this.ellipsoid(this.body, cream, 0, 1.00, 0.08, 0.52, 0.46, 0.39);
    this.ellipsoid(this.body, white, 0, 0.91, 0.42, 0.42, 0.28, 0.07);
    // The ears are asymmetric in pose, giving a readable outline even at phone size.
    for (const sign of [-1, 1]) {
      const ear = this.extrusion(this.body, polygonShape([[sign * 0.29, 1.22], [sign * 0.47, 1.69], [sign * 0.03, 1.42]]), amber, 0.19, 0.04);
      ear.position.z = 0.04;
      const inner = this.extrusion(this.body, polygonShape([[sign * 0.27, 1.33], [sign * 0.44, 1.58], [sign * 0.13, 1.42]]), pink, 0.015, 0.006);
      inner.position.z = 0.27;
      this.ellipsoid(this.body, pink, sign * 0.33, 0.94, 0.49, 0.11, 0.057, 0.013);
    }
    this.eyes = new THREE.Group(); this.body.add(this.eyes);
    for (const sign of [-1, 1]) {
      this.ellipsoid(this.eyes, this.mat(0x57eeee, { emissive: 0x36e5e5, emissiveIntensity: 1.4 }), sign * 0.19, 1.055, 0.492, 0.074, 0.115, 0.022);
      this.ellipsoid(this.eyes, white, sign * 0.207 - 0.02, 1.105, 0.515, 0.022, 0.034, 0.008);
      this.ellipsoid(this.body, white, sign * 0.12, 0.84, 0.49, 0.16, 0.10, 0.04);
      this.line(this.body, [new THREE.Vector3(sign * 0.33, 0.87, 0.50), new THREE.Vector3(sign * 0.55, 0.92, 0.48)], 0x665061, 0.008);
      this.line(this.body, [new THREE.Vector3(sign * 0.34, 0.81, 0.50), new THREE.Vector3(sign * 0.55, 0.78, 0.48)], 0x665061, 0.008);
    }
    this.ellipsoid(this.body, coral, 0, 0.88, 0.554, 0.055, 0.04, 0.017);
    this.line(this.body, [new THREE.Vector3(0, 0.84, 0.556), new THREE.Vector3(-0.05, 0.80, 0.54), new THREE.Vector3(-0.10, 0.83, 0.53)], 0x644459, 0.009);
    this.line(this.body, [new THREE.Vector3(0, 0.84, 0.556), new THREE.Vector3(0.05, 0.80, 0.54), new THREE.Vector3(0.10, 0.83, 0.53)], 0x644459, 0.009);
    // Tuft, neck scarf, and paw pads give the character its own identity.
    this.ellipsoid(this.body, amber, -0.08, 1.43, 0.13, 0.10, 0.14, 0.11);
    this.scarf = new THREE.Group(); this.body.add(this.scarf);
    this.ellipsoid(this.scarf, scarf, 0, 0.62, 0.12, 0.30, 0.10, 0.30);
    this.extrusion(this.scarf, roundedRect(0.17, 0.37, 0.06), scarfDark, 0.05, 0.015).position.set(0.14, 0.35, 0.30);
    for (const sign of [-1, 1]) {
      const foot = new THREE.Group(); this.actor.add(foot); this.feet.push(foot);
      foot.position.x = sign * 0.19;
      this.ellipsoid(foot, white, 0, 0.11, 0.22, 0.16, 0.12, 0.22);
      this.ellipsoid(foot, pink, 0, 0.035, 0.39, 0.064, 0.018, 0.02);
    }
    this.ellipsoid(this.tail, amber, -0.36, 0.59, -0.19, 0.12, 0.27, 0.12).rotation.z = -0.5;
    this.ellipsoid(this.tail, cream, -0.44, 0.79, -0.16, 0.15, 0.15, 0.14);
    const flashMat = this.unlit(0xff6478, 0.62);
    this.deathFlash = this.mesh(this.shared.sphere, flashMat, this.actor, 0, 0.85, 0.35);
    this.deathFlash.scale.set(0.8, 0.85, 0.1);
    this.deathFlash.visible = false;
  }

  setStage(stage: Stage) {
    this.clearStage();
    this.stage = stage;
    this.palette = PALETTES[stage.theme];
    const p = this.palette;
    this.scene.background = new THREE.Color(p.sky);
    this.scene.fog = new THREE.FogExp2(p.fog, stage.theme === 'sky' ? 0.014 : 0.019);
    this.renderer.setClearColor(p.sky);
    this.buildAtmosphere(stage);
    for (const platform of stage.platforms) this.createPlatform(platform, stage.theme);
    for (const hazard of stage.hazards) this.createHazard(hazard);
    for (const pickup of stage.pickups) this.createPickup(pickup.id, pickup.x, pickup.y);
    for (const checkpoint of stage.checkpoints) this.createCheckpoint(checkpoint.id, checkpoint.x, checkpoint.y);
    this.createExit(stage.exit.x, stage.exit.y);
    this.cameraX = stage.spawn.x;
    this.cameraY = stage.spawn.y + 2;
  }

  private clearStage() {
    this.world.clear(); this.atmosphere.clear();
    this.platformNodes.clear(); this.hazardNodes.clear(); this.pickupNodes.clear(); this.checkpointNodes.clear();
    this.decorative.length = 0;
    for (const geometry of this.geometries) if (!this.actorGeometries.has(geometry)) {
      geometry.dispose(); this.geometries.delete(geometry);
    }
    for (const material of this.materials) if (!this.actorMaterials.has(material)) {
      material.dispose(); this.materials.delete(material);
    }
    for (const [key, material] of this.materialCache) if (!this.materials.has(material)) this.materialCache.delete(key);
  }

  private createPlatform(platform: Platform, theme: Theme) {
    const p = this.palette, g = new THREE.Group();
    g.position.set(platform.x + platform.w / 2, platform.y - platform.h / 2, 0);
    this.world.add(g); this.platformNodes.set(platform.id, g);
    const body = this.extrusion(g, roundedRect(platform.w, platform.h, Math.min(0.15, platform.h * 0.22)), this.mat(p.ground), 0.55, 0.035);
    body.position.z = -0.33; body.receiveShadow = true; body.castShadow = this.quality === 'high';
    const cap = this.extrusion(g, roundedRect(platform.w + 0.08, 0.17, 0.075), this.mat(p.top), 0.57, 0.025);
    cap.position.set(0, platform.h / 2 - 0.04, -0.31); cap.receiveShadow = true;
    const lip = this.box(g, this.mat(p.edge, { emissive: p.edge, emissiveIntensity: theme === 'neon' || theme === 'glitch' ? 0.9 : 0.12 }), 0, platform.h / 2 - 0.12, 0.36, platform.w, 0.027, 0.035);
    lip.receiveShadow = false;
    // Repeated inset marks make each platform read as constructed architecture.
    const markCount = Math.min(Math.floor(platform.w / 1.1), 18);
    const markMat = this.mat(p.near, { transparent: true, opacity: 0.53 });
    for (let i = 0; i < markCount; i++) {
      const x = -platform.w / 2 + (i + 0.5) * platform.w / markCount;
      if (theme === 'sawmill') {
        this.box(g, markMat, x, 0, 0.29, 0.035, Math.min(platform.h * 0.7, 0.5), 0.02);
        this.ellipsoid(g, this.mat(p.edge), x - 0.13, platform.h / 2 - 0.01, 0.34, 0.025, 0.025, 0.025);
      } else if (theme === 'neon' || theme === 'glitch') {
        this.box(g, markMat, x, 0, 0.30, 0.04, Math.min(platform.h * 0.5, 0.34), 0.02);
      } else if (theme === 'sky') {
        this.ellipsoid(g, this.mat(p.mid), x, -platform.h / 2 + 0.02, 0.14, 0.2, 0.13, 0.16);
      } else {
        this.box(g, markMat, x, 0, 0.27, 0.02, Math.min(platform.h * 0.45, 0.36), 0.02);
      }
    }
    if (platform.kind === 'moving') {
      this.box(g, this.mat(p.accent2, { emissive: p.accent2, emissiveIntensity: 0.4 }), 0, -platform.h / 2 + 0.07, 0.37, Math.max(0.2, platform.w - 0.25), 0.06, 0.06);
      for (const sign of [-1, 1]) this.ellipsoid(g, this.mat(p.accent2), sign * (platform.w / 2 - 0.14), 0, 0.41, 0.07, 0.07, 0.035);
    } else if (platform.kind === 'crumble') {
      for (let i = 0; i < 3; i++) {
        const x = -platform.w * 0.26 + i * platform.w * 0.22;
        this.line(g, [new THREE.Vector3(x, platform.h / 2 - 0.1, 0.42), new THREE.Vector3(x + 0.11, 0.02, 0.43), new THREE.Vector3(x + 0.03, -platform.h * 0.3, 0.44)], p.near, 0.013);
      }
    } else if (platform.kind === 'conveyor') {
      for (let i = 0; i < markCount; i++) {
        const x = -platform.w / 2 + (i + 0.5) * platform.w / markCount;
        this.extrusion(g, polygonShape([[x - 0.10, platform.h / 2 + 0.06], [x + 0.03, platform.h / 2 + 0.12], [x - 0.10, platform.h / 2 + 0.18]]), this.mat(p.accent2), 0.015, 0).position.z = 0.1;
      }
    }
    if (platform.w >= 3.5) this.platformProp(g, platform.w, platform.h, theme);
  }

  private platformProp(g: THREE.Group, w: number, h: number, theme: Theme) {
    const p = this.palette;
    const x = w / 2 - 0.45;
    const baseY = h / 2 + 0.10;
    const prop = new THREE.Group(); prop.position.set(x, baseY, -0.65); g.add(prop);
    if (theme === 'sakura') {
      this.box(prop, this.mat(p.near), 0, 0.31, 0, 0.065, 0.62, 0.07);
      this.box(prop, this.mat(p.edge), 0, 0.63, 0, 0.50, 0.065, 0.08);
      this.ellipsoid(prop, this.mat(p.accent, { emissive: p.accent, emissiveIntensity: 0.22 }), 0, 0.69, 0, 0.16, 0.11, 0.12);
    } else if (theme === 'sawmill') {
      this.box(prop, this.mat(p.near), 0, 0.27, 0, 0.43, 0.55, 0.40);
      this.line(prop, [new THREE.Vector3(-0.22, 0.54, 0.22), new THREE.Vector3(0.21, 0.02, 0.22)], p.edge, 0.025);
    } else if (theme === 'neon') {
      this.box(prop, this.mat(p.near), 0, 0.40, 0, 0.40, 0.80, 0.22);
      this.box(prop, this.mat(p.accent2, { emissive: p.accent2, emissiveIntensity: 1.5 }), 0, 0.50, 0.13, 0.26, 0.08, 0.015);
      this.box(prop, this.mat(p.accent, { emissive: p.accent, emissiveIntensity: 1.2 }), 0, 0.34, 0.13, 0.18, 0.04, 0.015);
    } else if (theme === 'sky') {
      this.box(prop, this.mat(p.top), 0, 0.27, 0, 0.11, 0.54, 0.11);
      this.ellipsoid(prop, this.mat(p.accent, { emissive: p.accent, emissiveIntensity: 0.34 }), 0, 0.63, 0, 0.13, 0.13, 0.13);
    } else {
      this.box(prop, this.mat(p.near), 0, 0.35, 0, 0.08, 0.7, 0.08);
      this.box(prop, this.mat(p.accent2, { emissive: p.accent2, emissiveIntensity: 1 }), 0.07, 0.58, 0, 0.39, 0.035, 0.04);
      this.box(prop, this.mat(p.accent, { emissive: p.accent, emissiveIntensity: 1 }), -0.11, 0.30, 0, 0.25, 0.035, 0.04);
    }
  }

  private createHazard(h: Hazard) {
    const p = this.palette, g = new THREE.Group();
    g.position.set(h.x + h.w / 2, h.y + h.h / 2, 0.63);
    this.world.add(g); this.hazardNodes.set(h.id, g);
    const danger = this.mat(p.danger, { emissive: p.danger, emissiveIntensity: 0.85, metalness: 0.2 });
    const steel = this.mat(0x45536a, { metalness: 0.63, roughness: 0.35 });
    if (h.kind === 'spikes') {
      this.box(g, steel, 0, -h.h / 2 + 0.035, 0, h.w, 0.07, 0.36);
      const count = Math.max(2, Math.ceil(h.w / 0.34));
      for (let i = 0; i < count; i++) {
        const x = -h.w / 2 + (i + 0.5) * h.w / count;
        const spike = this.extrusion(g, polygonShape([[x - h.w / count * 0.43, -h.h / 2], [x, h.h / 2 + 0.06], [x + h.w / count * 0.43, -h.h / 2]]), danger, 0.22, 0.009);
        spike.position.z = -0.09;
      }
    } else if (h.kind === 'saw') {
      const radius = Math.max(0.17, Math.min(h.w, h.h) * 0.48);
      const teeth: [number, number][] = [];
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const r = radius * (i % 2 ? 0.78 : 1.08);
        teeth.push([Math.cos(angle) * r, Math.sin(angle) * r]);
      }
      this.extrusion(g, polygonShape(teeth), steel, 0.13, 0.007);
      this.ellipsoid(g, danger, 0, 0, 0.24, radius * 0.26, radius * 0.26, 0.05);
      this.ellipsoid(g, this.mat(p.glow, { emissive: p.glow, emissiveIntensity: 1 }), 0, 0, 0.30, radius * 0.08, radius * 0.08, 0.015);
    } else {
      this.box(g, steel, -h.w / 2, 0, 0, 0.15, h.h + 0.24, 0.25);
      this.box(g, steel, h.w / 2, 0, 0, 0.15, h.h + 0.24, 0.25);
      this.box(g, danger, 0, 0, 0, h.w, Math.max(0.045, h.h * 0.2), 0.045);
      this.box(g, this.unlit(p.danger, 0.2), 0, 0, -0.015, h.w, h.h, 0.01);
    }
  }

  private createPickup(id: string, x: number, y: number) {
    const p = this.palette, g = new THREE.Group();
    g.position.set(x, y, 0.85); this.world.add(g); this.pickupNodes.set(id, g);
    if(this.stage?.pickups.find(pickup=>pickup.id===id)?.secret){
      const frame=this.mesh(this.shared.torus,this.mat(0x88ffdc,{emissive:0x55ffcd,emissiveIntensity:1.1}),g);
      frame.scale.set(.24,.31,.23);
      this.ellipsoid(g,this.unlit(0x88ffdc,.12),0,0,-.03,.43,.5,.02);
      this.box(g,this.mat(0xe4eeeb),0,0,.02,.13,.20,.08);
      this.box(g,this.unlit(0x111817),0,.01,.07,.04,.11,.01);
      return;
    }
    const halo = this.mesh(this.shared.sphere, this.unlit(p.accent, 0.16), g);
    halo.scale.set(0.39, 0.39, 0.025);
    const star = this.extrusion(g, starShape(0.25, 0.105), this.mat(p.edge, { emissive: p.accent, emissiveIntensity: 0.75, metalness: 0.24, roughness: 0.35 }), 0.08, 0.012);
    star.position.z = 0.01;
    this.ellipsoid(g, this.unlit(0xffffff), 0, 0.05, 0.13, 0.055, 0.055, 0.01);
  }

  private createCheckpoint(id: string, x: number, y: number) {
    const p = this.palette, g = new THREE.Group(); g.position.set(x, y, -0.11);
    this.world.add(g); this.checkpointNodes.set(id, g);
    this.box(g, this.mat(p.near, { metalness: 0.3 }), 0, 0.80, 0, 0.075, 1.6, 0.075);
    this.ellipsoid(g, this.mat(p.edge, { emissive: p.edge, emissiveIntensity: 0.2 }), 0, 1.65, 0, 0.10, 0.10, 0.10);
    const flag = this.extrusion(g, polygonShape([[0.05, 1.53], [0.57, 1.41], [0.45, 1.14], [0.05, 1.19]]), this.mat(p.accent2, { emissive: p.accent2, emissiveIntensity: 0.3 }), 0.06, 0.01);
    flag.position.z = 0.06;
    this.extrusion(g, starShape(0.09, 0.036), this.unlit(p.edge), 0.01, 0).position.set(0.28, 1.36, 0.14);
    const activeHalo = this.ellipsoid(g, this.unlit(p.glow, 0.22), 0.28, 1.36, 0.12, 0.46, 0.46, 0.015);
    activeHalo.visible = false;
    g.userData.activeHalo = activeHalo;
  }

  private createExit(x: number, y: number) {
    const p = this.palette, g = new THREE.Group(); g.position.set(x, y + 0.9, -0.32); this.world.add(g);
    const frame = this.mat(p.accent2, { emissive: p.accent2, emissiveIntensity: 0.8, metalness: 0.34 });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.075, 10, 40, Math.PI), frame);
    this.geometries.add(arch.geometry); arch.position.y = 0.26; g.add(arch);
    this.box(g, frame, -0.69, -0.38, 0, 0.15, 1.25, 0.20);
    this.box(g, frame, 0.69, -0.38, 0, 0.15, 1.25, 0.20);
    this.ellipsoid(g, this.unlit(p.glow, 0.24), 0, -0.1, -0.1, 0.57, 0.87, 0.015);
    this.ellipsoid(g, this.mat(p.glow, { emissive: p.glow, emissiveIntensity: 1.6 }), 0, 1.03, 0.04, 0.13, 0.13, 0.1);
  }

  private buildAtmosphere(stage: Stage) {
    const p = this.palette, theme = stage.theme;
    const span = Math.ceil((stage.length + 28) / 12);
    const moonX = theme === 'sakura' ? 8.5 : stage.length * 0.38;
    const moon = this.ellipsoid(this.atmosphere, this.unlit(p.light, 0.87), moonX, theme === 'sakura' ? 6.8 : 10.3, -19, theme === 'sky' ? 2.3 : 1.7, theme === 'sky' ? 2.3 : 1.7, 0.1);
    moon.name = 'moon';
    // A cut across the pale disc gives the moon a deliberate, unsettling crescent.
    this.ellipsoid(this.atmosphere, this.unlit(p.sky, 0.97), moon.position.x + 0.72, moon.position.y + 0.34, -18.84, theme === 'sky' ? 2.03 : 1.50, theme === 'sky' ? 2.03 : 1.50, 0.08);
    for (let i = -2; i < span + 2; i++) {
      const x = i * 12;
      this.distantSilhouette(x, i, stage.theme);
      this.middleArchitecture(x, i, stage.theme);
      this.nearDetails(x, i, stage.theme);
    }
    this.floatingParticles(stage.length, theme);
  }

  private distantSilhouette(x: number, seed: number, theme: Theme) {
    const p = this.palette, g = new THREE.Group(); g.position.set(x, 0, -17); this.atmosphere.add(g);
    const farMat = this.unlit(p.far);
    if (theme === 'sky') {
      for (let j = 0; j < 4; j++) {
        const cx = j * 3.4 + rand(seed * 19 + j) * 1.4;
        const height = 4 + rand(seed * 22 + j) * 5;
        this.box(g, farMat, cx, height * 0.5 - 1.6, 0, 0.4 + rand(j + seed) * 0.3, height, 0.45);
        this.mesh(this.shared.cone, farMat, g, cx, height - 1.4, 0).scale.set(0.34, 0.9, 0.32);
      }
    } else {
      const roof = theme === 'sakura' ? 0.35 : theme === 'sawmill' ? 0.4 : 0;
      for (let j = 0; j < 5; j++) {
        const w = 2.0 + rand(seed * 23 + j) * 1.9;
        const h = 2.3 + rand(seed * 61 + j) * (theme === 'neon' ? 7 : 4);
        const bx = j * 2.8;
        this.box(g, farMat, bx, h / 2 - 2.2, 0, w, h, 0.35);
        if (roof) this.mesh(this.shared.cone, farMat, g, bx, h - 1.8, 0).scale.set(w * 0.6, roof, 0.5);
        if (theme === 'glitch' && j % 2 === 0) this.box(g, this.unlit(p.accent2, 0.33), bx + 0.4, h - 3.2, 0.3, 0.8, 0.07, 0.01);
      }
      // Tiny eyes sit well behind the collision plane; they never cue a jump scare.
      if (seed % 3 === 0) {
        const eyeMat = this.unlit(theme === 'neon' ? p.accent : 0xaaaead, 0.48);
        this.ellipsoid(g, eyeMat, 4.1, 1.65, 0.52, 0.045, 0.022, 0.01);
        this.ellipsoid(g, eyeMat, 4.31, 1.65, 0.52, 0.045, 0.022, 0.01);
      }
    }
  }

  private middleArchitecture(x: number, seed: number, theme: Theme) {
    const p = this.palette, g = new THREE.Group(); g.position.set(x, -1, -10); this.atmosphere.add(g);
    const mid = this.mat(p.mid, { roughness: 0.9 });
    const dark = this.mat(p.near);
    if (theme === 'sakura') {
      // Torii gates and tree silhouettes anchor the rooftop world.
      this.box(g, dark, 1.1, 2.7, 0, 0.22, 5.4, 0.25);
      this.box(g, dark, 5.5, 2.7, 0, 0.22, 5.4, 0.25);
      this.box(g, mid, 3.3, 5.0, 0, 5.2, 0.24, 0.36);
      this.box(g, mid, 3.3, 5.8, 0, 5.9, 0.30, 0.39);
      this.box(g, dark, 8.7, 1.8, 0, 0.26, 3.7, 0.25);
      this.line(g, [new THREE.Vector3(8.7, 2.5, 0.05), new THREE.Vector3(7.9, 3.35, 0.05), new THREE.Vector3(7.1, 3.54, 0.05)], p.near, 0.065);
      this.line(g, [new THREE.Vector3(8.7, 2.9, 0.05), new THREE.Vector3(9.5, 4.05, 0.05), new THREE.Vector3(10.4, 4.30, 0.05)], p.near, 0.065);
      this.line(g, [new THREE.Vector3(8.25, 3.04, 0.05), new THREE.Vector3(7.72, 4.13, 0.05)], p.near, 0.032);
      this.line(g, [new THREE.Vector3(9.45, 3.96, 0.05), new THREE.Vector3(9.54, 4.90, 0.05)], p.near, 0.032);
    } else if (theme === 'sawmill') {
      this.box(g, mid, 2.2, 1.4, 0, 3.4, 2.8, 0.8);
      this.mesh(this.shared.cone, dark, g, 2.2, 3.5, 0).scale.set(2.3, 1.1, 0.6);
      this.box(g, mid, 8.5, 2.7, 0, 0.65, 5.4, 0.7);
      this.box(g, dark, 8.5, 5.35, 0, 1.55, 0.25, 0.8);
      const wheel = this.mesh(this.shared.torus, this.mat(p.edge, { metalness: 0.3 }), g, 5.7, 1.3, 0.55);
      wheel.scale.setScalar(1.1);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        this.line(g, [new THREE.Vector3(5.7, 1.3, 0.55), new THREE.Vector3(5.7 + Math.cos(a), 1.3 + Math.sin(a), 0.55)], p.edge, 0.035);
      }
    } else if (theme === 'neon') {
      for (let i = 0; i < 4; i++) {
        const bx = 1.5 + i * 3.1, h = 4 + rand(seed * 73 + i) * 5;
        this.box(g, mid, bx, h / 2, 0, 2.3, h, 0.7);
        const strip = this.mat(i % 2 ? p.accent2 : p.accent, { emissive: i % 2 ? p.accent2 : p.accent, emissiveIntensity: 1.7 });
        this.box(g, strip, bx - 0.7, h - 0.5, 0.38, 0.05, 0.8, 0.04);
        for (let row = 0; row < Math.floor(h / 0.9); row++) {
          for (let col = 0; col < 2; col++) {
            if (rand(seed * 138 + i * 29 + row * 3 + col) > 0.34) this.box(g, this.unlit(row % 3 ? 0xffdb9e : p.accent, 0.65), bx - 0.5 + col * 1.0, 0.5 + row * 0.9, 0.37, 0.36, 0.13, 0.01);
          }
        }
      }
    } else if (theme === 'sky') {
      for (let i = 0; i < 3; i++) {
        const bx = 2 + i * 4.1, h = 2.5 + rand(seed * 83 + i) * 4;
        this.box(g, mid, bx, h / 2 - 0.4, 0, 0.72, h, 0.7);
        this.mesh(this.shared.cone, mid, g, bx, h - 0.1, 0).scale.set(0.7, 1.0, 0.7);
        this.ellipsoid(g, this.unlit(p.glow, 0.55), bx + 1.6, h - 0.8, -0.6, 1.6, 0.42, 0.23);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const bx = i * 2.8 + rand(seed + i) * 1.2, h = 3 + rand(seed * 52 + i) * 5;
        const piece = this.box(g, mid, bx, h / 2, 0, 1.1, h, 0.7);
        piece.rotation.z = (rand(seed * 24 + i) - 0.5) * 0.25;
        this.box(g, this.mat(i % 2 ? p.accent2 : p.accent, { emissive: i % 2 ? p.accent2 : p.accent, emissiveIntensity: 1.1 }), bx + 0.4, h * 0.7, 0.41, 0.05, h * 0.26, 0.03);
      }
    }
  }

  private nearDetails(x: number, seed: number, theme: Theme) {
    const p = this.palette, g = new THREE.Group(); g.position.set(x, -1.9, -4.8); this.atmosphere.add(g);
    const near = this.mat(p.near, { roughness: 0.94 });
    if (theme === 'sakura') {
      for (let i = 0; i < 3; i++) {
        const bx = 1.0 + i * 4.2;
        this.box(g, near, bx, 0.6, 0, 2.9, 1.3, 0.8);
        this.box(g, this.mat(p.edge), bx, 1.24, 0.12, 3.1, 0.07, 0.55);
        this.box(g, near, bx - 0.65, 1.6, 0, 0.11, 0.65, 0.11);
        this.line(g, [new THREE.Vector3(bx - 1.35, 1.32, 0.2), new THREE.Vector3(bx - 0.72, 1.64, 0.2), new THREE.Vector3(bx - 0.15, 1.32, 0.2)], p.near, 0.025);
      }
    } else if (theme === 'sawmill') {
      for (let i = 0; i < 3; i++) {
        const bx = 1.4 + i * 3.8;
        this.box(g, near, bx, 0.45, 0, 2.6, 0.9, 0.9);
        this.ellipsoid(g, this.mat(p.top), bx - 0.45, 1.1, 0.3, 0.24, 0.24, 0.26);
        this.ellipsoid(g, this.mat(p.top), bx + 0.05, 1.1, 0.3, 0.24, 0.24, 0.26);
      }
    } else if (theme === 'neon') {
      this.box(g, near, 5.8, 0.8, 0, 12, 1.6, 0.8);
      for (let i = 0; i < 12; i++) this.box(g, this.unlit(i % 2 ? p.accent : p.accent2, 0.48), 0.5 + i, 1.55, 0.48, 0.56, 0.025, 0.02);
    } else if (theme === 'sky') {
      for (let i = 0; i < 3; i++) this.ellipsoid(g, near, 1 + i * 4.5, 0.4, 0, 2.4, 0.7, 0.8);
    } else {
      for (let i = 0; i < 4; i++) {
        const bx = i * 3.3 + 1;
        const shard = this.extrusion(g, polygonShape([[bx - 0.5, 0], [bx + 0.2, 2.6], [bx + 0.7, 0]]), near, 0.45, 0);
        shard.rotation.z = (rand(seed * 31 + i) - 0.5) * 0.3;
      }
    }
  }

  private floatingParticles(length: number, theme: Theme) {
    const p = this.palette;
    const count = Math.min(this.quality === 'low' ? 65 : this.quality === 'balanced' ? 115 : 170, Math.ceil(length * 1.2));
    const geometry = this.shared.plane;
    const material = this.unlit(theme === 'sky' ? 0xe8e8e3 : 0xb8b8b6, theme === 'neon' ? 0.32 : 0.38);
    const inst = new THREE.InstancedMesh(geometry, material, count);
    inst.frustumCulled = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(rand(i * 13 + 5) * (length + 24) - 12, rand(i * 43 + 9) * 11 - 1, -2.5 - rand(i * 97) * 7);
      dummy.rotation.z = rand(i * 11) * Math.PI;
      const s = 0.018 + rand(i * 37 + 1) * (theme === 'sakura' ? 0.065 : 0.05);
      dummy.scale.set(s, s * (theme === 'sakura' ? 0.65 : 1), 1);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.atmosphere.add(inst);
    // A few large near particles add motion without shifting the gameplay geometry.
    for (let i = 0; i < Math.min(28, count / 4); i++) {
      const x = rand(i * 81 + 1) * (length + 20) - 10;
      const y = rand(i * 95 + 5) * 8;
      const mesh = this.mesh(this.shared.plane, material, this.atmosphere, x, y, -1.8);
      mesh.scale.set(theme === 'neon' ? 0.012 : 0.052, theme === 'neon' ? 0.48 : theme === 'sakura' ? 0.036 : 0.052, 1);
      mesh.rotation.z = theme === 'neon' ? -0.18 : rand(i * 7) * Math.PI;
      this.decorative.push({ mesh, x, y, phase: rand(i * 7) * Math.PI * 2, speed: 0.15 + rand(i * 59) * 0.4, rain: theme === 'neon' });
    }
  }

  private configureBloom() {
    this.composer?.dispose();
    this.composer = undefined;
    if (this.quality !== 'high') return;
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.25, 0.78));
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || this.canvas.width || 1);
    const height = Math.max(1, this.canvas.clientHeight || this.canvas.height || 1);
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'low' ? 1 : this.quality === 'balanced' ? 1.5 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = this.camera.aspect < 0.9 ? 51 : this.camera.aspect < 1.45 ? 43 : 37;
    this.camera.updateProjectionMatrix();
  }

  setQuality(quality: Quality) {
    this.quality = quality;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.keyLight.castShadow = quality === 'high';
    this.configureBloom();
    this.resize();
    if (this.stage) this.setStage(this.stage);
  }

  render(state: GameState, _alpha: number, elapsed: number, dt: number) {
    if (!this.stage || this.stage.id !== state.stage.id) this.setStage(state.stage);
    const stage = state.stage, player = state.player;
    this.elapsed = elapsed;
    const menu = state.mode === 'menu';
    const smooth = menu || this.reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, dt) * 5.4);
    const aspect = this.camera.aspect;
    const look = player.facing >= 0 ? 2.55 : -2.55;
    const targetX = menu ? player.x - (aspect > 1.1 ? 3.0 : 0.7) : Math.max(0, Math.min(stage.length, player.x + look));
    this.cameraX += (targetX - this.cameraX) * smooth;
    this.cameraY += (player.y + 2.05 - this.cameraY) * smooth;
    const cameraLift = menu ? 1.55 : aspect < 0.85 ? 1.7 : 2.0;
    const distance = menu ? (aspect < 0.85 ? 12.5 : 10.8) : aspect < 0.85 ? 18.5 : aspect < 1.35 ? 17 : 14.5;
    this.camera.position.set(this.cameraX, this.cameraY + cameraLift, distance);
    this.camera.lookAt(this.cameraX, this.cameraY + 0.5, -0.3);
    this.actor.position.set(player.x, player.y, 0.44);
    const moving = Math.abs(player.vx) > 0.3 && player.grounded;
    const dash = player.dashTime > 0;
    const t = this.reducedMotion ? 0 : elapsed;
    this.body.position.y = moving ? Math.abs(Math.sin(t * 13)) * 0.045 : Math.sin(t * 2.6) * 0.02;
    this.body.rotation.z = dash ? -player.facing * 0.23 : !player.grounded ? Math.max(-0.13, Math.min(0.13, -player.vy * 0.018)) : moving ? Math.sin(t * 13) * 0.035 : 0;
    this.body.scale.set(dash ? 1.13 : 1, dash ? 0.84 : 1, 1);
    this.tail.rotation.z = moving ? Math.sin(t * 9) * 0.38 : Math.sin(t * 3) * 0.2;
    this.scarf.rotation.z = moving ? Math.sin(t * 11) * 0.045 : Math.sin(t * 2.4) * 0.035;
    this.eyes.scale.y = Math.sin(t * 0.72) > 0.996 ? 0.12 : 1;
    for (let i = 0; i < 2; i++) {
      this.feet[i].position.y = moving ? Math.max(0, Math.sin(t * 13 + i * Math.PI)) * 0.11 : 0;
      this.feet[i].rotation.z = moving ? Math.sin(t * 13 + i * Math.PI) * 0.15 : 0;
    }
    this.deathFlash.visible = player.deadTime > 0;
    this.deathFlash.scale.setScalar(0.8 + player.deadTime * 0.2);
    for (const platform of stage.platforms) {
      const node = this.platformNodes.get(platform.id);
      if (!node) continue;
      node.position.x = platform.x + platform.w / 2;
      node.position.y = platform.y - platform.h / 2;
      node.visible = platform.active !== false;
      if (platform.kind === 'crumble') node.rotation.z = platform.active === false ? 0.1 : 0;
    }
    for (const hazard of stage.hazards) {
      const node = this.hazardNodes.get(hazard.id);
      if (!node) continue;
      node.position.set(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, 0.63);
      node.visible = hazard.active !== false;
      if (hazard.kind === 'saw' && !this.reducedMotion) node.rotation.z = t * 4 + (hazard.phase ?? 0);
      if (hazard.kind === 'laser') node.scale.y = hazard.active === false ? 0.05 : 1;
    }
    for (const pickup of stage.pickups) {
      const node = this.pickupNodes.get(pickup.id);
      if (!node) continue;
      node.visible = !pickup.collected;
      node.position.set(pickup.x, pickup.y + (this.reducedMotion ? 0 : Math.sin(t * 3 + pickup.x) * 0.13), 0.85);
      // Keep the five-point silhouette facing the camera at every animation phase.
      node.rotation.z = this.reducedMotion ? 0 : Math.sin(t * 1.7 + pickup.x) * 0.16;
    }
    for (const checkpoint of stage.checkpoints) {
      const node = this.checkpointNodes.get(checkpoint.id);
      if (!node) continue;
      node.position.set(checkpoint.x, checkpoint.y, -0.11);
      node.scale.setScalar(checkpoint.active ? 1.11 : 1);
      (node.userData.activeHalo as THREE.Object3D).visible = checkpoint.active;
    }
    if (!this.reducedMotion) {
      for (const mote of this.decorative) {
        mote.mesh.position.x = mote.x + (mote.rain ? -t * 0.12 : Math.sin(t * mote.speed + mote.phase) * 0.55);
        mote.mesh.position.y = mote.rain ? ((mote.y - t * (3 + mote.speed * 7)) % 11 + 11) % 11 - 1 : mote.y + Math.cos(t * mote.speed * 0.8 + mote.phase) * 0.24;
        if (!mote.rain) mote.mesh.rotation.z = t * mote.speed + mote.phase;
      }
    }
    this.renderer.info.reset();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    const info = this.renderer.info.render;
    this.stats.drawCalls = info.calls;
    this.stats.triangles = info.triangles;
    this.fpsAccum += dt; this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.stats.fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0; this.fpsFrames = 0;
    }
  }

  dispose() {
    if (this.motionQuery && this.motionListener) this.motionQuery.removeEventListener?.('change', this.motionListener);
    this.clearStage();
    this.composer?.dispose();
    for (const geometry of Object.values(this.shared)) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.materials.clear();
    this.materialCache.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
