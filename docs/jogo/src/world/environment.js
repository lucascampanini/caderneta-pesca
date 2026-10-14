// Cenário de cada pesqueiro do Pantanal: margens com chão de foto, mata ciliar em camadas feita de
// impostores fotográficos (ver pantanal.js e impostores.js), camalotes de aguapé, aves e a mata no horizonte.
// O pescador fica perto da origem e arremessa para -Z (até uns 45 m): essa faixa fica sempre livre.
//
// Trapiche, pedras, tronco caído, ranchinho e voadeira são criados nas funções objetosDePerto_<pesqueiro>(group),
// separadas da vegetação, para poderem ser trocadas por modelos reais sem mexer no resto.

import * as THREE from "three";
import { disposeObject3D, randRange } from "../utils/utils.js";
import { S } from "../state/gameState.js";
import { colocarTrapiche, colocarGalhada, colocarPedra, colocarObjetosTrapiche, colocarEstacas, preCarregarModelos } from "./modelos.js";
import {
  Vegetacao, mataCiliar, mataDistante, camalotes, chaoMargem, alturaMargem,
  garca, tuiuiu, barranco, ranchinho, voadeira,
} from "./pantanal.js";

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

// ---------- peças de perto (trapiche, pedras, galhada): candidatas a virar modelo real ----------

function makeRock(mat, s = 1) {
  return mesh(new THREE.DodecahedronGeometry(s, 0), mat, {
    sx: randRange(0.7, 1.3), sy: randRange(0.5, 0.9), sz: randRange(0.7, 1.3),
    ry: randRange(0, Math.PI), shadow: true,
  });
}

function makeDock({ length = 13, width = 2.4, deckY = 0.62, startZ = 9 }) {
  const g = new THREE.Group();
  const plankMat = std(WOOD);
  const postMat = std(WOOD_DARK);
  const plankCount = Math.floor(length / 0.62);
  for (let i = 0; i < plankCount; i++) {
    const z = startZ - i * 0.62 - 0.3;
    g.add(mesh(new THREE.BoxGeometry(width, 0.09, 0.55), plankMat, { y: deckY, z, ry: randRange(-0.015, 0.015), shadow: true }));
  }
  for (let i = 0; i <= Math.floor(length / 3); i++) {
    const z = startZ - i * 3;
    for (const sx of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, deckY + 1.5, 7), postMat, {
        x: (sx * width) / 2 - sx * 0.08, y: (deckY - 1.2) / 2 + 0.2, z, shadow: true,
      }));
    }
  }
  // as estacas da ponta sobem como cabeços de amarração
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.5, 7), postMat, {
      x: (sx * width) / 2 - sx * 0.08, y: deckY + 0.22, z: startZ - length + 0.4, shadow: true,
    }));
  }
  return g;
}

/** Baía: trapiche de madeira real, banquinho, balde e lampião, galhadas e estacas na água. */
function objetosDePerto_lake(group) {
  colocarTrapiche(group, { comprimento: 13, largura: 2.4, alturaDeck: 0.62, inicioZ: 9 });
  colocarObjetosTrapiche(group, { x: 0, y: 0.62, z: -2.6 });
  colocarGalhada(group, -16, -30, 0.7, { tipo: "grosso", escala: 1.8 });
  colocarGalhada(group, 19, -44, -1.1, { tipo: "fino", escala: 2.4, inclina: 0.2 });
  colocarEstacas(group, 5, -12, 0.4);
}

/** Rio de água clara: trapiche curto, pedras escaneadas na água e na beira, galhada caída. */
function objetosDePerto_river(group) {
  colocarTrapiche(group, { comprimento: 9, largura: 2.1, alturaDeck: 0.58, inicioZ: 8 });
  colocarObjetosTrapiche(group, { x: 0, y: 0.58, z: -0.8 });
  for (const [x, z, s] of [
    [-6, -6, 0.7], [9, -12, 0.9], [-13, -18, 1.1], [4, -24, 0.6], [16, -8, 0.8], [-22, -40, 1.4], [25, -55, 1.2], [-3, -58, 1.6],
    [-3, 8.5, 0.6], [6, 9, 0.8], [-9, 10, 0.7],
  ]) colocarPedra(group, x, z, s * 1.8);
  // galhada onde a piraputanga se esconde
  colocarGalhada(group, -18, -55, 0.5, { tipo: "grosso", escala: 3.2, inclina: 0.15 });
  colocarGalhada(group, 14, -30, -0.8, { tipo: "fino", escala: 2.0 });
}

/** Barranco: trapiche alto com guarda-corpo e o ranchinho em cima do barranco. */
function objetosDePerto_pier(group, deckY) {
  const r = ranchinho();
  r.position.set(-7, 3.2, 16);
  group.add(r);
  colocarTrapiche(group, { comprimento: 14, largura: 2.6, alturaDeck: deckY, inicioZ: 8 });
  colocarObjetosTrapiche(group, { x: 0, y: deckY, z: -4.5 });
  colocarGalhada(group, -14, -26, 0.9, { tipo: "grosso", escala: 2.4, inclina: 0.18 });
  const railMat = std(WOOD_DARK);
  for (const sx of [-1, 1]) {
    group.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 12), railMat, { x: sx * 1.22, y: deckY + 0.95, z: 2, shadow: true }));
    for (let i = 0; i < 5; i++) group.add(mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railMat, { x: sx * 1.22, y: deckY + 0.48, z: 7.5 - i * 3 }));
  }
}

/** Canal: a voadeira e a lanterna da pesca noturna. */
function objetosDePerto_ocean(group, deckY) {
  group.add(voadeira(deckY));
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), std(0x2c333d), { x: 1.05, y: deckY + 0.85, z: 2.2 }));
  group.add(mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({
    color: 0xffd98a, emissive: 0xffb84d, emissiveIntensity: 0.9, roughness: 0.4,
  }), { x: 1.05, y: deckY + 1.68, z: 2.2 }));
}

// ---------- utilidades de composição ----------

/** Linha de margem ondulada entre dois pontos, com recortes naturais (enseadas e pontas). */
function margemReta(x0, z0, x1, z1, passo = 12, amp = 4, fase = Math.random() * 10) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / passo));
  const nx = -(z1 - z0), nz = x1 - x0, l = Math.hypot(nx, nz);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = (Math.sin(t * 9 + fase) * 0.6 + Math.sin(t * 23 + fase * 2) * 0.3 + Math.sin(t * 51) * 0.1) * amp;
    pts.push([x0 + (x1 - x0) * t + (nx / l) * o, z0 + (z1 - z0) * t + (nz / l) * o]);
  }
  return pts;
}

function aves(group, lista) {
  for (const [tipo, x, y, z, ry] of lista) {
    const a = tipo === "tuiuiu" ? tuiuiu() : garca(tipo !== "garca_moura");
    a.position.set(x, y, z);
    a.rotation.y = ry;
    group.add(a);
  }
}

const qualidade = () => S.settings?.quality ?? "high";

// ---------- pesqueiros ----------

function buildLake(group) {
  // Baía Pantaneira: lagoa fechada de mata, camalotes de aguapé nas beiradas
  const veg = new Vegetacao(qualidade());
  const centro = [0, -46];
  const pts = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = 1 + Math.sin(a * 3 + 1) * 0.08 + Math.sin(a * 7 + 2) * 0.04;
    pts.push([centro[0] + Math.sin(a) * 74 * r, centro[1] + Math.cos(a) * 58 * r]);
  }
  const trapiche = (x, z) => !(Math.abs(x) < 3.5 && z > -6);
  group.add(chaoMargem(pts, centro, { profundidade: 70, altura: 1.0 }));
  mataCiliar(veg, pts, centro, { profundidade: 50, chanceIpe: 0.06, chancePalmeira: 0.1, aguape: 0.5, livre: trapiche });
  // camalotes pelas beiradas e no fundo, longe da faixa de arremesso
  const longeDoArremesso = (x, z) => {
    const dx = (x - centro[0]) / 70, dz = (z - centro[1]) / 54;
    return dx * dx + dz * dz < 1 && (Math.abs(x) > 16 || z < -62) && trapiche(x, z) && !(Math.abs(x) < 9 && z > -4);
  };
  camalotes(veg, 1100, [-75, 75, -115, 8], longeDoArremesso);
  camalotes(veg, 60, [-14, 14, -3, 8], (x, z) => Math.abs(x) > 4.5);
  mataDistante(veg, { rMin: 260, rMax: 620, n: 650 });
  // ipê amarelo e carandá logo atrás do pescador
  veg.add("ipe_amarelo", -14, 0.75, 18, { altura: 11, cor: [1, 1, 1] });
  veg.add("caranda", 12, 0.75, 16, { altura: 11 });
  veg.build(group);
  aves(group, [
    ["garca", -60, 0.1, -40, 0.8], ["garca", -55, 0.1, -47, 2.2], ["garca_moura", 58, 0.1, -72, -2.4], ["tuiuiu", 60, 0.15, -30, -2.6],
  ]);
  objetosDePerto_lake(group);
  return { playerSpot: new THREE.Vector3(0, 0.66, -2.6) };
}

function buildRiver(group) {
  // Rio de Água Clara: margem da frente perto, pedras e galhada
  const veg = new Vegetacao(qualidade());
  const frente = margemReta(-650, -62, 650, -66, 10, 5);
  const daqui = margemReta(-650, 7.5, 650, 7.5, 10, 2.5);
  const trapiche = (x, z) => !(Math.abs(x) < 3.2 && z < 12);
  group.add(chaoMargem(frente, -1, { profundidade: 80, altura: 1.6 }));
  group.add(chaoMargem(daqui, 1, { profundidade: 70, altura: 0.9 }));
  mataCiliar(veg, frente, -1, { profundidade: 55, altura: 1.6, chanceIpe: 0.06, chancePalmeira: 0.08, aguape: 0.08, taboa: 0.04 });
  mataCiliar(veg, daqui, 1, { profundidade: 45, altura: 0.9, aguape: 0.05, taboa: 0.06, livre: trapiche });
  mataDistante(veg, { rMin: 300, rMax: 640, n: 600 });
  veg.build(group);
  aves(group, [["garca", 30, alturaMargem(-1, 1.6) + 0.1, -63, -2]]);
  objetosDePerto_river(group);
  return { playerSpot: new THREE.Vector3(0, 0.62, -0.8) };
}

function buildPier(group) {
  // Barranco do Rio Paraguai: barranco de terra vermelha atrás, rio largo e barrento, outra margem lá longe
  const veg = new Vegetacao(qualidade());
  const altB = 3.2, deckY = 1.05;
  group.add(barranco(500, altB, 7));
  // em cima do barranco: capim na beirada, arbustos e mata atrás
  for (let i = 0; i < veg.n(3600); i++) {
    const x = randRange(-240, 240), z = randRange(7.6, 14);
    if (Math.abs(x) < 2 && z < 10) continue;
    veg.add(Math.random() < 0.5 ? "capim_alto" : "grama", x, altB, z, { altura: randRange(0.6, 1.6) });
  }
  for (let i = 0; i < veg.n(300); i++) {
    const x = randRange(-240, 240), z = randRange(11, 24);
    if (Math.abs(x + 7) < 4 && Math.abs(z - 16) < 4) continue; // ranchinho
    veg.add(Math.random() < 0.6 ? "arbusto" : "pachira", x, altB, z, { altura: randRange(1.5, 3.4) });
  }
  const fundo = margemReta(240, 22, -240, 22, 10, 3);
  mataCiliar(veg, fundo, -1, { profundidade: 40, altura: altB, aguape: 0, taboa: 0, capimAlto: 0.4, chanceIpe: 0.1, chancePalmeira: 0.14 });
  // capim e taboa no pé do barranco, dentro d'água, dos dois lados do trapiche
  for (let i = 0; i < veg.n(700); i++) {
    const x = randRange(-240, 240), z = randRange(4.5, 6.5);
    if (Math.abs(x) < 3.5) continue;
    veg.add(Math.random() < 0.75 ? "capim_alto" : "taboa", x, -0.1, z, { altura: randRange(1.0, 2.2) });
  }
  // outra margem, lá longe
  const longe = margemReta(-950, -320, 950, -310, 14, 10);
  group.add(chaoMargem(longe, -1, { profundidade: 120, altura: 1.4 }));
  mataCiliar(veg, longe, -1, { profundidade: 90, altura: 1.4, densidade: 0.7, chanceIpe: 0.05, chancePalmeira: 0.08, alturaArvore: [15, 26], aguape: 0.1 });
  // camalotes descendo o rio
  camalotes(veg, 650, [-170, 170, -280, -40], (x, z) => Math.abs(x) > 18 || z < -70);
  mataDistante(veg, { rMin: 420, rMax: 760, n: 550, livre: (x, z) => z < -400 || z > 40 });
  veg.build(group);
  aves(group, [["tuiuiu", -20, altB, 10, 0.4]]);
  objetosDePerto_pier(group, deckY);
  return { playerSpot: new THREE.Vector3(0, deckY + 0.04, -4.5) };
}

function buildOcean(group) {
  // Canal Fundo, de voadeira: as duas margens de mata seguindo o canal
  const veg = new Vegetacao(qualidade());
  const deckY = 0.95;
  const esq = margemReta(-92, 160, -98, -640, 12, 6);
  const dir = margemReta(95, 160, 92, -640, 12, 6);
  const fim = margemReta(-110, -640, 110, -650, 12, 6);
  group.add(chaoMargem(esq, -1, { profundidade: 90, altura: 1.2 }));
  group.add(chaoMargem(dir, 1, { profundidade: 90, altura: 1.2 }));
  group.add(chaoMargem(fim, -1, { profundidade: 90, altura: 1.2 }));
  mataCiliar(veg, esq, -1, { profundidade: 55, chanceIpe: 0.06, chancePalmeira: 0.1, aguape: 0.5 });
  mataCiliar(veg, dir, 1, { profundidade: 55, chanceIpe: 0.06, chancePalmeira: 0.1, aguape: 0.5 });
  mataCiliar(veg, fim, -1, { profundidade: 60, densidade: 0.7, aguape: 0.2 });
  camalotes(veg, 300, [-88, -62, -420, 80]);
  camalotes(veg, 300, [62, 88, -420, 80]);
  mataDistante(veg, { rMin: 320, rMax: 700, n: 600, livre: (x, z) => Math.abs(x) > 170 || z < -720 });
  veg.build(group);
  aves(group, [["garca", -90, 0.1, -60, 1.2], ["tuiuiu", 91, 0.15, -140, -1.8]]);
  objetosDePerto_ocean(group, deckY);
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
    group.name = `cenario_${location.env}`;
    const builder = BUILDERS[location.env] || buildLake;
    const info = builder(group);
    this.scene.add(group);
    this.group = group;
    this.playerSpot.copy(info.playerSpot);
    return info;
  }
}
