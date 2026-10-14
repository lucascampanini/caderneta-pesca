// Vitrine: "estúdio de fotos" que renderiza cada equipamento em 3D numa imagem pequena,
// usada na Loja e na aba Equipamentos do Guia. Um renderizador fora da tela, imagens em cache.

import * as THREE from "three";
import { GEAR } from "../data/gearData.js";
import { montarVara, molinete, carretilha } from "../gameplay/rodModel.js";

let R = null;
const cache = new Map();

function estudio() {
  if (R) return R;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x3a3020, 1.4));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(2, 4, 5);
  scene.add(sol);
  const contra = new THREE.DirectionalLight(0xbfd8ff, 0.8);
  contra.position.set(-3, 1, -4);
  scene.add(contra);
  R = { renderer, scene };
  return R;
}

// vara deitada: eixo +Y da vara vira +X da tela, o "em cima" (+Z) vira +Y; depois um giro de 3/4
const BASE_VARA = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
function deitarVara(obj, giroY = -0.35, giroX = 0.32) {
  const wrap = new THREE.Group();
  obj.quaternion.setFromRotationMatrix(BASE_VARA);
  wrap.add(obj);
  wrap.rotation.set(giroX, giroY, 0);
  return wrap;
}

const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...o });
const aco = () => m(0xc9ced4, { metalness: 0.9, roughness: 0.25 });

// ---------- modelos ----------

function modeloVara(item) {
  const reel = item.tipo === "canico" ? GEAR.reels[0] : GEAR.reels.find((r) => r.id === (item.tipo === "molinete" ? "mol3000" : "pb150"));
  const v = montarVara({ rod: item, reel, line: GEAR.lines[0] });
  v.joints.forEach((j, i) => { j.rotation.x = -0.2 * v.pesos[i]; });
  return deitarVara(v.root, -0.12, 0.42);
}

function modeloMolinete(item) {
  const g = new THREE.Group();
  const trecho = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.34, 10), m(0x222222, { roughness: 0.8 }));
  g.add(trecho);
  if (item.tipo === "molinete") g.add(molinete({ mol1000: 1000, mol3000: 3000, mol5000: 5000 }[item.id]).group);
  else if (item.tipo === "carretilha") g.add(carretilha(item.id === "red400").group);
  else {
    // sem molinete: a linha enrolada na ponta do caniço
    trecho.material = m(0xc9a85c, { roughness: 0.7 });
    const rolo = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 20), m(0xd6e6e0, { roughness: 0.8 }));
    rolo.rotation.x = Math.PI / 2;
    g.add(rolo);
  }
  return deitarVara(g, -0.75, 0.38);
}

function modeloLinha(item) {
  const g = new THREE.Group();
  const cor = item.tipo === "multi" ? (item.lb >= 50 ? 0xe8b62a : 0xd9f03a) : 0xd6e6e0;
  const aba = m(item.tipo === "multi" ? 0x1d2a3a : 0xb8c4cc, { roughness: 0.4 });
  for (const y of [-0.06, 0.06]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 32), aba);
    a.position.y = y;
    g.add(a);
  }
  const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.075 + Math.min(item.lb, 80) / 2600, 0.075 + Math.min(item.lb, 80) / 2600, 0.11, 32),
    m(cor, { roughness: 0.75, transparent: item.tipo === "mono", opacity: item.tipo === "mono" ? 0.8 : 1 }));
  g.add(fio);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.13, 16), aba));
  g.rotation.set(0.25, 0.75, Math.PI / 2);
  return g;
}

/** Anzol: haste, curva e ponta; circular tem a ponta voltada para dentro. */
function anzol(hook, circular) {
  const g = new THREE.Group();
  const s = 0.5 + Math.max(0, hook + 2) * 0.09; // nº 2 pequeno ... 10/0 grande
  const fio = 0.004 * s;
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(fio, fio, 0.12 * s, 8), aco());
  haste.position.y = 0.06 * s;
  g.add(haste);
  const olho = new THREE.Mesh(new THREE.TorusGeometry(0.008 * s, fio * 0.8, 6, 12), aco());
  olho.position.y = 0.125 * s;
  g.add(olho);
  const curva = new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, fio, 8, 20, circular ? Math.PI * 1.55 : Math.PI), aco());
  curva.rotation.z = Math.PI;
  curva.position.x = 0.03 * s;
  g.add(curva);
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(fio * 1.6, 0.025 * s, 6), aco());
  if (circular) { ponta.position.set(0.032 * s, 0.03 * s, 0); ponta.rotation.z = Math.PI * 0.85; }
  else { ponta.position.set(0.06 * s, 0.03 * s, 0); }
  g.add(ponta);
  return g;
}

function modeloAnzol(item) {
  const g = new THREE.Group();
  const h = anzol(item.hook, item.id.startsWith("circ"));
  g.add(h);
  if (item.aco || item.id.startsWith("circ")) {
    // líder: cabo de aço trançado ou mono grosso, com girador na ponta
    const lider = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.22, 6), item.aco ? m(0x8a9097, { metalness: 0.9, roughness: 0.35 }) : m(0xe6eef0, { transparent: true, opacity: 0.6 }));
    lider.position.y = 0.2;
    g.add(lider);
    const girador = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 8), m(0x3a3a3a, { metalness: 0.8 }));
    girador.position.y = 0.32;
    g.add(girador);
  }
  g.rotation.z = -0.35;
  return g;
}

function peixinho(corA, corB, comp = 0.2) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), m(corA, { metalness: 0.4, roughness: 0.3 }));
  corpo.scale.set(comp, comp * 0.28, comp * 0.12);
  g.add(corpo);
  const barriga = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), m(corB, { metalness: 0.3, roughness: 0.35 }));
  barriga.scale.set(comp * 0.9, comp * 0.18, comp * 0.115);
  barriga.position.y = -comp * 0.05;
  g.add(barriga);
  const rabo = new THREE.Mesh(new THREE.ConeGeometry(comp * 0.13, comp * 0.18, 4), m(corA));
  rabo.rotation.z = Math.PI / 2;
  rabo.scale.z = 0.2;
  rabo.position.x = -comp * 0.55;
  g.add(rabo);
  const olho = new THREE.Mesh(new THREE.SphereGeometry(comp * 0.035, 8, 6), m(0x111111));
  olho.position.set(comp * 0.33, comp * 0.03, comp * 0.05);
  g.add(olho);
  return g;
}

function garateia(s = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = anzol(-1, false);
    a.scale.setScalar(0.45 * s);
    a.rotation.y = (i / 3) * Math.PI * 2;
    a.rotation.z = Math.PI;
    g.add(a);
  }
  return g;
}

function modeloIsca(item) {
  const g = new THREE.Group();
  switch (item.id) {
    case "minhoca": {
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push(new THREE.Vector3(i * 0.03 - 0.12, Math.sin(i * 1.1) * 0.03, Math.cos(i * 0.8) * 0.01));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.011, 8), m(0xc4706a, { roughness: 0.4 })));
      break;
    }
    case "massa":
      for (const [x, y, r] of [[0, 0, 0.06], [0.09, -0.02, 0.04], [-0.08, -0.025, 0.035]]) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), m(0xe2c98a, { roughness: 0.95 }));
        b.position.set(x, y, 0); g.add(b);
      }
      break;
    case "milho":
      for (let i = 0; i < 9; i++) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), m(0xf2c230, { roughness: 0.4 }));
        k.scale.set(1, 0.8, 0.7);
        k.position.set((i % 3) * 0.045 - 0.045, Math.floor(i / 3) * 0.04 - 0.04, Math.random() * 0.01);
        g.add(k);
      }
      break;
    case "coracao": {
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06, 1), m(0x8c1f24, { roughness: 0.35 }));
      c.scale.set(1.4, 0.8, 0.6); g.add(c);
      break;
    }
    case "posta": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), m(0xd99a8a, { roughness: 0.6 }));
      g.add(p);
      const pele = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.02, 0.052), m(0x7a8a90, { metalness: 0.5, roughness: 0.3 }));
      pele.position.y = 0.04; g.add(pele);
      const espinha = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.052, 8), m(0xf0ece0));
      espinha.rotation.x = Math.PI / 2; espinha.position.set(0, 0.012, 0); g.add(espinha);
      g.rotation.set(0.45, 0.6, 0);
      break;
    }
    case "caranguejo": {
      const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 8), m(0x9a5a2a, { roughness: 0.5 }));
      corpo.scale.set(1.3, 0.45, 1); g.add(corpo);
      for (let i = 0; i < 8; i++) {
        const lado = i < 4 ? 1 : -1, k = i % 4;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.08, 5), corpo.material);
        p.position.set(lado * 0.075, -0.01, (k - 1.5) * 0.03);
        p.rotation.z = lado * 1.1; g.add(p);
      }
      for (const lado of [-1, 1]) {
        const pinca = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), corpo.material);
        pinca.scale.set(1.5, 0.7, 1); pinca.position.set(lado * 0.06, 0, 0.075); g.add(pinca);
      }
      g.rotation.x = 0.8;
      break;
    }
    case "fruta":
      for (const [x, c] of [[-0.05, 0x5a2a6a], [0.04, 0xd9a03a]]) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), m(c, { roughness: 0.4 }));
        f.position.x = x; g.add(f);
      }
      break;
    case "lambari":
      g.add(peixinho(0x9fb0b4, 0xe8eef0, 0.22));
      break;
    case "tuvira": {
      const pts = [];
      for (let i = 0; i < 10; i++) pts.push(new THREE.Vector3(i * 0.03 - 0.14, Math.sin(i * 0.7) * 0.015, 0));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 8), m(0x4a3a2c, { roughness: 0.45 })));
      break;
    }
    case "meia": {
      const p = peixinho(0x2c7a4a, 0xf0f0ea, 0.26); g.add(p);
      const barbela = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.03), m(0xddeeff, { transparent: true, opacity: 0.55 }));
      barbela.position.set(0.15, -0.015, 0); barbela.rotation.z = -0.5; g.add(barbela);
      for (const x of [0.03, -0.08]) { const t = garateia(); t.position.set(x, -0.045, 0); g.add(t); }
      break;
    }
    case "superficie": {
      const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 6, 12), m(0xf2f2ea, { roughness: 0.3 }));
      corpo.rotation.z = Math.PI / 2; g.add(corpo);
      const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), m(0xd23a2a));
      cabeca.position.x = 0.1; g.add(cabeca);
      for (const x of [0.06, -0.06]) { const t = garateia(); t.position.set(x, -0.03, 0); g.add(t); }
      break;
    }
    case "sapo": {
      const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), m(0x3a6a2a, { roughness: 0.6 }));
      corpo.scale.set(1.3, 0.6, 1); g.add(corpo);
      for (const lado of [-1, 1]) {
        const perna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.009, 0.09, 6), m(0x3a6a2a));
        perna.position.set(-0.085, -0.005, lado * 0.03); perna.rotation.set(lado * 0.4, 0, 1.45); g.add(perna);
        const saia = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), m(0xd8c84a));
        saia.position.set(-0.135, -0.005, lado * 0.042); saia.rotation.z = Math.PI / 2; g.add(saia);
        const olho = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), m(0xf2e04a));
        olho.position.set(0.04, 0.026, lado * 0.022); g.add(olho);
      }
      const anz = anzol(3, false); anz.scale.setScalar(0.7); anz.rotation.set(0, 0, -Math.PI / 2); anz.position.set(0.02, 0.03, 0); g.add(anz);
      g.rotation.set(0.5, -0.4, 0);
      break;
    }
    case "colher": {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), m(0xe4e8ec, { metalness: 0.55, roughness: 0.25, side: THREE.DoubleSide }));
      // colher ondulante: casca côncava, vermelha e branca por fora, metal polido por dentro
      const casca = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 10, 0, Math.PI * 2, 0, Math.PI / 4), m(0xe4e8ec, { metalness: 0.55, roughness: 0.25, side: THREE.DoubleSide }));
      casca.scale.set(0.55, 0.35, 1.25);
      casca.rotation.x = -Math.PI / 2;
      g.add(casca);
      for (const [z, cor] of [[-0.03, 0xc7312b], [0.012, 0xf2f2ea], [0.045, 0xc7312b]]) {
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.002, 0.026), m(cor));
        faixa.position.set(0, -0.026, z); g.add(faixa);
      }
      const t = garateia(); t.position.set(0, -0.01, 0.11); t.rotation.x = Math.PI / 2; g.add(t);
      g.rotation.set(0.9, 0.5, 0.3);
      break;
    }
    case "jig": {
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), m(0xf2c230, { metalness: 0.4 }));
      cab.position.x = 0.07; g.add(cab);
      // saia de fios (penas/silicone) saindo da cabeça
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0012, 0.13, 4), m(i % 3 ? 0xf5f5f0 : 0xd23a2a, { roughness: 0.7 }));
        fio.rotation.z = Math.PI / 2 + Math.sin(a) * 0.18;
        fio.rotation.y = Math.cos(a) * 0.18;
        fio.position.set(-0.01, Math.sin(a) * 0.012, Math.cos(a) * 0.012);
        g.add(fio);
      }
      const a = anzol(1, false); a.scale.setScalar(0.6); a.rotation.z = -Math.PI / 2; a.position.set(0.06, 0, 0); g.add(a);
      break;
    }
    default:
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m(0x888888)));
  }
  return g;
}

const MODELOS = { rods: modeloVara, reels: modeloMolinete, lines: modeloLinha, terminals: modeloAnzol, baits: modeloIsca };
const TAMANHO = { rods: [420, 90], reels: [180, 130], lines: [150, 120], terminals: [130, 130], baits: [170, 110] };

/** Imagem (dataURL) do item, renderizada na primeira vez e guardada. */
export function fotoItem(catKey, item, tamanho = null) {
  const key = catKey + ":" + item.id + (tamanho ? ":" + tamanho.join("x") : "");
  if (cache.has(key)) return cache.get(key);
  let url = "";
  try {
    const { renderer, scene } = estudio();
    const [w, h] = tamanho || TAMANHO[catKey];
    renderer.setSize(w, h, false);
    const obj = MODELOS[catKey](item);
    scene.add(obj);
    // enquadra pela caixa do objeto
    const box = new THREE.Box3().setFromObject(obj);
    const centro = box.getCenter(new THREE.Vector3());
    const tam = box.getSize(new THREE.Vector3());
    const aspecto = w / h;
    let cam;
    if (catKey === "rods") {
      const meiaL = Math.max(tam.x / 2, (tam.y / 2) * aspecto) * 1.06;
      cam = new THREE.OrthographicCamera(-meiaL, meiaL, meiaL / aspecto, -meiaL / aspecto, 0.01, 50);
      cam.position.set(centro.x, centro.y, centro.z + 10);
    } else {
      const fov = 26;
      cam = new THREE.PerspectiveCamera(fov, aspecto, 0.01, 50);
      const raio = tam.length() / 2;
      const dist = (raio / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * (aspecto < 1 ? 1 / aspecto : 1) * (catKey === "reels" ? 0.62 : 0.85);
      cam.position.copy(centro).add(new THREE.Vector3(0, 0, dist));
    }
    cam.lookAt(centro);
    renderer.render(scene, cam);
    url = renderer.domElement.toDataURL("image/png");
    scene.remove(obj);
    obj.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  } catch (e) {
    console.warn("vitrine", e);
  }
  cache.set(key, url);
  return url;
}
