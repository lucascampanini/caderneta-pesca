// Peças de cenário do Pantanal. A vegetação (árvores, ipês, carandás, arbustos, capim, taboa e aguapé)
// é toda de impostores fotográficos renderizados no Blender (ver impostores.js e assets/vegetacao/).
// Aqui ficam a composição da mata ciliar em camadas, o chão das margens com textura de foto,
// e as peças feitas de primitivas que ainda restam: barranco, garça, tuiuiú, ranchinho e voadeira.

import * as THREE from "three";
import { randRange, pick } from "../utils/utils.js";
import { CampoImpostores } from "./impostores.js";

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

// ---------------------------------------------------------------------------
// texturas de chão (fotos CC0 da Poly Haven)
// ---------------------------------------------------------------------------

const PASTA = new URL("../../assets/vegetacao/", import.meta.url);
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function tex(nome, srgb = true) {
  if (!texCache.has(nome)) {
    const t = texLoader.load(new URL(nome, PASTA).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set(nome, t);
  }
  return texCache.get(nome);
}

let matChao = null;
/** Chão da margem: lama com folhas na beira d'água, capim baixo para dentro (mistura pela cor do vértice). */
function materialChao() {
  if (matChao) return matChao;
  matChao = new THREE.MeshStandardMaterial({
    map: tex("solo_lama.webp"),
    normalMap: tex("solo_lama_n.webp", false),
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.95,
    metalness: 0,
    vertexColors: true,
  });
  matChao.userData.shared = true;
  const capim = { value: tex("solo_capim.webp") };
  matChao.customProgramCacheKey = () => "chao-margem-v1";
  matChao.onBeforeCompile = (sh) => {
    sh.uniforms.uCapim = capim;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uCapim;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec4 cLama = texture2D(map, vMapUv);
        vec4 cCapim = texture2D(uCapim, vMapUv * 0.7);
        float k = smoothstep(0.25, 0.75, vColor.r);
        diffuseColor.rgb *= mix(cLama.rgb * vec3(0.42, 0.4, 0.36), cCapim.rgb * vec3(0.5, 0.62, 0.38), k) * (0.45 + 0.55 * vColor.g);`
      )
      .replace("#include <color_fragment>", "");
  };
  return matChao;
}

// ---------------------------------------------------------------------------
// vegetação: coleção de campos de impostores (uma draw call por espécie)
// ---------------------------------------------------------------------------

const TONS_VERDE = [
  [1, 1, 1], [0.92, 1.0, 0.9], [1.05, 1.02, 0.9], [0.85, 0.95, 0.85], [1.0, 0.96, 0.82],
];

// alcance (m) das espécies baixas
const PEQUENAS = { grama: 160, grama2: 160, samambaia: 140, capim_alto: 260, taboa: 260, aguape: 300, arbusto: 340, pachira: 340 };

export class Vegetacao {
  /** @param {string} qualidade "low" | "medium" | "high" */
  constructor(qualidade = "high") {
    this.dens = qualidade === "low" ? 0.4 : qualidade === "medium" ? 0.7 : 1;
    this.campos = new Map();
  }

  add(id, x, y, z, o = {}) {
    // planta baixa muito longe do pescador vira menos de um pixel: rareia e depois some
    const alcance = PEQUENAS[id];
    if (alcance) {
      const d = Math.hypot(x, z);
      if (d > alcance || (d > alcance * 0.5 && Math.random() < (d - alcance * 0.5) / (alcance * 0.5))) return;
    }
    if (!this.campos.has(id)) this.campos.set(id, new CampoImpostores(id));
    const c = this.campos.get(id);
    if (!o.cor) {
      const t = pick(TONS_VERDE);
      const b = randRange(0.82, 1.08);
      o.cor = [t[0] * b, t[1] * b, t[2] * b];
    }
    c.add(x, y, z, o);
  }

  /** Quantas peças cabem, já com a densidade da qualidade gráfica. */
  n(base) {
    return Math.max(1, Math.round(base * this.dens));
  }

  build(group) {
    for (const c of this.campos.values()) if (c.count) group.add(c.build());
  }
}

// ---------------------------------------------------------------------------
// margens
// ---------------------------------------------------------------------------

/** Percorre uma polilinha [[x, z], ...]: devolve ponto, tangente e normal "para dentro" da terra. */
// `lado`: 1 (terra à esquerda do sentido de percurso), -1 (à direita) ou [x, z] de um ponto dentro d'água
// (a terra fica do lado oposto a ele, útil para margens fechadas como a da baía).
export function trilha(pontos, lado = 1) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pontos.length - 1; i++) {
    const [ax, az] = pontos[i], [bx, bz] = pontos[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-6) continue;
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    let sinal = typeof lado === "number" ? lado : 1;
    if (Array.isArray(lado)) {
      const mx = (ax + bx) / 2 - lado[0], mz = (az + bz) / 2 - lado[1];
      sinal = -dz * mx + dx * mz >= 0 ? 1 : -1;
    }
    seg.push({ ax, az, dx, dz, len, ini: total, sinal });
    total += len;
  }
  return {
    total,
    em(s) {
      s = Math.max(0, Math.min(total - 1e-6, s));
      let k = seg.length - 1;
      for (let i = 0; i < seg.length; i++) if (s < seg[i].ini + seg[i].len) { k = i; break; }
      const g = seg[k], t = s - g.ini;
      // normal para a esquerda do sentido de percurso (lado = 1) ou para a direita (lado = -1)
      return { x: g.ax + g.dx * t, z: g.az + g.dz * t, tx: g.dx, tz: g.dz, nx: -g.dz * g.sinal, nz: g.dx * g.sinal };
    },
  };
}

/** Altura do chão a `d` metros da beira (negativo = dentro d'água). */
export function alturaMargem(d, altura = 1.1) {
  if (d <= -3) return -0.7;
  if (d <= 0) return -0.7 + ((d + 3) / 3) * 0.75;
  const t = Math.min(1, d / 9);
  return 0.05 + (altura - 0.05) * t * t * (3 - 2 * t);
}

function ruido(x, z) {
  return Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09 - 0.7) * 0.6 + Math.sin(x * 0.37 + z * 0.29) * 0.25 + Math.sin(x * 1.1 - z * 0.8) * 0.08;
}

/** Faixa de chão texturizado ao longo da margem, da lama dentro d'água até o fundo da mata. */
export function chaoMargem(pontos, lado, { profundidade = 60, altura = 1.1, passo = 4, cortina = 24 } = {}) {
  const tr = trilha(pontos, lado);
  const fatias = Math.max(2, Math.ceil(tr.total / passo));
  const dists = [-5, -3, -1.5, 0, 1.5, 3, 5, 8, 12, 18, 28, 40, profundidade];
  const nd = dists.length;
  const pos = [], cor = [], uv = [], idx = [];
  for (let i = 0; i <= fatias; i++) {
    const p = tr.em((i / fatias) * tr.total);
    for (let j = 0; j < nd; j++) {
      const d = dists[j];
      const x = p.x + p.nx * d, z = p.z + p.nz * d;
      const y = alturaMargem(d, altura) + (d > 4 ? ruido(x, z) * 0.35 : 0);
      pos.push(x, y, z);
      uv.push(x / 5, z / 5);
      // r: 0 = lama, 1 = capim; g: escurece a beira molhada
      const capim = Math.min(1, Math.max(0, (d - 0.3) / 3 + ruido(z, x) * 0.4));
      const seco = d < 0 ? 0.35 : d < 2 ? 0.6 : 1;
      cor.push(capim, seco, 1);
    }
  }
  for (let i = 0; i < fatias; i++) {
    for (let j = 0; j < nd - 1; j++) {
      const a = i * nd + j, b = a + nd;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // garante as faces viradas para cima, qualquer que seja o lado da terra
  for (let k = 0; k < idx.length; k += 3) {
    const [i0, i1, i2] = [idx[k] * 3, idx[k + 1] * 3, idx[k + 2] * 3];
    const ux = pos[i1] - pos[i0], uz = pos[i1 + 2] - pos[i0 + 2];
    const vx = pos[i2] - pos[i0], vz = pos[i2 + 2] - pos[i0 + 2];
    if (uz * vx - ux * vz < 0) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, materialChao());
  mesh.receiveShadow = true;
  mesh.name = "chao_margem";
  if (!cortina) return mesh;
  const g = new THREE.Group();
  g.add(mesh, cortinaMata(tr, cortina, altura));
  return g;
}

const matCortina = mat(0x18210f, { roughness: 1, side: THREE.DoubleSide });
/**
 * "Fundo" escuro da mata: uma faixa vertical atrás das primeiras fileiras. Entre os troncos a gente vê
 * a sombra do interior da mata, e não o céu, como numa margem de verdade.
 */
function cortinaMata(tr, d, altura) {
  const n = Math.max(2, Math.ceil(tr.total / 3));
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const p = tr.em((i / n) * tr.total);
    const x = p.x + p.nx * d, z = p.z + p.nz * d;
    const topo = 7 + Math.sin(i * 0.7) * 1.5 + Math.sin(i * 2.3) * 0.8;
    pos.push(x, altura - 0.5, z, x, altura + topo, z);
    if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, matCortina);
  m.name = "cortina_mata";
  return m;
}

/**
 * Mata ciliar em camadas ao longo de uma margem (polilinha), do lado `lado`:
 * capim alto e taboa encostando na água, aguapé na beira, arbustos e capim baixo, árvores
 * pequenas, o dossel de copas grandes atrás e ipês floridos e carandás despontando aqui e ali.
 */
export function mataCiliar(veg, pontos, lado, {
  profundidade = 45, altura = 1.1, densidade = 1, chanceIpe = 0.07, chancePalmeira = 0.1,
  aguape = 0.25, taboa = 0.2, capimAlto = 6, alturaArvore = [11, 27], livre = () => true,
} = {}) {
  const tr = trilha(pontos, lado);
  const L = tr.total;
  const pt = (s, d) => {
    const p = tr.em(s);
    const j = randRange(-1, 1) * 1.2;
    const x = p.x + p.nx * d + p.tx * j, z = p.z + p.nz * d + p.tz * j;
    return [x, z];
  };
  const dn = (base) => veg.n(base * L * densidade);
  // 1) beira d'água: capim alto e taboa com o pé dentro d'água, aguapé encostado
  for (let i = 0; i < dn(capimAlto); i++) {
    const d = randRange(-2.2, 4);
    const [x, z] = pt(Math.random() * L, d);
    if (!livre(x, z)) continue;
    veg.add("capim_alto", x, alturaMargem(d, altura) + 0.05, z, { altura: randRange(1.0, 2.3), largura: randRange(1, 1.8) });
  }
  for (let i = 0; i < dn(taboa); i++) {
    const s0 = Math.random() * L, d0 = randRange(-2.5, 0.5);
    for (let k = 0; k < 3; k++) {
      const [x, z] = pt(s0 + randRange(-2, 2), d0 + randRange(-1, 1));
      if (!livre(x, z)) continue;
      veg.add("taboa", x, Math.max(-0.35, alturaMargem(d0, altura)), z, { altura: randRange(1.7, 2.6) });
    }
  }
  for (let i = 0; i < dn(aguape); i++) {
    const d = randRange(-7, -1.5);
    const [x, z] = pt(Math.random() * L, d);
    if (!livre(x, z)) continue;
    veg.add("aguape", x, 0, z, { escala: randRange(0.9, 1.5), variante: Math.random() < 0.6 ? 3 : 2, afundar: 0.28 });
  }
  // 2) beira seca: grama, arbustos, samambaia e pachira (mamorana)
  for (let i = 0; i < dn(5); i++) {
    const d = randRange(0.2, 12);
    const [x, z] = pt(Math.random() * L, d);
    veg.add(Math.random() < 0.6 ? "grama" : "grama2", x, alturaMargem(d, altura), z, { altura: randRange(0.5, 1.1), largura: randRange(1.2, 2) });
  }
  for (let i = 0; i < dn(1.4); i++) {
    const d = randRange(1.0, 14);
    const [x, z] = pt(Math.random() * L, d);
    const r = Math.random();
    const id = r < 0.5 ? "arbusto" : r < 0.8 ? "pachira" : "samambaia";
    const h = id === "arbusto" ? randRange(1.8, 4) : id === "pachira" ? randRange(2.2, 4.5) : randRange(0.7, 1.3);
    veg.add(id, x, alturaMargem(d, altura) - 0.05, z, { altura: h });
  }
  // 3) sub-bosque: parede de arvoretas e arbustos altos que fecha o vão embaixo das copas
  for (let i = 0; i < dn(0.5); i++) {
    const d = randRange(3, 20);
    const [x, z] = pt(Math.random() * L, d);
    const r = Math.random();
    const id = r < 0.4 ? "arvore_d" : r < 0.7 ? "arvore_c" : r < 0.85 ? "pachira" : "arbusto";
    const h = id.startsWith("arvore") ? randRange(4.5, 10) : randRange(3, 6);
    veg.add(id, x, alturaMargem(d, altura) - 0.1, z, { altura: h, brilho: randRange(0.75, 0.95) });
  }
  // 4) dossel: copas grandes em fileiras desencontradas até o fundo
  const fileiras = Math.max(2, Math.round((profundidade - 10) / 7));
  for (let f = 0; f < fileiras; f++) {
    const d0 = 10 + (f / fileiras) * (profundidade - 10);
    const passo = 7.5 / densidade / Math.sqrt(veg.dens);
    for (let s = Math.random() * passo; s < L; s += passo * randRange(0.7, 1.3)) {
      const d = d0 + randRange(-3, 3);
      const [x, z] = pt(s, d);
      const y = alturaMargem(d, altura) - 0.15;
      const r = Math.random();
      if (r < chanceIpe) {
        veg.add(Math.random() < 0.7 ? "ipe_amarelo" : "ipe_roxo", x, y, z, { altura: randRange(10, 16), cor: [1, 1, 1] });
      } else if (r < chanceIpe + chancePalmeira) {
        veg.add("caranda", x, y, z, { altura: randRange(9, 15) });
      } else {
        const id = pick(["arvore_a", "arvore_b", "copa_grande", "arvore_a", "copa_grande", "arvore_c"]);
        // fileiras do fundo um pouco mais escuras: a mata fecha e a luz entra menos
        const h = randRange(alturaArvore[0], alturaArvore[1]) * (id === "arvore_c" ? 0.7 : 1);
        veg.add(id, x, y, z, { altura: h, brilho: randRange(0.8, 1.0) - f * 0.03 });
      }
    }
  }
}

/** Mata no horizonte: anel de copas altas bem longe, o que fica no lugar das montanhas no Pantanal. */
export function mataDistante(veg, { rMin = 380, rMax = 700, arcoIni = 0, arcoFim = Math.PI * 2, n = 700, alt = [16, 30], livre = () => true }) {
  const total = veg.n(n);
  for (let i = 0; i < total; i++) {
    const a = arcoIni + Math.random() * (arcoFim - arcoIni);
    const r = randRange(rMin, rMax);
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!livre(x, z)) continue;
    const q = Math.random();
    const id = q < 0.06 ? "caranda" : q < 0.1 ? "ipe_amarelo" : pick(["copa_grande", "arvore_a", "arvore_b", "copa_grande"]);
    veg.add(id, x, 0, z, { altura: randRange(alt[0], alt[1]) * (id === "caranda" ? 0.6 : 1), brilho: randRange(0.85, 1.0) });
  }
}

/** Camalotes de aguapé boiando em manchas. area: [x0, x1, z0, z1]. */
export function camalotes(veg, n, area, livre = () => true) {
  const total = veg.n(n);
  const centros = Array.from({ length: Math.max(1, Math.round(total / 14)) }, () => [randRange(area[0], area[1]), randRange(area[2], area[3]), randRange(1.5, 5)]);
  let feitos = 0, tent = 0;
  while (feitos < total && tent < total * 8) {
    tent++;
    const [cx, cz, raio] = pick(centros);
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * raio;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.7;
    if (!livre(x, z)) continue;
    const v = Math.random() < 0.55 ? 3 : Math.random() < 0.6 ? 2 : Math.floor(Math.random() * 2);
    veg.add("aguape", x, 0, z, { escala: randRange(0.85, 1.4), variante: v, afundar: 0.28 });
    feitos++;
  }
}

// ---------------------------------------------------------------------------
// peças de primitivas
// ---------------------------------------------------------------------------

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

let matBarranco = null;
/** Barranco de terra vermelha (foto de corte de solo), com o topo de chão de capim. */
export function barranco(largura = 120, altura = 3.2, z = 6) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(largura, altura + 1.6, Math.round(largura * 1.2), 10);
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i);
    const t = (yy + (altura + 1.6) / 2) / (altura + 1.6); // 0 embaixo, 1 no topo
    // erosão: reentrâncias, sulcos verticais da chuva e o pé do barranco esparramado na água
    const dente = Math.sin(x * 0.35) * 0.45 + Math.sin(x * 1.3 + yy * 2) * 0.12 + Math.sin(x * 4.1) * 0.06 * t;
    const pe = (1 - t) * (1 - t) * 1.6;
    p.setZ(i, dente + pe - (t > 0.92 ? (t - 0.92) * 6 : 0));
    uv.setXY(i, x / 4, yy / 4);
  }
  geo.computeVertexNormals();
  if (!matBarranco) {
    matBarranco = new THREE.MeshStandardMaterial({
      map: tex("barranco.webp"),
      normalMap: tex("barranco_n.webp", false),
      color: 0xd08a66,
      roughness: 0.95,
      metalness: 0,
    });
    matBarranco.userData.shared = true;
  }
  g.add(m(geo, matBarranco, { y: (altura - 1.6) / 2, z, ry: Math.PI }));
  // topo do barranco: chão de capim que some atrás
  const topo = chaoMargem([[largura / 2, z + 5.5], [-largura / 2, z + 5.5]], -1, { profundidade: 50, altura: 0.3 });
  topo.position.y = altura - 0.25;
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
