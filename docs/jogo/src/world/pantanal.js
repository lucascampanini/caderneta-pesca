// Peças de cenário do Pantanal feitas de primitivas: árvores de copa larga, ipê florido, palmeira carandá,
// camalotes de aguapé, capim de beira, barranco de terra, garça, tuiuiú, ranchinho e chalana de alumínio.
// Capim e aguapé usam InstancedMesh para caber milhares de peças sem pesar.

import * as THREE from "three";
import { randRange, pick } from "../utils/utils.js";

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, ...opts });
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return matCache.get(key);
}

function m(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = true } = {}) {
  const o = new THREE.Mesh(geo, material);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.scale.set(sx, sy, sz);
  o.castShadow = shadow;
  o.receiveShadow = shadow;
  return o;
}

const VERDES = [0x2f5a2c, 0x3b6a33, 0x456f2e, 0x2a4f2a, 0x507a34];
const TRONCO = 0x5b4632;

/** Árvore de copa larga e achatada (figueira, cambará, ingá). */
export function arvoreCopa(h = 7) {
  const g = new THREE.Group();
  const inclina = randRange(-0.12, 0.12);
  g.add(m(new THREE.CylinderGeometry(0.16 * h / 7, 0.3 * h / 7, h * 0.55, 7), mat(TRONCO), { y: h * 0.27, rz: inclina }));
  const folha = mat(pick(VERDES), { flatShading: true });
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const r = h * randRange(0.2, 0.32);
    const a = (i / n) * Math.PI * 2 + randRange(-0.4, 0.4);
    const d = i === 0 ? 0 : h * randRange(0.18, 0.32);
    g.add(m(new THREE.IcosahedronGeometry(r, 1), i % 2 ? folha : mat(pick(VERDES), { flatShading: true }), {
      x: Math.cos(a) * d + inclina * h * 0.5, y: h * randRange(0.62, 0.78), z: Math.sin(a) * d,
      sx: randRange(1.1, 1.5), sy: randRange(0.5, 0.7), sz: randRange(1.1, 1.5),
    }));
  }
  return g;
}

/** Ipê florido: copa rala amarela ou rosa, a cara do Pantanal na seca. */
export function ipe(h = 8, cor = 0xf2c12e) {
  const g = new THREE.Group();
  g.add(m(new THREE.CylinderGeometry(0.14, 0.24, h * 0.6, 6), mat(0x4e3d2c), { y: h * 0.3 }));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + randRange(-0.3, 0.3);
    g.add(m(new THREE.CylinderGeometry(0.05, 0.09, h * 0.35, 5), mat(0x4e3d2c), { x: Math.cos(a) * h * 0.08, y: h * 0.66, z: Math.sin(a) * h * 0.08, rz: Math.cos(a) * 0.6, rx: Math.sin(a) * 0.6 }));
  }
  const flor = mat(cor, { flatShading: true, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const a = randRange(0, Math.PI * 2), d = randRange(0, h * 0.28);
    g.add(m(new THREE.IcosahedronGeometry(h * randRange(0.1, 0.17), 0), flor, { x: Math.cos(a) * d, y: h * randRange(0.75, 0.95), z: Math.sin(a) * d, sy: 0.7 }));
  }
  return g;
}

/** Palmeira carandá (ou acuri): tronco fino e coroa de folhas em leque. */
export function palmeira(h = 9) {
  const g = new THREE.Group();
  const curva = randRange(-0.08, 0.08);
  g.add(m(new THREE.CylinderGeometry(0.13, 0.19, h, 7), mat(0x6b5a45), { y: h / 2, rz: curva }));
  const topo = new THREE.Vector3(-Math.sin(curva) * h, h, 0);
  const folha = mat(0x4f7a3a, { side: THREE.DoubleSide, flatShading: true });
  const geo = new THREE.ConeGeometry(0.55, 2.6, 4, 1, true);
  geo.translate(0, 1.3, 0);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const f = m(geo, folha, { x: topo.x, y: topo.y, z: topo.z, sz: 0.12 });
    f.rotation.order = "YXZ";
    f.rotation.y = a;
    f.rotation.x = randRange(0.9, 1.5);
    g.add(f);
  }
  g.add(m(new THREE.SphereGeometry(0.32, 6, 5), mat(0x5d4a35), { x: topo.x, y: topo.y - 0.1, z: topo.z }));
  return g;
}

/** Camalotes de aguapé: rosetas verdes boiando, algumas com flor lilás. area: [x0, x1, z0, z1]. */
export function aguapes(n, area, livre = () => true) {
  const g = new THREE.Group();
  const roseta = new THREE.SphereGeometry(0.35, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const folhas = new THREE.InstancedMesh(roseta, mat(0x4c8a3a, { flatShading: true, roughness: 0.6 }), n);
  const flores = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.32, 5), mat(0xb48ad6, { roughness: 0.7 }), Math.ceil(n / 5));
  const tmp = new THREE.Object3D();
  const cor = new THREE.Color();
  let i = 0, f = 0, tent = 0;
  // agrupa em manchas (camalotes), como na água de verdade
  const centros = Array.from({ length: Math.max(1, Math.round(n / 60)) }, () => [randRange(area[0], area[1]), randRange(area[2], area[3]), randRange(2, 6)]);
  while (i < n && tent < n * 6) {
    tent++;
    const [cx, cz, raio] = pick(centros);
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * raio;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!livre(x, z)) continue;
    const s = randRange(0.6, 1.5);
    tmp.position.set(x, 0.02, z);
    tmp.rotation.set(0, Math.random() * Math.PI, 0);
    tmp.scale.set(s, s * randRange(0.5, 0.9), s);
    tmp.updateMatrix();
    folhas.setMatrixAt(i, tmp.matrix);
    folhas.setColorAt(i, cor.setHSL(randRange(0.24, 0.3), randRange(0.45, 0.6), randRange(0.28, 0.4)));
    if (f < flores.count && Math.random() < 0.22) {
      tmp.position.y = 0.3 * s;
      tmp.scale.setScalar(randRange(0.8, 1.3));
      tmp.updateMatrix();
      flores.setMatrixAt(f++, tmp.matrix);
    }
    i++;
  }
  folhas.count = i;
  flores.count = f;
  folhas.receiveShadow = true;
  g.add(folhas, flores);
  return g;
}

/** Capim e taboa da beira, em faixa ao longo de uma linha (pontos [x, z]). */
export function capim(n, pontos, largura = 3, altura = [0.6, 1.6], y = 0) {
  const geo = new THREE.ConeGeometry(0.035, 1, 3);
  geo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geo, mat(0xffffff, { roughness: 0.95 }), n);
  const tmp = new THREE.Object3D();
  const cor = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const k = Math.random() * (pontos.length - 1);
    const j = Math.floor(k), t = k - j;
    const [ax, az] = pontos[j], [bx, bz] = pontos[j + 1];
    const x = ax + (bx - ax) * t + randRange(-largura, largura) * 0.5;
    const z = az + (bz - az) * t + randRange(-largura, largura) * 0.5;
    tmp.position.set(x, y, z);
    tmp.rotation.set(randRange(-0.25, 0.25), Math.random() * Math.PI, randRange(-0.25, 0.25));
    tmp.scale.set(1, randRange(altura[0], altura[1]), 1);
    tmp.updateMatrix();
    inst.setMatrixAt(i, tmp.matrix);
    inst.setColorAt(i, cor.setHSL(randRange(0.17, 0.27), randRange(0.35, 0.55), randRange(0.25, 0.45)));
  }
  return inst;
}

/** Garça-branca em pé na beira. */
export function garca(branca = true) {
  const g = new THREE.Group();
  const corpo = mat(branca ? 0xf3f1ea : 0x8a94a0);
  g.add(m(new THREE.SphereGeometry(0.22, 8, 6), corpo, { y: 0.85, sx: 1.5, sy: 0.9 }));
  g.add(m(new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5), corpo, { x: 0.28, y: 1.15, rz: -0.35 }));
  g.add(m(new THREE.SphereGeometry(0.07, 6, 5), corpo, { x: 0.38, y: 1.45, sx: 1.4 }));
  g.add(m(new THREE.ConeGeometry(0.025, 0.28, 4), mat(0xe0b020), { x: 0.56, y: 1.44, rz: -Math.PI / 2 }));
  for (const s of [-1, 1]) g.add(m(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 4), mat(0x222222), { x: -0.02, y: 0.33, z: s * 0.06 }));
  return g;
}

/** Tuiuiú (jaburu), a ave símbolo do Pantanal: branco, pescoço preto e colar vermelho. */
export function tuiuiu() {
  const g = new THREE.Group();
  g.add(m(new THREE.SphereGeometry(0.42, 9, 7), mat(0xf4f2ec), { y: 1.35, sx: 1.4, sy: 0.95 }));
  g.add(m(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 7), mat(0xc8231e), { x: 0.42, y: 1.62, rz: -0.5 }));
  g.add(m(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6), mat(0x141414), { x: 0.55, y: 1.88, rz: -0.25 }));
  g.add(m(new THREE.SphereGeometry(0.13, 7, 6), mat(0x141414), { x: 0.62, y: 2.15 }));
  g.add(m(new THREE.ConeGeometry(0.07, 0.62, 5), mat(0x1a1a1a), { x: 0.95, y: 2.08, rz: -Math.PI / 2 - 0.15 }));
  for (const s of [-1, 1]) g.add(m(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 4), mat(0x2a2a2a), { y: 0.5, z: s * 0.12 }));
  return g;
}

/** Barranco de terra vermelha com capim em cima, de frente para o rio. */
export function barranco(largura = 120, altura = 3.2, z = 6) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(largura, altura + 1.5, 80, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i);
    p.setZ(i, Math.sin(x * 0.35) * 0.35 + Math.sin(x * 1.3 + yy * 2) * 0.12 + (yy < 0 ? -0.6 * yy : 0));
  }
  geo.computeVertexNormals();
  g.add(m(geo, mat(0x8a5a3a, { flatShading: true }), { y: (altura - 1.5) / 2, z, ry: Math.PI }));
  const topo = new THREE.Mesh(new THREE.PlaneGeometry(largura, 40), mat(0x4d6b33));
  topo.rotation.x = -Math.PI / 2;
  topo.position.set(0, altura, z + 20);
  topo.receiveShadow = true;
  g.add(topo);
  return g;
}

/** Ranchinho de pescador: esteios de madeira e telhado de palha. */
export function ranchinho() {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) g.add(m(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), mat(0x5a4330), { x, y: 1.2, z }));
  const telhado = m(new THREE.ConeGeometry(3, 1.4, 4), mat(0xb59a5a, { flatShading: true }), { y: 3.0, ry: Math.PI / 4, sx: 1.3 });
  g.add(telhado);
  return g;
}

/** Chalana / voadeira de alumínio com motor de popa (o barco da pesca de canal). */
export function voadeira(deckY = 0.95) {
  const g = new THREE.Group();
  const alu = mat(0x9aa3a8, { metalness: 0.55, roughness: 0.45 });
  const casco = new THREE.Shape();
  casco.moveTo(-1.15, 3.2); casco.quadraticCurveTo(0, 4.4, 1.15, 3.2);
  casco.lineTo(1.2, -2.6); casco.lineTo(-1.2, -2.6); casco.closePath();
  const fundo = new THREE.ExtrudeGeometry(casco, { depth: 0.75, bevelEnabled: false });
  fundo.rotateX(Math.PI / 2);
  g.add(m(fundo, alu, { y: deckY + 0.05, z: 0 }));
  for (const s of [-1, 1]) g.add(m(new THREE.BoxGeometry(0.06, 0.55, 5.9), alu, { x: s * 1.18, y: deckY + 0.2, z: 0.3 }));
  g.add(m(new THREE.BoxGeometry(2.3, 0.06, 5.6), mat(0x6e5138), { y: deckY - 0.02, z: 0.2 }));
  for (const z of [-1.5, 1.2]) g.add(m(new THREE.BoxGeometry(2.3, 0.08, 0.38), alu, { y: deckY + 0.35, z }));
  // motor de popa atrás do pescador
  const motor = new THREE.Group();
  motor.add(m(new THREE.BoxGeometry(0.45, 0.55, 0.55), mat(0x1d1f22, { roughness: 0.4 }), { y: 0.55 }));
  motor.add(m(new THREE.BoxGeometry(0.14, 0.9, 0.2), mat(0x2a2c30), { y: -0.1 }));
  motor.position.set(0, deckY + 0.2, 2.75);
  g.add(motor);
  return g;
}

/** Mata ciliar contínua ao longo de uma margem (pontos [x, z]), com árvores variadas. */
export function mataCiliar(group, pontos, passo = 7, y = 0.6, chanceIpe = 0.08, chancePalmeira = 0.15) {
  for (let j = 0; j < pontos.length - 1; j++) {
    const [ax, az] = pontos[j], [bx, bz] = pontos[j + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / passo));
    for (let i = 0; i < n; i++) {
      const t = (i + Math.random()) / n;
      const x = ax + (bx - ax) * t + randRange(-2.5, 2.5), z = az + (bz - az) * t + randRange(-2.5, 2.5);
      const r = Math.random();
      const arv = r < chanceIpe ? ipe(randRange(7, 10), Math.random() < 0.6 ? 0xf2c12e : 0xe58bc4) : r < chanceIpe + chancePalmeira ? palmeira(randRange(7, 11)) : arvoreCopa(randRange(6, 11));
      arv.position.set(x, y, z);
      arv.rotation.y = Math.random() * Math.PI * 2;
      group.add(arv);
    }
  }
}
