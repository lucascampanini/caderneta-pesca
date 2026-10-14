// Impostores de vegetação: cada planta é um cartão que gira em torno do eixo vertical para olhar a câmera
// e mostra o quadro do atlas renderizado (no Blender, com Cycles) do ângulo mais próximo do ponto de vista.
// Os quadros vizinhos se misturam suavemente, a luz vem de um mapa de normais por quadro e o material é
// um MeshStandardMaterial de verdade (sol, céu, scene.environment, neblina e sombra recebida funcionam).
// Uma espécie inteira de um pesqueiro é UMA draw call (InstancedBufferGeometry).

import * as THREE from "three";

const BASE = new URL("../../assets/vegetacao/", import.meta.url);

/** Atlas de todas as espécies: quadros por ângulo, variantes por linha, medidas e base de cada uma. */
export const ATLAS = await fetch(new URL("vegetacao.json", BASE))
  .then((r) => r.json())
  .catch((e) => {
    console.warn("vegetação: atlas não carregou", e);
    return { especies: {} };
  });

// tempo e vento compartilhados por todos os materiais de impostor
const tempo = { value: 0 };
const vento = { value: 1 };
const relogio = new THREE.Clock();

/** Força do vento no balanço das plantas (0 = parado, 1 = brisa, 2+ = ventania). */
export function setVento(v) {
  vento.value = v;
}

const loader = new THREE.TextureLoader();
const cacheMat = new Map();

function textura(arquivo, srgb) {
  const t = loader.load(new URL(arquivo, BASE).href);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.userData.shared = true;
  return t;
}

const MAX_VAR = 8;

/** Material de uma espécie (compartilhado entre pesqueiros, não é descartado na troca de cenário). */
function materialDa(id) {
  if (cacheMat.has(id)) return cacheMat.get(id);
  const e = ATLAS.especies[id];
  if (!e) throw new Error(`vegetação: espécie desconhecida "${id}"`);
  const [W, H] = e.atlas_px;
  const fh = e.variantes[0].px[1];
  const larguraQuadro = new Array(MAX_VAR).fill(0);
  e.variantes.forEach((v, i) => (larguraQuadro[i] = v.px[0] / W));
  const mat = new THREE.MeshStandardMaterial({
    map: textura(e.arquivo, true),
    roughness: e.aspereza ?? 0.85,
    metalness: 0,
    alphaTest: 0.5,
    alphaToCoverage: true,
    side: THREE.FrontSide,
    envMapIntensity: e.ambiente ?? 0.8,
  });
  const uniforms = {
    uNormal: { value: textura(e.normal, false) },
    uCols: { value: e.angulos },
    uFrameW: { value: larguraQuadro },
    uFrameH: { value: fh / H },
    uEsfera: { value: e.esfera ?? 0.45 },
    uBalanco: { value: e.balanco ?? 0.02 },
    uTransluz: { value: e.transluz ?? 0.25 },
    uTempo: tempo,
    uVento: vento,
  };
  mat.userData.shared = true;
  mat.userData.uniforms = uniforms;
  mat.customProgramCacheKey = () => "impostor-v1";
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute vec3 iPos;   // base da planta no mundo
        attribute vec4 iDim;   // largura (m), altura (m), base (0..1 de baixo), variante
        attribute vec4 iVar;   // rumo (rad), semente, brilho, reservado
        attribute vec3 iCor;   // tom multiplicativo
        uniform float uCols;
        uniform float uFrameW[${MAX_VAR}];
        uniform float uFrameH;
        uniform float uTempo;
        uniform float uVento;
        uniform float uBalanco;
        varying vec2 vUvA;
        varying vec2 vUvB;
        varying vec2 vUvQ;
        varying float vMistura;
        varying vec3 vTom;
        varying vec3 vDirV;
        varying vec3 vCimaV;
        varying vec3 vFrenteV;`
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        vec3 paraCam = cameraPosition - iPos;
        paraCam.y = 0.0;
        float dCam = length(paraCam);
        vec3 frente = dCam > 1e-4 ? paraCam / dCam : vec3(0.0, 0.0, 1.0);
        vec3 direita = vec3(frente.z, 0.0, -frente.x);
        // direção da câmera no espaço da planta (desfaz o rumo sorteado) -> quadro do atlas
        float cr = cos(iVar.x), sr = sin(iVar.x);
        vec2 loc = vec2(frente.x * cr - frente.z * sr, frente.x * sr + frente.z * cr);
        float ang = atan(-loc.x, loc.y);
        float f = mod(ang / 6.2831853 * uCols + uCols, uCols);
        float fA = floor(f);
        vMistura = f - fA;
        float fB = mod(fA + 1.0, uCols);
        int vi = int(iDim.w + 0.5);
        float fw = uFrameW[0];
        for (int k = 1; k < ${MAX_VAR}; k++) if (k == vi) fw = uFrameW[k];
        vec2 q = vec2(position.x + 0.5, position.y);
        vUvQ = q;
        float v0 = iDim.w * uFrameH;
        vUvA = vec2((fA + q.x) * fw, v0 + q.y * uFrameH);
        vUvB = vec2((fB + q.x) * fw, v0 + q.y * uFrameH);
        vTom = iCor * iVar.z;
        vec3 objectNormal = frente;
        vDirV = normalize((viewMatrix * vec4(direita, 0.0)).xyz);
        vCimaV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vFrenteV = normalize((viewMatrix * vec4(frente, 0.0)).xyz);
        #ifdef USE_TANGENT
          vec3 objectTangent = direita;
        #endif`
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        float hy = q.y * q.y;
        float fase = uTempo * (1.1 + iVar.y * 0.6) + iVar.y * 6.2831853 + iPos.x * 0.07 + iPos.z * 0.05;
        vec2 balanco = vec2(sin(fase) + 0.4 * sin(fase * 2.3 + 1.0), cos(fase * 0.8) * 0.6) * uBalanco * uVento * iDim.y * hy;
        vec3 transformed = iPos + direita * (position.x * iDim.x) + vec3(0.0, (position.y - iDim.z) * iDim.y, 0.0);
        transformed.xz += balanco;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform sampler2D uNormal;
        uniform float uEsfera;
        uniform float uTransluz;
        varying vec2 vUvA;
        varying vec2 vUvB;
        varying vec2 vUvQ;
        varying float vMistura;
        varying vec3 vTom;
        varying vec3 vDirV;
        varying vec3 vCimaV;
        varying vec3 vFrenteV;`
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec4 corA = texture2D(map, vUvA);
        vec4 corB = texture2D(map, vUvB);
        vec4 corQ = mix(corA, corB, vMistura);
        diffuseColor *= corQ;
        diffuseColor.rgb *= vTom;`
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `
        vec3 nA = texture2D(uNormal, vUvA).xyz * 2.0 - 1.0;
        vec3 nB = texture2D(uNormal, vUvB).xyz * 2.0 - 1.0;
        vec3 nq = normalize(mix(nA, nB, vMistura));
        // normal de "volume": a copa inteira se comporta como um domo, o que suaviza o ruído das folhas
        vec3 ne = normalize(vec3((vUvQ.x - 0.5) * 1.6, (vUvQ.y - 0.45) * 1.2, 0.9));
        nq = normalize(mix(nq, ne, uEsfera));
        normal = normalize(vDirV * nq.x + vCimaV * nq.y + vFrenteV * nq.z);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        // luz atravessando a folha quando o sol está atrás da planta (contraluz)
        #if NUM_DIR_LIGHTS > 0
          float contraluz = pow(clamp(dot(normalize(-vViewPosition), -directionalLights[0].direction), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * directionalLights[0].color * contraluz * uTransluz * 0.35;
        #endif`
      );
  };
  cacheMat.set(id, mat);
  return mat;
}

/**
 * Junta instâncias de uma espécie e gera a malha.
 * Uso: const c = new CampoImpostores("arvore_a"); c.add(x, y, z, { altura: 12 }); grupo.add(c.build());
 */
export class CampoImpostores {
  constructor(id) {
    this.id = id;
    this.e = ATLAS.especies[id];
    this.itens = [];
  }

  get existe() {
    return !!this.e;
  }

  /**
   * @param {number} x, y, z  base da planta (o chão; y negativo afunda, ex. aguapé na água)
   * @param {object} o  altura (m) ou escala, variante, rumo (rad), brilho, cor [r,g,b], afundar (fração da altura)
   */
  add(x, y, z, o = {}) {
    if (!this.e) return;
    const nv = this.e.variantes.length;
    const v = o.variante ?? Math.floor(Math.random() * nv);
    const meta = this.e.variantes[Math.min(v, nv - 1)];
    const esc = o.altura ? o.altura / meta.altura : o.escala ?? 1;
    const h = meta.altura * esc;
    this.itens.push({
      x, y: y - (o.afundar ?? 0) * h, z, v: Math.min(v, nv - 1),
      w: meta.largura * esc * (o.largura ?? 1), h: meta.altura * esc, base: meta.base,
      rumo: o.rumo ?? Math.random() * Math.PI * 2,
      semente: Math.random(),
      brilho: o.brilho ?? 1,
      cor: o.cor ?? [1, 1, 1],
    });
  }

  get count() {
    return this.itens.length;
  }

  build() {
    const n = this.itens.length;
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1, 1, 3);
    quad.translate(0, 0.5, 0);
    geo.index = quad.index;
    geo.setAttribute("position", quad.getAttribute("position"));
    geo.setAttribute("normal", quad.getAttribute("normal"));
    geo.setAttribute("uv", quad.getAttribute("uv"));
    const pos = new Float32Array(n * 3), dim = new Float32Array(n * 4), vr = new Float32Array(n * 4), cor = new Float32Array(n * 3);
    const caixa = new THREE.Box3();
    const p = new THREE.Vector3();
    this.itens.forEach((it, i) => {
      pos.set([it.x, it.y, it.z], i * 3);
      dim.set([it.w, it.h, it.base, it.v], i * 4);
      vr.set([it.rumo, it.semente, it.brilho, 0], i * 4);
      cor.set(it.cor, i * 3);
      caixa.expandByPoint(p.set(it.x - it.w, it.y - it.h * it.base, it.z - it.w));
      caixa.expandByPoint(p.set(it.x + it.w, it.y + it.h, it.z + it.w));
    });
    geo.setAttribute("iPos", new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute("iDim", new THREE.InstancedBufferAttribute(dim, 4));
    geo.setAttribute("iVar", new THREE.InstancedBufferAttribute(vr, 4));
    geo.setAttribute("iCor", new THREE.InstancedBufferAttribute(cor, 3));
    geo.instanceCount = n;
    geo.boundingBox = caixa;
    geo.boundingSphere = n ? caixa.getBoundingSphere(new THREE.Sphere()) : new THREE.Sphere(new THREE.Vector3(), 1);
    quad.dispose();
    const mesh = new THREE.Mesh(geo, materialDa(this.id));
    mesh.name = `impostor_${this.id}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.onBeforeRender = () => {
      tempo.value = relogio.getElapsedTime();
    };
    return mesh;
  }
}

/** Atalho: espalha N plantas de uma espécie com uma função que devolve [x, y, z, opções] ou null. */
export function campo(id, n, gerar) {
  const c = new CampoImpostores(id);
  for (let i = 0; i < n; i++) {
    const r = gerar(i);
    if (r) c.add(r[0], r[1], r[2], r[3]);
  }
  return c.build();
}
