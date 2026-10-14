// [livre] Cenário do rio real, montado a partir dos dados (dadosRio.js) em trechos de 200 m ao redor do
// barco: chão com relevo e barrancos onde a água do satélite termina, a cor do chão vinda do Sentinel-2,
// bancos de areia, mata ciliar e pasto com os impostores fotográficos (impostores.js), aguapé na beira,
// e um chão grosso + mata no horizonte até uns 2 km. A água é a WaterSurface do jogo (plano em y = 0):
// onde o chão fica abaixo de zero aparece o rio, então o formato do rio é o formato real.
//
// Referencial: o mundo 3D é o referencial do rio girado e deslocado (ver `quadro`). Ao ancorar, o
// referencial é refeito com o barco na origem e a proa para −Z, porque o arremesso do jogo é para −Z.

import * as THREE from "three";
import { CampoImpostores } from "../world/impostores.js";

const CH = 200; // lado do trecho (m)
const VEG = new URL("../../assets/vegetacao/", import.meta.url);

// ---------- utilidades ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash2 = (i, j) => (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 0x5bd1e995) >>> 0;

function ruido(x, z) {
  return Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09 - 0.7) * 0.6 + Math.sin(x * 0.37 + z * 0.29) * 0.25 + Math.sin(x * 1.1 - z * 0.8) * 0.08;
}
function ruidoLento(x, z) {
  return Math.sin(x * 0.013 + 0.4) * Math.cos(z * 0.011 + 1.9) * 0.6 + Math.sin(x * 0.031 - z * 0.027) * 0.4;
}
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function tex(nome, srgb = true) {
  if (!texCache.has(nome)) {
    const t = texLoader.load(new URL(nome, VEG).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set(nome, t);
  }
  return texCache.get(nome);
}

let _matChao = null;
/** Chão: capim, lama/serapilheira, areia e barranco misturados por atributo, tingidos pela cor do satélite. */
function materialChao() {
  if (_matChao) return _matChao;
  const m = new THREE.MeshStandardMaterial({
    map: tex("solo_capim.webp"),
    normalMap: tex("solo_lama_n.webp", false),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
  });
  m.userData.shared = true;
  const u = { uLama: { value: tex("solo_lama.webp") }, uBarranco: { value: tex("barranco.webp") } };
  m.customProgramCacheKey = () => "chao-rio-livre-v1";
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aMisto;\nvarying vec3 vMisto;\nvarying float vAlt;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMisto = aMisto;\nvAlt = position.y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uLama;\nuniform sampler2D uBarranco;\nvarying vec3 vMisto;\nvarying float vAlt;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec3 cCap = texture2D(map, vMapUv).rgb;
        vec3 cLama = texture2D(uLama, vMapUv * 0.8).rgb;
        vec3 cBar = texture2D(uBarranco, vec2(vMapUv.x + vMapUv.y, vAlt * 0.32)).rgb;
        // capim tingido pela cor do satélite; lama escura e molhada na beira; areia clara; barranco vermelho
        vec3 base = cCap * vColor * 2.3;
        base = mix(base, cLama * vec3(0.46, 0.4, 0.33), vMisto.x);
        base = mix(base, (0.55 + 0.6 * cLama.r) * vec3(0.78, 0.67, 0.5), vMisto.y);
        base = mix(base, cBar * vec3(0.78, 0.55, 0.42), vMisto.z);
        // beira molhada: escurece perto da linha d'água
        base *= mix(0.62, 1.0, smoothstep(-0.1, 0.35, vAlt));
        diffuseColor.rgb *= base;`
      )
      .replace("#include <color_fragment>", "");
  };
  _matChao = m;
  return m;
}

// ---------- quadro de referência (rio -> mundo) ----------

export class Quadro {
  constructor() {
    this.ox = 0;
    this.oz = 0;
    this.a = 0; // giro (yaw): rumo no mundo = rumo no rio + a
    this.c = 1;
    this.s = 0;
  }
  definir(ox, oz, a) {
    this.ox = ox;
    this.oz = oz;
    this.a = a;
    this.c = Math.cos(a);
    this.s = Math.sin(a);
  }
  /** rio -> mundo (escreve em out {x, z}) */
  paraMundo(x, z, out) {
    const dx = x - this.ox, dz = z - this.oz;
    out.x = dx * this.c - dz * this.s;
    out.z = dx * this.s + dz * this.c;
    return out;
  }
  /** mundo -> rio */
  paraRio(x, z, out) {
    const c = this.c, s = -this.s;
    out.x = x * c - z * s + this.ox;
    out.z = x * s + z * c + this.oz;
    return out;
  }
}

// ---------- o mundo ----------

export class MundoRio {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./dadosRio.js').DadosRio} dados
   * @param {{qualidade:string, alturaBarranco:number}} op
   */
  constructor(scene, dados, op) {
    this.scene = scene;
    this.dados = dados;
    this.root = new THREE.Group();
    this.root.name = "rio_livre";
    scene.add(this.root);
    this.quadro = new Quadro();
    this.trechos = new Map(); // "i,j" -> { group, i, j }
    this.longe = null; // chão grosso + mata do horizonte
    this.longeCentro = null;
    this.setQualidade(op.qualidade);
    this.hb = op.alturaBarranco ?? 1.2;
    this._p = { x: 0, z: 0 };
    this._cor = [0, 0, 0];
    this.chuva = null;
  }

  setQualidade(q) {
    this.q = q === "low" ? "low" : "high";
    this.raio = this.q === "low" ? 380 : 620;
    this.passo = this.q === "low" ? 5 : 2.5;
    this.dens = this.q === "low" ? 0.45 : 1;
  }

  // ---------- chão ----------

  /** Altura do chão (m, nível do rio = 0) num ponto do rio. */
  altura(x, z) {
    const D = this.dados;
    const d = D.sdf(x, z);
    const a = D.areia(x, z);
    let y;
    if (d < 0) {
      y = d > -3 ? -0.05 + d * 0.3 : Math.max(-4.2, -0.95 + (d + 3) * 0.16);
      if (a > 0.15) y = THREE.MathUtils.lerp(y, 0.12, sstep(0.15, 0.6, a));
    } else {
      const hb = this.hb * (0.75 + 0.5 * (ruidoLento(x, z) * 0.5 + 0.5));
      y = -0.05 + (hb + 0.05) * sstep(0, 5.5, d);
      y += Math.min(4, D.relevo(x, z) * 0.18) * sstep(12, 90, d);
      y += ruido(x, z) * 0.22 * sstep(4, 20, d);
      if (a > 0.15) y = THREE.MathUtils.lerp(y, 0.2 + d * 0.015, sstep(0.15, 0.6, a));
    }
    return y;
  }

  /** 0..1: mata fechada (pela cor do satélite: verde escuro). */
  mata(x, z) {
    const c = this.dados.corEm(x, z, this._cor);
    const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    const verde = c[1] - c[0];
    return sstep(0.36, 0.27, lum) * sstep(-0.01, 0.04, verde);
  }

  _chaoTrecho(i, j) {
    const D = this.dados, Q = this.quadro;
    const passo = this.passo;
    const n = Math.round(CH / passo);
    const x0 = i * CH, z0 = j * CH;
    const nv = (n + 1) * (n + 1);
    const pos = new Float32Array(nv * 3);
    const cor = new Float32Array(nv * 3);
    const mis = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2);
    const alt = new Float32Array(nv);
    const p = this._p;
    let k = 0;
    for (let b = 0; b <= n; b++) {
      for (let a = 0; a <= n; a++) {
        const x = x0 + a * passo, z = z0 + b * passo;
        const y = this.altura(x, z);
        alt[k] = y;
        Q.paraMundo(x, z, p);
        pos[k * 3] = p.x;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = p.z;
        uv[k * 2] = x / 4.5;
        uv[k * 2 + 1] = z / 4.5;
        // cor do satélite: no pasto vale a foto; debaixo da mata, chão de folhas escuro
        const c = D.corEm(x, z, this._cor);
        const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
        const fm = sstep(0.36, 0.27, lum) * sstep(-0.01, 0.04, c[1] - c[0]);
        const r = THREE.MathUtils.lerp(c[0], 0.3, fm), g = THREE.MathUtils.lerp(c[1], 0.32, fm), bb = THREE.MathUtils.lerp(c[2], 0.2, fm);
        // normaliza o brilho (a textura de capim traz o detalhe), mantendo o tom
        const l = Math.max(0.08, 0.3 * r + 0.59 * g + 0.11 * bb);
        const kk = THREE.MathUtils.lerp(0.42 / l, 1, 0.35);
        cor[k * 3] = Math.min(1, r * kk);
        cor[k * 3 + 1] = Math.min(1, g * kk);
        cor[k * 3 + 2] = Math.min(1, bb * kk);
        const d = D.sdf(x, z);
        mis[k * 3] = Math.max(sstep(2.5, -1.0, d), fm * 0.55); // lama na beira e folhas na mata
        mis[k * 3 + 1] = sstep(0.2, 0.6, D.areia(x, z));
        k++;
      }
    }
    // barranco: onde o chão é íngreme
    for (let b = 0; b <= n; b++) {
      for (let a = 0; a <= n; a++) {
        const kk = b * (n + 1) + a;
        const ax = alt[b * (n + 1) + Math.min(n, a + 1)] - alt[b * (n + 1) + Math.max(0, a - 1)];
        const az = alt[Math.min(n, b + 1) * (n + 1) + a] - alt[Math.max(0, b - 1) * (n + 1) + a];
        const incl = Math.hypot(ax, az) / (2 * passo);
        mis[kk * 3 + 2] = sstep(0.35, 0.75, incl) * (1 - mis[kk * 3 + 1]);
      }
    }
    const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(n * n * 6);
    let t = 0;
    for (let b = 0; b < n; b++) {
      for (let a = 0; a < n; a++) {
        const v0 = b * (n + 1) + a, v1 = v0 + 1, v2 = v0 + n + 1, v3 = v2 + 1;
        idx[t++] = v0; idx[t++] = v2; idx[t++] = v1;
        idx[t++] = v1; idx[t++] = v2; idx[t++] = v3;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
    geo.setAttribute("aMisto", new THREE.BufferAttribute(mis, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    // a ordem dos vértices depende do giro do quadro: garante a face para cima
    const nrm = geo.attributes.normal;
    if (nrm.getY(0) < 0 && nrm.getY(nv >> 1) < 0) {
      for (let q = 0; q < idx.length; q += 3) [idx[q + 1], idx[q + 2]] = [idx[q + 2], idx[q + 1]];
      geo.index.needsUpdate = true;
      geo.computeVertexNormals();
    }
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, materialChao());
    mesh.receiveShadow = true;
    mesh.name = "chao_rio";
    return mesh;
  }

  // ---------- vegetação ----------

  _vegTrecho(i, j, group) {
    const D = this.dados, Q = this.quadro;
    const R = rng(hash2(i, j));
    const campos = new Map();
    const add = (id, x, z, o) => {
      let c = campos.get(id);
      if (!c) campos.set(id, (c = new CampoImpostores(id)));
      const p = Q.paraMundo(x, z, this._p);
      const y = o.y ?? this.altura(x, z);
      const t = 0.85 + R() * 0.22;
      c.add(p.x, y, p.z, { ...o, cor: o.cor ?? [t, t * (0.97 + R() * 0.06), t * (0.88 + R() * 0.1)], rumo: R() * Math.PI * 2 });
    };
    const x0 = i * CH, z0 = j * CH;
    const dens = this.dens;
    const perto = (this._distBarco ?? 0) < 260; // plantas baixas só perto do barco

    // 1) árvores
    const pa = this.q === "low" ? 10 : 7;
    for (let z = z0; z < z0 + CH; z += pa) {
      for (let x = x0; x < x0 + CH; x += pa) {
        const px = x + R() * pa, pz = z + R() * pa;
        const d = D.sdf(px, pz);
        if (d < 2.5) continue;
        const m = this.mata(px, pz);
        const ciliar = d < 22;
        const pr = (ciliar ? 0.92 : m > 0.5 ? 0.85 : 0.035 + m * 0.3) * dens;
        if (R() > pr) continue;
        const r = R();
        let id, h;
        if (ciliar && d < 9 && r < 0.45) {
          id = r < 0.15 ? "pachira" : r < 0.3 ? "arvore_d" : "arvore_c";
          h = id === "pachira" ? 2.5 + R() * 2.5 : 5 + R() * 5;
        } else if (m > 0.5 || ciliar) {
          if (r < 0.32) { id = "copa_grande"; h = 14 + R() * 10; }
          else if (r < 0.55) { id = "arvore_a"; h = 10 + R() * 7; }
          else if (r < 0.7) { id = "arvore_b"; h = 8 + R() * 6; }
          else if (r < 0.8) { id = "arvore_d"; h = 6 + R() * 5; }
          else if (r < 0.87) { id = "arvore_c"; h = 5 + R() * 4; }
          else if (r < 0.92) { id = R() < 0.7 ? "ipe_amarelo" : "ipe_roxo"; h = 10 + R() * 6; }
          else { id = "caranda"; h = 9 + R() * 6; }
        } else {
          // pasto: carandá, árvores isoladas e ipês
          if (r < 0.4) { id = "caranda"; h = 8 + R() * 7; }
          else if (r < 0.7) { id = "arvore_a"; h = 8 + R() * 6; }
          else if (r < 0.88) { id = "copa_grande"; h = 11 + R() * 8; }
          else { id = "ipe_amarelo"; h = 9 + R() * 5; }
        }
        add(id, px, pz, { altura: h, brilho: 0.8 + R() * 0.2 - (ciliar ? 0 : 0.06), cor: id.startsWith("ipe") ? [1, 1, 1] : undefined });
      }
    }
    // 2) arbustos na beira e na orla da mata
    const pb = this.q === "low" ? 7 : 4.5;
    for (let z = z0; z < z0 + CH; z += pb) {
      for (let x = x0; x < x0 + CH; x += pb) {
        const px = x + R() * pb, pz = z + R() * pb;
        const d = D.sdf(px, pz);
        if (d < 1.2 || d > 24) continue;
        if (R() > 0.45 * dens) continue;
        const r = R();
        const id = r < 0.55 ? "arbusto" : r < 0.85 ? "pachira" : "samambaia";
        const h = id === "arbusto" ? 1.8 + R() * 2.2 : id === "pachira" ? 2.2 + R() * 2.3 : 0.7 + R() * 0.6;
        add(id, px, pz, { altura: h });
      }
    }
    // 3) capim e taboa na linha d'água, grama no barranco (só nos trechos perto do barco)
    if (perto || this.q === "high") {
      const pc = this.q === "low" ? 4 : 2.6;
      for (let z = z0; z < z0 + CH; z += pc) {
        for (let x = x0; x < x0 + CH; x += pc) {
          const px = x + R() * pc, pz = z + R() * pc;
          const d = D.sdf(px, pz);
          if (d < -2.2 || d > 6) continue;
          if (D.areia(px, pz) > 0.4) continue;
          const r = R();
          if (r > 0.7 * dens) continue;
          if (d < 0) {
            if (r < 0.25) add("taboa", px, pz, { altura: 1.7 + R() * 0.9, y: Math.max(-0.35, this.altura(px, pz)) });
            else add("capim_alto", px, pz, { altura: 1.0 + R() * 1.2, largura: 1 + R() * 0.8, y: Math.max(-0.3, this.altura(px, pz)) + 0.05 });
          } else if (d < 2.5) {
            add("capim_alto", px, pz, { altura: 1.0 + R() * 1.3, largura: 1 + R() * 0.8 });
          } else {
            add(R() < 0.6 ? "grama" : "grama2", px, pz, { altura: 0.5 + R() * 0.6, largura: 1.2 + R() * 0.8 });
          }
        }
      }
    }
    // 4) camalotes de aguapé encostados na beira (mais nos remansos e nas lagoas)
    const pg = this.q === "low" ? 5 : 3.2;
    for (let z = z0; z < z0 + CH; z += pg) {
      for (let x = x0; x < x0 + CH; x += pg) {
        const px = x + R() * pg, pz = z + R() * pg;
        const d = D.sdf(px, pz);
        if (d > -1.2 || d < -10) continue;
        const mancha = ruidoLento(px * 3.1, pz * 3.1) + ruidoLento(pz * 7.3, px * 7.3) * 0.5;
        if (mancha < 0.35 || R() > 0.75 * dens) continue;
        const v = R() < 0.55 ? 3 : R() < 0.6 ? 2 : Math.floor(R() * 2);
        add("aguape", px, pz, { escala: 0.85 + R() * 0.6, variante: v, afundar: 0.28, y: 0 });
      }
    }
    for (const c of campos.values()) if (c.count) group.add(c.build());
  }

  // ---------- trechos ----------

  _montarTrecho(i, j) {
    const g = new THREE.Group();
    g.name = `trecho_${i}_${j}`;
    g.add(this._chaoTrecho(i, j));
    this._vegTrecho(i, j, g);
    this.root.add(g);
    this.trechos.set(`${i},${j}`, { group: g, i, j });
  }

  _descartar(g) {
    this.root.remove(g);
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      // materiais e texturas são compartilhados (cache): não descarta
    });
  }

  /** Recria tudo num novo referencial (ao ancorar). bx, bz: barco no rio. */
  refazer(bx, bz) {
    for (const t of this.trechos.values()) this._descartar(t.group);
    this.trechos.clear();
    if (this.longe) this._descartar(this.longe);
    this.longe = null;
    this.longeCentro = null;
    this.atualizar(bx, bz, Infinity);
  }

  /**
   * Carrega os trechos em volta do barco e descarta os longe. `orcamentoMs` limita o tempo por quadro.
   */
  atualizar(bx, bz, orcamentoMs = 6) {
    const t0 = performance.now();
    const R = this.raio;
    const ci = Math.floor(bx / CH), cj = Math.floor(bz / CH);
    const nr = Math.ceil(R / CH) + 1;
    // horizonte
    const lc = `${Math.round(bx / 400)},${Math.round(bz / 400)}`;
    if (lc !== this.longeCentro) {
      if (this.longe) this._descartar(this.longe);
      this.longe = this._montarLonge(Math.round(bx / 400) * 400, Math.round(bz / 400) * 400);
      this.longeCentro = lc;
    }
    // trechos que faltam, do mais perto para o mais longe
    const faltam = [];
    for (let j = cj - nr; j <= cj + nr; j++) {
      for (let i = ci - nr; i <= ci + nr; i++) {
        const cx = (i + 0.5) * CH, cz = (j + 0.5) * CH;
        const d = Math.hypot(cx - bx, cz - bz) - CH * 0.7;
        if (d > R) continue;
        if (!this.trechos.has(`${i},${j}`)) faltam.push([d, i, j]);
      }
    }
    faltam.sort((a, b) => a[0] - b[0]);
    for (const [d, i, j] of faltam) {
      this._distBarco = d;
      this._montarTrecho(i, j);
      if (performance.now() - t0 > orcamentoMs) break;
    }
    // descarta os que ficaram longe
    for (const [k, t] of this.trechos) {
      const cx = (t.i + 0.5) * CH, cz = (t.j + 0.5) * CH;
      if (Math.hypot(cx - bx, cz - bz) - CH * 0.7 > R + 220) {
        this._descartar(t.group);
        this.trechos.delete(k);
      }
    }
    return faltam.length;
  }

  /** Chão grosso (células de 50 m) e mata alta até ~2 km: o horizonte do Pantanal. */
  _montarLonge(cx, cz) {
    const D = this.dados, Q = this.quadro;
    const g = new THREE.Group();
    g.name = "horizonte_rio";
    const L = 4400, c = 50, n = L / c;
    const nv = (n + 1) * (n + 1);
    const pos = new Float32Array(nv * 3), cor = new Float32Array(nv * 3), mis = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const p = this._p;
    let k = 0;
    for (let b = 0; b <= n; b++) {
      for (let a = 0; a <= n; a++) {
        const x = cx - L / 2 + a * c, z = cz - L / 2 + b * c;
        const d = D.sdf(x, z);
        // fica abaixo do chão de perto (não aparece por cima dele) e abaixo d'água perto do rio
        const y = d < 40 ? -1.6 : this.hb * 0.6 - 0.35 + Math.min(3, D.relevo(x, z) * 0.12);
        Q.paraMundo(x, z, p);
        pos[k * 3] = p.x;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = p.z;
        uv[k * 2] = x / 4.5;
        uv[k * 2 + 1] = z / 4.5;
        const cc = D.corEm(x, z, this._cor);
        cor[k * 3] = cc[0] * 1.1;
        cor[k * 3 + 1] = cc[1] * 1.1;
        cor[k * 3 + 2] = cc[2] * 1.1;
        k++;
      }
    }
    const idx = new Uint32Array(n * n * 6);
    let t = 0;
    for (let b = 0; b < n; b++) {
      for (let a = 0; a < n; a++) {
        const v0 = b * (n + 1) + a, v1 = v0 + 1, v2 = v0 + n + 1, v3 = v2 + 1;
        idx[t++] = v0; idx[t++] = v2; idx[t++] = v1;
        idx[t++] = v1; idx[t++] = v2; idx[t++] = v3;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
    geo.setAttribute("aMisto", new THREE.BufferAttribute(mis, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    if (geo.attributes.normal.getY(nv >> 1) < 0) {
      for (let q = 0; q < idx.length; q += 3) [idx[q + 1], idx[q + 2]] = [idx[q + 2], idx[q + 1]];
      geo.computeVertexNormals();
    }
    geo.computeBoundingSphere();
    const chao = new THREE.Mesh(geo, materialChao());
    chao.name = "chao_longe";
    g.add(chao);
    // mata do horizonte: copas altas onde o satélite mostra mata, além do raio dos trechos
    const R = rng(hash2(cx | 0, cz | 0));
    const campos = new Map();
    const passo = this.q === "low" ? 48 : 30;
    const rMin = this.raio - 60, rMax = this.q === "low" ? 1500 : 2100;
    for (let z = cz - rMax; z < cz + rMax; z += passo) {
      for (let x = cx - rMax; x < cx + rMax; x += passo) {
        const px = x + R() * passo, pz = z + R() * passo;
        const dd = Math.hypot(px - cx, pz - cz);
        if (dd < rMin || dd > rMax) continue;
        const d = D.sdf(px, pz);
        if (d < 8) continue;
        const m = this.mata(px, pz);
        if (R() > (d < 40 ? 0.9 : m > 0.5 ? 0.8 : 0.04)) continue;
        const r = R();
        const id = r < 0.45 ? "copa_grande" : r < 0.75 ? "arvore_a" : r < 0.9 ? "arvore_b" : "caranda";
        const h = id === "copa_grande" ? 16 + R() * 10 : id === "caranda" ? 10 + R() * 5 : 11 + R() * 7;
        let cpo = campos.get(id);
        if (!cpo) campos.set(id, (cpo = new CampoImpostores(id)));
        Q.paraMundo(px, pz, p);
        const tt = 0.8 + R() * 0.2;
        cpo.add(p.x, this.hb * 0.6 - 0.4, p.z, { altura: h, brilho: tt, rumo: R() * 6.28, largura: 1.15 });
      }
    }
    for (const cpo of campos.values()) if (cpo.count) g.add(cpo.build());
    this.root.add(g);
    return g;
  }

  // ---------- chuva ----------

  /** Chuva visível em volta da câmera (0 = sem chuva). */
  atualizarChuva(intensidade, camera, dt, vento = [0, 0]) {
    if (intensidade <= 0.01) {
      if (this.chuva) this.chuva.visible = false;
      return;
    }
    if (!this.chuva) {
      const n = this.q === "low" ? 1800 : 5000;
      const pos = new Float32Array(n * 6);
      this._gotas = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        this._gotas[i * 3] = (Math.random() - 0.5) * 70;
        this._gotas[i * 3 + 1] = Math.random() * 30;
        this._gotas[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xc8d4dc, transparent: true, opacity: 0.32, depthWrite: false, fog: true });
      this.chuva = new THREE.LineSegments(geo, mat);
      this.chuva.frustumCulled = false;
      this.chuva.name = "chuva";
      this.scene.add(this.chuva);
    }
    const ch = this.chuva;
    ch.visible = true;
    const pos = ch.geometry.attributes.position.array;
    const G = this._gotas;
    const n = G.length / 3;
    const ativas = Math.floor(n * Math.min(1, 0.25 + intensidade * 0.75));
    const vq = 13, comp = 0.55 + intensidade * 0.4;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (let i = 0; i < n; i++) {
      let y = G[i * 3 + 1] - vq * dt;
      if (y < -2) y += 32;
      G[i * 3 + 1] = y;
      G[i * 3] += vento[0] * dt;
      G[i * 3 + 2] += vento[1] * dt;
      if (G[i * 3] > 35) G[i * 3] -= 70;
      if (G[i * 3] < -35) G[i * 3] += 70;
      if (G[i * 3 + 2] > 35) G[i * 3 + 2] -= 70;
      if (G[i * 3 + 2] < -35) G[i * 3 + 2] += 70;
      const x = cx + G[i * 3], yy = Math.max(0, cy - 4 + y), z = cz + G[i * 3 + 2];
      const o = i * 6;
      if (i < ativas) {
        pos[o] = x; pos[o + 1] = yy; pos[o + 2] = z;
        pos[o + 3] = x - vento[0] * 0.04; pos[o + 4] = yy + comp; pos[o + 5] = z - vento[1] * 0.04;
      } else {
        pos[o] = pos[o + 3] = x; pos[o + 1] = pos[o + 4] = -50; pos[o + 2] = pos[o + 5] = z;
      }
    }
    ch.geometry.attributes.position.needsUpdate = true;
    ch.material.opacity = 0.18 + intensidade * 0.25;
  }

  descartar() {
    for (const t of this.trechos.values()) this._descartar(t.group);
    this.trechos.clear();
    if (this.longe) this._descartar(this.longe);
    this.longe = null;
    this.scene.remove(this.root);
    if (this.chuva) {
      this.scene.remove(this.chuva);
      this.chuva.geometry.dispose();
      this.chuva.material.dispose();
      this.chuva = null;
    }
  }
}

// ---------- a voadeira ----------

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...o });
}

/** Voadeira de alumínio de 6 m com motor de popa e o piloto. Proa para −Z, linha d'água em y = 0. */
export function voadeiraLivre() {
  const g = new THREE.Group();
  g.name = "voadeira_livre";
  const alu = mat(0xa7b0b5, { metalness: 0.65, roughness: 0.38 });
  const aluEsc = mat(0x6f777c, { metalness: 0.6, roughness: 0.45 });
  const verde = mat(0x2f5a3a, { metalness: 0.3, roughness: 0.5 });
  // casco: seções transversais de popa (z = +2.9) à proa (z = −3.1), fundo em V e proa levantada
  const secoes = [];
  const N = 14;
  for (let s = 0; s <= N; s++) {
    const t = s / N; // 0 popa, 1 proa
    const z = 2.9 - t * 6.0;
    const meia = 0.82 * (t < 0.62 ? 1 : Math.cos(((t - 0.62) / 0.38) * Math.PI * 0.5) * 0.98 + 0.02);
    const fundo = -0.22 + Math.pow(Math.max(0, t - 0.55) / 0.45, 2) * 0.32;
    const borda = 0.42 + Math.pow(Math.max(0, t - 0.6) / 0.4, 2) * 0.14;
    secoes.push({ z, meia, fundo, borda });
  }
  const pos = [], idx = [];
  // cada seção: 5 pontos (borda esq, quina esq, quilha, quina dir, borda dir)
  for (const s of secoes) {
    pos.push(-s.meia, s.borda, s.z, -s.meia * 0.86, s.fundo + 0.1, s.z, 0, s.fundo, s.z, s.meia * 0.86, s.fundo + 0.1, s.z, s.meia, s.borda, s.z);
  }
  for (let s = 0; s < N; s++) {
    for (let k = 0; k < 4; k++) {
      const a = s * 5 + k, b = a + 5;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // espelho de popa
  const p0 = 0;
  idx.push(p0, p0 + 1, p0 + 4, p0 + 1, p0 + 3, p0 + 4, p0 + 1, p0 + 2, p0 + 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const casco = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xa7b0b5, metalness: 0.65, roughness: 0.38, side: THREE.DoubleSide }));
  casco.castShadow = true;
  g.add(casco);
  // faixa verde no costado
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 4.0), verde);
    f.position.set(sx * 0.815, 0.3, 0.75);
    g.add(f);
  }
  // borda (verdugo), assoalho e bancos
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 4.4), aluEsc);
    b.position.set(sx * 0.8, 0.44, 0.6);
    g.add(b);
  }
  const piso = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.03, 4.6), mat(0x5d4630, { roughness: 0.9, metalness: 0 }));
  piso.position.set(0, -0.02, 0.4);
  piso.receiveShadow = true;
  g.add(piso);
  for (const z of [-1.2, 0.6, 2.2]) {
    const banco = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.05, 0.36), alu);
    banco.position.set(0, 0.3, z);
    banco.castShadow = true;
    g.add(banco);
  }
  // motor de popa
  const motor = new THREE.Group();
  const capo = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.6), mat(0x1b1d20, { roughness: 0.35, metalness: 0.2 }));
  capo.position.y = 0.72;
  capo.castShadow = true;
  motor.add(capo);
  const tampa = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.62), mat(0xc9302c, { roughness: 0.4 }));
  tampa.position.y = 1.0;
  motor.add(tampa);
  const perna = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.2), aluEsc);
  perna.position.set(0, 0.12, 0.05);
  motor.add(perna);
  const rabeta = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.42), aluEsc);
  rabeta.position.set(0, -0.32, 0.02);
  motor.add(rabeta);
  const cana = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), mat(0x222222));
  cana.rotation.x = Math.PI / 2;
  cana.position.set(0, 0.68, -0.6);
  motor.add(cana);
  motor.position.set(0, 0, 3.0);
  g.add(motor);
  g.userData.motor = motor;
  // piloto sentado na popa, mão na cana do motor
  const piloto = new THREE.Group();
  const roupa = mat(0x3d5a73, { roughness: 0.85, metalness: 0 });
  const pele = mat(0xb57a55, { roughness: 0.8, metalness: 0 });
  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 8), roupa);
  tronco.position.y = 0.78;
  tronco.castShadow = true;
  piloto.add(tronco);
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), pele);
  cabeca.position.y = 1.18;
  piloto.add(cabeca);
  const chapeu = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 14), mat(0xd9c79a, { roughness: 0.9 }));
  chapeu.position.y = 1.27;
  piloto.add(chapeu);
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), mat(0xd9c79a, { roughness: 0.9 }));
  copa.position.y = 1.33;
  piloto.add(copa);
  for (const sx of [-1, 1]) {
    const perna2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 6), mat(0x2b2f36, { roughness: 0.9 }));
    perna2.rotation.x = Math.PI / 2;
    perna2.position.set(sx * 0.11, 0.42, -0.25);
    piloto.add(perna2);
  }
  const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 6), roupa);
  braco.rotation.x = Math.PI / 2.6;
  braco.position.set(0.22, 0.82, 0.2);
  piloto.add(braco);
  piloto.position.set(0, 0, 2.25);
  g.add(piloto);
  g.userData.piloto = piloto;
  // âncora (some quando navega)
  const ancora = new THREE.Group();
  const corda = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 4), mat(0xcfc2a0, { roughness: 1 }));
  corda.position.set(0, -0.2, -3.0);
  corda.rotation.x = 0.5;
  ancora.add(corda);
  ancora.visible = false;
  g.add(ancora);
  g.userData.ancora = ancora;
  return g;
}
