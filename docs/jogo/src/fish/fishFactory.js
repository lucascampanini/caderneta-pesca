// Peixes: a foto real da Caderneta com volume e nado (createPhotoFish) ou, sem foto, de primitivas.
// Procedural fish meshes built entirely from primitives. Geometry is shared
// across all fish; materials are cached per species. A fish group is built at
// 1 unit body length and scaled to its rolled real-world size.

import * as THREE from "three";
import { clamp } from "../utils/utils.js";
import { CONFIG } from "../data/config.js";
import { FISH_BY_ID } from "../data/fishData.js";
import { envEquipamento } from "../gameplay/materiaisEquipamento.js";

const geoCache = {};
const matCache = new Map();

function sharedGeo(key, make) {
  if (!geoCache[key]) {
    geoCache[key] = make();
    geoCache[key].userData.shared = true;
  }
  return geoCache[key];
}

function speciesMaterials(species) {
  if (matCache.has(species.id)) return matCache.get(species.id);
  const { look } = species;
  const body = new THREE.MeshStandardMaterial({
    color: look.colorA,
    roughness: 0.45,
    metalness: 0.25,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: look.colorB,
    roughness: 0.5,
    metalness: 0.15,
  });
  const fin = new THREE.MeshStandardMaterial({
    color: look.finColor,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  if (look.glow) {
    body.emissive = new THREE.Color(look.colorA);
    body.emissiveIntensity = 0.22;
  }
  for (const m of [body, accent, fin]) m.userData.shared = true;
  const mats = { body, accent, fin };
  matCache.set(species.id, mats);
  return mats;
}

// Proportions per silhouette: [bodyHeight, bodyWidth] at unit length.
const SHAPES = {
  standard: { h: 0.32, w: 0.17 },
  slim: { h: 0.24, w: 0.13 },
  long: { h: 0.13, w: 0.11 },
  flat: { h: 0.09, w: 0.34 },
  billed: { h: 0.26, w: 0.15 },
};

// ---------- peixe com a foto real (recorte da Caderneta), com volume ----------
// Os recortes ficam em ../fotos/<id>-card.webp. A maioria olha para a esquerda; estes olham para a direita.
// A foto vira um corpo: uma malha subdividida inflada pela silhueta (lida do canal alfa), frente e verso,
// que ondula de lado para nadar (no vertex shader). Debaixo d'água o peixe escurece, some com a
// profundidade e treme com a refração, sem ser tapado pela superfície opaca da água.
const OLHA_DIREITA = new Set(["cachara", "jurupoca", "pacupeva", "palmito", "piranha", "tilapia"]);
const fotoCache = new Map();
const loader = new THREE.TextureLoader();
const WATER_Y = CONFIG.water.level;

// grossura do corpo (fração da altura) por silhueta: pacu é achatado, bagre é roliço
const GROSSURA = { standard: 0.45, slim: 0.5, long: 0.85, flat: 0.3, billed: 0.45 };

function fotoMaterial(species) {
  if (fotoCache.has(species.id)) return fotoCache.get(species.id);
  const entry = { tex: null, aspect: 0.4, ok: true, waiting: [], geo: null, boca: new THREE.Vector3(0.49, 0, 0), look: species.look };
  const tex = loader.load(
    `../fotos/${species.id}-card.webp`,
    (t) => {
      entry.aspect = t.image.height / t.image.width;
      try {
        entry.geo = corpoGeometria(t.image, OLHA_DIREITA.has(species.id), entry);
      } catch {
        entry.geo = null;
      }
      entry.waiting.forEach((fn) => fn(entry));
      entry.waiting = [];
    },
    undefined,
    () => { entry.ok = false; }
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  entry.tex = tex;
  fotoCache.set(species.id, entry);
  return entry;
}

/** Pré-carrega as fotos dos peixes de um pesqueiro, para a primeira briga já sair com foto. */
export function preloadFishPhotos(ids) {
  for (const id of ids) {
    const sp = FISH_BY_ID[id];
    fotoMaterial(sp || { id });
  }
}

/**
 * Lê a silhueta da foto (alfa) coluna a coluna e infla uma malha em forma de corpo.
 * Nariz sempre em +X (fotos que olham para a esquerda são espelhadas no UV).
 */
function corpoGeometria(img, olhaDireita, entry) {
  const W = 128;
  const H = Math.max(8, Math.round(W * img.height / img.width));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const alfa = g.getImageData(0, 0, W, H).data;
  // por coluna: centro e meia-altura da silhueta (em v, 0 = embaixo, 1 = em cima)
  const centro = new Float32Array(W), meia = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let topo = -1, base = -1;
    for (let y = 0; y < H; y++) {
      if (alfa[(y * W + x) * 4 + 3] > 115) {
        if (topo < 0) topo = y;
        base = y;
      }
    }
    if (topo < 0) continue;
    const vTopo = 1 - topo / (H - 1), vBase = 1 - base / (H - 1);
    centro[x] = (vTopo + vBase) / 2;
    meia[x] = (vTopo - vBase) / 2;
  }
  // altura do corpo (sem nadadeiras): a maior meia-altura no miolo do peixe
  let corpoMax = 0;
  for (let x = Math.floor(W * 0.3); x < W * 0.7; x++) corpoMax = Math.max(corpoMax, meia[x]);
  corpoMax = corpoMax || 0.4;
  const aspect = H / W;
  const k = (GROSSURA[entry.look?.shape] ?? 0.45) + (entry.look?.whiskers ? 0.12 : 0);
  const NX = 56, NY = 24;
  const pos = [], uv = [], idx = [];
  for (const lado of [1, -1]) {
    const base = pos.length / 3;
    for (let iy = 0; iy <= NY; iy++) {
      const v = iy / NY;
      for (let ix = 0; ix <= NX; ix++) {
        const s = ix / NX; // 0 = cauda, 1 = nariz
        const tu = olhaDireita ? s : 1 - s;
        const col = Math.min(W - 1, Math.round(tu * (W - 1)));
        const hh = Math.min(meia[col], corpoMax);
        let z = 0;
        if (hh > 0.004) {
          const r = (v - centro[col]) / hh;
          if (Math.abs(r) < 1) {
            // perfil: fino na cauda, cheio no meio, afinando no focinho
            const env = smoothstep(0.08, 0.42, s) * (1 - 0.5 * smoothstep(0.82, 1.0, s));
            z = Math.sqrt(1 - r * r) * hh * aspect * k * env;
          }
        }
        pos.push(s - 0.5, (v - 0.5) * aspect, z * lado);
        uv.push(tu, v);
      }
    }
    for (let iy = 0; iy < NY; iy++) {
      for (let ix = 0; ix < NX; ix++) {
        const a = base + iy * (NX + 1) + ix, b = a + 1, cc = a + NX + 1, d = cc + 1;
        if (lado > 0) idx.push(a, b, d, a, d, cc);
        else idx.push(a, d, b, a, cc, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.userData.shared = true;
  // boca: ponta do focinho, na altura do centro da silhueta ali
  const colBoca = Math.min(W - 1, Math.round((olhaDireita ? 0.985 : 0.015) * (W - 1)));
  entry.boca.set(0.49, (centro[colBoca] - 0.5) * aspect, 0);
  return geo;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Material do peixe com ondulação de nado e o truque da água (um por peixe: os uniforms são dele). */
function materialPeixe(tex) {
  const u = {
    uFase: { value: 0 },
    uAmp: { value: 0.05 },
    uOnda: { value: 5.5 },
    uCurva: { value: 0 },
    uRelogio: { value: 0 },
    uAguaY: { value: WATER_Y },
    uTurbidez: { value: 0.9 },
    uCorAgua: { value: new THREE.Color(0x3a5248) },
    uMolhado: { value: 0 },
  };
  // reflexo do céu na escama (sem ambiente, peixe molhado fica preto)
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, transparent: true, roughness: 0.45, metalness: 0.1, envMap: envEquipamento(), envMapIntensity: 0.7 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform float uFase, uAmp, uOnda, uCurva, uRelogio, uAguaY;
varying float vProf;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
// nado: onda lateral que cresce para a cauda; a cabeça balança pouco ao contrário
float sCorpo = position.x + 0.5;
float wCauda = pow(1.0 - sCorpo, 1.7);
transformed.z += uAmp * (wCauda * sin(uFase - sCorpo * uOnda) - 0.15 * sCorpo * sCorpo * sin(uFase));
transformed.z += uCurva * position.x * position.x * 2.0;`)
      .replace("#include <project_vertex>", `#include <project_vertex>
vec4 wpA = modelMatrix * vec4(transformed, 1.0);
vProf = uAguaY - wpA.y;
if (vProf > 0.0) {
  // refração: parece mais raso e treme com a superfície
  float pr = min(vProf, 1.5);
  wpA.y = uAguaY - vProf * 0.75;
  wpA.x += sin(wpA.z * 3.1 + uRelogio * 2.1) * 0.025 * pr;
  wpA.z += cos(wpA.x * 2.7 + uRelogio * 1.7) * 0.025 * pr;
  mvPosition = viewMatrix * wpA;
  gl_Position = projectionMatrix * mvPosition;
  // profundidade do ponto da superfície no mesmo raio: passa na frente da água opaca,
  // mas o que está acima da água entre a câmera e o peixe (vara, linha, trapiche) ainda tapa
  vec3 raio = wpA.xyz - cameraPosition;
  float tt = (uAguaY - cameraPosition.y) / raio.y;
  if (raio.y < 0.0 && tt > 0.0 && tt < 1.0) {
    vec4 sc = projectionMatrix * viewMatrix * vec4(cameraPosition + raio * tt, 1.0);
    gl_Position.z = (sc.z / sc.w - 0.00002) * gl_Position.w;
  }
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 uCorAgua;
uniform float uTurbidez, uMolhado;
varying float vProf;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.28, uMolhado);`)
      .replace("#include <opaque_fragment>", `#include <opaque_fragment>
if (vProf > 0.0) {
  // debaixo d'água: esverdeado, escuro e sumindo com a profundidade
  float vis = exp(-vProf * uTurbidez);
  gl_FragColor.rgb = mix(uCorAgua, gl_FragColor.rgb * vec3(0.72, 0.86, 0.78), 0.3 + 0.7 * vis);
  gl_FragColor.a *= clamp(vis * 2.1, 0.0, 0.95);
}`);
  };
  m.customProgramCacheKey = () => "peixeFoto1";
  return { m, u };
}

function createPhotoFish(species, sizeCm) {
  const entry = fotoMaterial(species);
  if (!entry.ok) return null;
  const { m, u } = materialPeixe(entry.tex);
  const corpo = new THREE.Mesh(entry.geo || sharedGeo("fotoPlano", () => new THREE.PlaneGeometry(1, 1, 1, 1)), m);
  const boca = new THREE.Object3D();
  corpo.add(boca);
  const ajusta = (e) => {
    if (e.geo) {
      corpo.geometry = e.geo;
      corpo.scale.set(1, 1, 1);
    } else corpo.scale.set(OLHA_DIREITA.has(species.id) ? 1 : -1, e.aspect, 1);
    boca.position.copy(e.boca);
  };
  ajusta(entry);
  if (!entry.geo && entry.waiting) entry.waiting.push(ajusta);
  corpo.frustumCulled = false;
  const wrapper = new THREE.Group();
  wrapper.rotation.order = "YXZ"; // rumo, rolagem (de lado), arfagem (nariz para cima)
  wrapper.add(corpo);
  wrapper.scale.setScalar(clamp(sizeCm / 100, 0.16, 3.6));
  wrapper.userData.speciesId = species.id;
  wrapper.userData.anim = { u, boca, corpo };
  return wrapper;
}

/**
 * Anima o nado: frequência da batida da cauda (Hz), amplitude (fração do corpo) e curvatura (virando).
 * molhado: 0 a 1, brilho de peixe saindo da água.
 */
export function animarPeixe(mesh, dt, { batida = 1.5, amp = 0.05, curva = 0, molhado = 0 } = {}) {
  const a = mesh?.userData.anim;
  if (!a) return;
  a.u.uFase.value += dt * batida * Math.PI * 2;
  a.u.uAmp.value += (amp - a.u.uAmp.value) * Math.min(1, dt * 8);
  a.u.uCurva.value += (curva - a.u.uCurva.value) * Math.min(1, dt * 6);
  a.u.uRelogio.value += dt;
  a.u.uMolhado.value = molhado;
}

/** Posição da boca do peixe no mundo (onde a linha se prende). */
export function bocaDoPeixe(mesh, out) {
  const a = mesh?.userData.anim;
  if (!a) return out.copy(mesh.position);
  mesh.updateMatrixWorld(true);
  return a.boca.getWorldPosition(out);
}

/** Libera o que é só deste peixe (o material; foto e malha são compartilhadas). */
export function descartarPeixe(mesh) {
  mesh?.traverse((o) => {
    if (o.material && !o.material.userData.shared) o.material.dispose();
  });
}

export function createFishMesh(species, sizeCm) {
  const foto = createPhotoFish(species, sizeCm);
  if (foto) return foto;
  return createPrimitiveFish(species, sizeCm);
}

function createPrimitiveFish(species, sizeCm) {
  const { look } = species;
  const shape = SHAPES[look.shape] || SHAPES.standard;
  const mats = speciesMaterials(species);
  const g = new THREE.Group();

  const bodyGeo = sharedGeo("body", () => new THREE.SphereGeometry(0.5, 20, 14));
  const body = new THREE.Mesh(bodyGeo, mats.body);
  body.scale.set(1, shape.h * 2, shape.w * 2);
  g.add(body);

  // lighter belly: slightly smaller accent-colored sphere nudged downward
  const belly = new THREE.Mesh(bodyGeo, mats.accent);
  belly.scale.set(0.92, shape.h * 1.7, shape.w * 1.85);
  belly.position.y = -shape.h * 0.18;
  g.add(belly);

  const tailGeo = sharedGeo("tail", () => new THREE.ConeGeometry(0.5, 1, 4));
  const tail = new THREE.Mesh(tailGeo, mats.fin);
  tail.rotation.z = Math.PI / 2;
  tail.scale.set(shape.h * 0.85, 0.3, 0.045);
  tail.position.x = -0.58;
  g.add(tail);

  const finGeo = sharedGeo("fin", () => new THREE.ConeGeometry(0.5, 1, 3));
  const dorsal = new THREE.Mesh(finGeo, mats.fin);
  const dorsalH = look.tallDorsal ? 0.46 : 0.22;
  dorsal.scale.set(0.34, dorsalH, 0.03);
  dorsal.position.set(0.02, shape.h + dorsalH * 0.32, 0);
  dorsal.rotation.z = -0.25;
  g.add(dorsal);

  for (const side of [-1, 1]) {
    const pec = new THREE.Mesh(finGeo, mats.fin);
    pec.scale.set(0.16, 0.2, 0.025);
    pec.position.set(0.18, -shape.h * 0.35, side * shape.w * 0.9);
    pec.rotation.set(side * 0.7, 0, 2.4);
    g.add(pec);
  }

  const eyeGeo = sharedGeo("eye", () => new THREE.SphereGeometry(0.035, 8, 8));
  const pupilGeo = sharedGeo("pupil", () => new THREE.SphereGeometry(0.018, 6, 6));
  const eyeMat = sharedMat("eyeWhite", 0xe8f0f4);
  const pupilMat = sharedMat("pupil", 0x0a0e12);
  const eyeY = look.shape === "flat" ? shape.h + 0.02 : shape.h * 0.25;
  const eyeZ = look.shape === "flat" ? 0.06 : shape.w * 0.92;
  for (const side of look.shape === "flat" ? [1] : [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.3, eyeY, side * eyeZ);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0.325, eyeY, side * (eyeZ + 0.012));
    if (look.shape === "flat") {
      eye.position.z = side * 0.05;
      pupil.position.z = side * 0.05;
      pupil.position.y = eyeY + 0.014;
    }
    g.add(eye, pupil);
  }

  if (look.whiskers) {
    const whiskGeo = sharedGeo("whisker", () => new THREE.CylinderGeometry(0.006, 0.002, 0.3, 4));
    for (const side of [-1, 1]) {
      for (const tilt of [0.5, 1.1]) {
        const w = new THREE.Mesh(whiskGeo, mats.fin);
        w.position.set(0.46, -shape.h * 0.2, side * shape.w * 0.5);
        w.rotation.set(side * tilt, 0, -1.85);
        g.add(w);
      }
    }
  }

  if (look.shape === "billed") {
    const billGeo = sharedGeo("bill", () => new THREE.ConeGeometry(0.035, 0.45, 7));
    const bill = new THREE.Mesh(billGeo, mats.fin);
    bill.rotation.z = -Math.PI / 2;
    bill.position.x = 0.68;
    g.add(bill);
  }

  if (look.shape === "long") {
    // stretch the whole silhouette into an eel/sturgeon profile
    g.scale.x = 1.45;
  }

  const meters = clamp(sizeCm / 100, 0.16, 3.6);
  const wrapper = new THREE.Group();
  wrapper.add(g);
  wrapper.scale.setScalar(meters);
  wrapper.userData.speciesId = species.id;
  return wrapper;
}

const basicMats = new Map();
function sharedMat(key, color) {
  if (!basicMats.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    m.userData.shared = true;
    basicMats.set(key, m);
  }
  return basicMats.get(key);
}
