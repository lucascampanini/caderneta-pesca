// Cenário de cada pesqueiro do Pantanal: trapiche, barranco, voadeira, margens com mata ciliar,
// camalotes de aguapé, capim, aves e a mata no horizonte. Tudo feito de primitivas (ver pantanal.js).
// The player always stands near the origin and casts toward -Z.

import * as THREE from "three";
import { disposeObject3D, randRange, pick } from "../utils/utils.js";
import { aguapes, capim, garca, tuiuiu, ipe, palmeira, barranco, ranchinho, voadeira, mataCiliar } from "./pantanal.js";

const WOOD = 0x6e5138;
const WOOD_DARK = 0x4c3725;

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts });
}

function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = false } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  if (shadow) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  return m;
}

// ---------- reusable scenery pieces ----------

function makePine(mat, leafMat, h = 4) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.09 * h * 0.25, 0.13 * h * 0.25, h * 0.42, 6), mat, {
    y: h * 0.21, shadow: true,
  });
  g.add(trunk);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const radius = h * 0.26 * (1 - t * 0.55);
    const cone = mesh(new THREE.ConeGeometry(radius, h * 0.34, 7), leafMat, {
      y: h * (0.42 + 0.2 * i), shadow: true,
    });
    g.add(cone);
  }
  return g;
}

function makeRock(mat, s = 1) {
  const rock = mesh(new THREE.DodecahedronGeometry(s, 0), mat, {
    sx: randRange(0.7, 1.3), sy: randRange(0.5, 0.9), sz: randRange(0.7, 1.3),
    ry: randRange(0, Math.PI), shadow: true,
  });
  return rock;
}

function makeReeds(stemMat, n = 7) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = randRange(0.7, 1.5);
    const stem = mesh(new THREE.CylinderGeometry(0.015, 0.022, h, 4), stemMat, {
      x: randRange(-0.5, 0.5), y: h / 2, z: randRange(-0.5, 0.5),
      rx: randRange(-0.12, 0.12), rz: randRange(-0.12, 0.12),
    });
    g.add(stem);
  }
  return g;
}

function makeBuoy() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.8, 10), std(0xd23b3b), { y: 0.3 });
  const cap = mesh(new THREE.SphereGeometry(0.3, 10, 8), std(0xe8e4da), { y: 0.78 });
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), std(0x333a44), { y: 1.3 });
  g.add(body, cap, pole);
  return g;
}

// Pantanal: no lugar de montanhas, uma mata ciliar baixa e contínua no horizonte (copas achatadas).
function makeMountainRing(group, { color, count = 12, rMin = 650, rMax = 950, hMin = 70, hMax = 200, arcStart = 0, arcEnd = Math.PI * 2 }) {
  const tons = [0x2e4a26, 0x34522a, 0x3c5a2e, 0x283f22];
  const mats = tons.map((c) => std(c, { flatShading: true }));
  const n = count * 9;
  for (let i = 0; i < n; i++) {
    const a = arcStart + (i / n) * (arcEnd - arcStart) + randRange(-0.02, 0.02);
    const r = randRange(rMin, rMax) * 0.85;
    const h = randRange(18, 38) * (0.6 + (hMax / 260) * 0.5);
    const blob = mesh(new THREE.SphereGeometry(h, 7, 5), mats[i % mats.length], {
      x: Math.sin(a) * r, y: h * 0.18, z: Math.cos(a) * r, sx: randRange(1.4, 2.4), sy: randRange(0.38, 0.6), sz: randRange(1.2, 2.0), ry: randRange(0, Math.PI),
    });
    group.add(blob);
  }
}

/** Irregular landmass: a noisy displaced disc sitting just above the water. */
function makeLandmass({ color, radius = 70, x = 0, z = 60, height = 2.2 }) {
  const geo = new THREE.CircleGeometry(radius, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const d = Math.sqrt(px * px + py * py) / radius;
    const bump =
      Math.sin(px * 0.08 + 3) * Math.cos(py * 0.07 + 1) * 0.8 +
      Math.sin(px * 0.21) * Math.cos(py * 0.18) * 0.4;
    pos.setZ(i, Math.max(0, (1 - d) * height + bump * (1 - d)));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, std(color, { flatShading: true }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, -0.55, z);
  m.receiveShadow = true;
  return m;
}

function makeDock({ length = 13, width = 2.4, deckY = 0.62, startZ = 9 }) {
  const g = new THREE.Group();
  const plankMat = std(WOOD);
  const postMat = std(WOOD_DARK);
  const plankCount = Math.floor(length / 0.62);
  for (let i = 0; i < plankCount; i++) {
    const z = startZ - i * 0.62 - 0.3;
    g.add(
      mesh(new THREE.BoxGeometry(width, 0.09, 0.55), plankMat, {
        y: deckY, z, ry: randRange(-0.015, 0.015), shadow: true,
      })
    );
  }
  for (let i = 0; i <= Math.floor(length / 3); i++) {
    const z = startZ - i * 3;
    for (const sx of [-1, 1]) {
      g.add(
        mesh(new THREE.CylinderGeometry(0.11, 0.13, deckY + 1.5, 7), postMat, {
          x: (sx * width) / 2 - sx * 0.08, y: (deckY - 1.2) / 2 + 0.2, z, shadow: true,
        })
      );
    }
  }
  // end posts stick up like mooring bollards
  for (const sx of [-1, 1]) {
    g.add(
      mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.5, 7), postMat, {
        x: (sx * width) / 2 - sx * 0.08, y: deckY + 0.22, z: startZ - length + 0.4, shadow: true,
      })
    );
  }
  return g;
}

// ---------- per-location builders (Pantanal) ----------
// O pescador fica perto da origem e arremessa para -Z: o que aparece na tela é a margem da frente e as laterais.

function bancoLateral(group, lado, z0, z1, x = 62) {
  // faixa de terra com mata ciliar e capim na beira, ao longo do eixo Z
  for (let z = z0; z > z1; z -= 70) group.add(makeLandmass({ color: 0x3f5f34, radius: 48, x: lado * (x + 40), z: z - 35, height: 2.4 }));
  mataCiliar(group, [[lado * (x + 4), z0], [lado * (x + 4), z1]], 8, 0.6);
  group.add(capim(900, [[lado * (x - 2), z0], [lado * (x - 2), z1]], 4, [0.6, 1.7], 0));
}

function buildLake(group) {
  group.add(makeLandmass({ color: 0x3d5a3a, radius: 80, z: 78, height: 2.6 }));
  // margem do fundo da baía e laterais fechando a lagoa
  for (let x = -260; x <= 260; x += 90) group.add(makeLandmass({ color: 0x3f5f34, radius: 60, x, z: -205, height: 2.2 }));
  mataCiliar(group, [[-240, -160], [-80, -150], [80, -155], [240, -165]], 9, 0.6, 0.12, 0.2);
  group.add(capim(1600, [[-240, -152], [240, -152]], 5, [0.7, 1.8]));
  bancoLateral(group, -1, 40, -140);
  bancoLateral(group, 1, 40, -140);
  // camalotes de aguapé nas beiradas e no fundo, fora do caminho do arremesso
  const longeDoArremesso = (x, z) => Math.abs(x) > 22 || z < -52 || z > -1;
  group.add(aguapes(1300, [-58, 58, -145, -6], longeDoArremesso));
  group.add(aguapes(70, [-14, 14, -5, 5], (x, z) => Math.abs(x) > 3.5));
  // capim e taboa na beira de trás, dos dois lados do trapiche
  group.add(capim(700, [[-40, 7], [-4, 6.5]], 3, [0.5, 1.5]));
  group.add(capim(700, [[4, 6.5], [40, 7]], 3, [0.5, 1.5]));
  const g1 = garca(); g1.position.set(-55, 0.1, -40); g1.rotation.y = 0.8; group.add(g1);
  const g2 = garca(); g2.position.set(-50, 0.1, -46); g2.rotation.y = 2.2; group.add(g2);
  const g3 = garca(false); g3.position.set(53, 0.1, -70); g3.rotation.y = -2.4; group.add(g3);
  const t = tuiuiu(); t.position.set(56, 0.15, -32); t.rotation.y = -2.6; group.add(t);
  const ip = ipe(9, 0xf2c12e); ip.position.set(-14, 0.7, 18); group.add(ip);
  const pa = palmeira(9); pa.position.set(12, 0.7, 16); group.add(pa);
  makeMountainRing(group, { color: 0x2c4242, count: 14 });
  group.add(makeDock({ length: 13, width: 2.4, deckY: 0.62, startZ: 9 }));
  return { playerSpot: new THREE.Vector3(0, 0.66, -2.6) };
}

function buildRiver(group) {
  // rio de água clara: margem da frente perto, pedras e galhada
  group.add(makeLandmass({ color: 0x49603c, radius: 95, z: 92, height: 3 }));
  for (let x = -240; x <= 240; x += 80) group.add(makeLandmass({ color: 0x42583a, radius: 55, x, z: -128, height: 3.2 }));
  mataCiliar(group, [[-240, -80], [-60, -76], [60, -78], [240, -82]], 6, 0.7, 0.1, 0.18);
  mataCiliar(group, [[-240, -100], [240, -104]], 9, 1.0, 0.05, 0.1);
  group.add(capim(1400, [[-240, -74], [240, -74]], 4, [0.6, 1.6]));
  group.add(capim(900, [[-40, 7], [40, 7]], 3, [0.5, 1.4]));
  const rockMat = std(0x7d7a72, { flatShading: true });
  for (const [x, z, s] of [
    [-6, -6, 0.7], [9, -12, 0.9], [-13, -18, 1.1], [4, -24, 0.6], [16, -8, 0.8], [-22, -40, 1.4], [25, -55, 1.2], [-3, -68, 1.6],
    [-3, 8.5, 0.6], [6, 9, 0.8], [-9, 10, 0.7],
  ]) {
    const r = makeRock(rockMat, s);
    r.position.set(x, 0.08, z);
    group.add(r);
  }
  // galho caído na água (galhada), onde a piraputanga se esconde
  const galho = mesh(new THREE.CylinderGeometry(0.18, 0.3, 14, 7), std(0x4a3a2a), { x: -18, y: 0.1, z: -66, rz: Math.PI / 2 - 0.15, ry: 0.5, shadow: true });
  group.add(galho);
  const g1 = garca(); g1.position.set(30, 0.1, -72); g1.rotation.y = -2; group.add(g1);
  makeMountainRing(group, { color: 0x35504a, count: 12, hMin: 110, hMax: 260 });
  group.add(makeDock({ length: 9, width: 2.1, deckY: 0.58, startZ: 8 }));
  return { playerSpot: new THREE.Vector3(0, 0.62, -0.8) };
}

function buildPier(group) {
  // barranco de terra no Rio Paraguai: rio largo e barrento, camalotes descendo, outra margem lá longe
  group.add(barranco(160, 3.2, 7));
  const r = ranchinho(); r.position.set(-7, 3.2, 16); group.add(r);
  const deckY = 1.05;
  group.add(makeDock({ length: 14, width: 2.6, deckY, startZ: 8 }));
  const railMat = std(WOOD_DARK);
  for (const sx of [-1, 1]) {
    group.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 12), railMat, { x: sx * 1.22, y: deckY + 0.95, z: 2, shadow: true }));
    for (let i = 0; i < 5; i++) group.add(mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railMat, { x: sx * 1.22, y: deckY + 0.48, z: 7.5 - i * 3 }));
  }
  group.add(capim(1200, [[-80, 9], [-3, 9]], 4, [0.6, 1.8], 3.1));
  group.add(capim(1200, [[3, 9], [80, 9]], 4, [0.6, 1.8], 3.1));
  mataCiliar(group, [[-80, 26], [80, 26]], 8, 3.2, 0.1, 0.25);
  for (let x = -480; x <= 480; x += 110) group.add(makeLandmass({ color: 0x3f5a34, radius: 75, x, z: -360, height: 2.4 }));
  mataCiliar(group, [[-420, -300], [420, -300]], 12, 0.6, 0.08, 0.2);
  group.add(aguapes(700, [-160, 160, -260, -50], (x, z) => Math.abs(x) > 18 || z < -60));
  const t = tuiuiu(); t.position.set(-20, 3.2, 10); t.rotation.y = 0.4; group.add(t);
  makeMountainRing(group, { color: 0x3a4a55, count: 6, arcStart: Math.PI * 0.65, arcEnd: Math.PI * 1.35, rMin: 750, rMax: 1000 });
  return { playerSpot: new THREE.Vector3(0, deckY + 0.04, -4.5) };
}

function buildOcean(group) {
  // canal do Rio Paraguai, de voadeira, com as duas margens de mata
  const deckY = 0.95;
  group.add(voadeira(deckY));
  // lanterna para a pesca noturna
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), std(0x2c333d), { x: 1.05, y: deckY + 0.85, z: 2.2 }));
  group.add(mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({
    color: 0xffd98a, emissive: 0xffb84d, emissiveIntensity: 0.9, roughness: 0.4,
  }), { x: 1.05, y: deckY + 1.68, z: 2.2 }));
  bancoLateral(group, -1, 120, -420, 95);
  bancoLateral(group, 1, 120, -420, 95);
  for (let x = -300; x <= 300; x += 100) group.add(makeLandmass({ color: 0x3a5532, radius: 70, x, z: -560, height: 2.2 }));
  mataCiliar(group, [[-300, -500], [300, -500]], 12, 0.6);
  group.add(aguapes(500, [-92, -60, -400, 60]));
  group.add(aguapes(500, [60, 92, -400, 60]));
  return { playerSpot: new THREE.Vector3(0, deckY + 0.04, -1.7) };
}

const BUILDERS = { lake: buildLake, river: buildRiver, pier: buildPier, ocean: buildOcean };

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.playerSpot = new THREE.Vector3(0, 0.7, -2);
  }

  load(location) {
    if (this.group) {
      this.scene.remove(this.group);
      disposeObject3D(this.group);
      this.group = null;
    }
    const group = new THREE.Group();
    const builder = BUILDERS[location.env] || buildLake;
    const info = builder(group);
    this.scene.add(group);
    this.group = group;
    this.playerSpot.copy(info.playerSpot);
    return info;
  }
}
