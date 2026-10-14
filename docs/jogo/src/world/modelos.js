// Modelos 3D reais (Poly Haven, CC0) para os objetos que ficam perto da câmera: trapiche, galhada
// caída na água, pedras do rio e os badulaques do pescador. Os .glb ficam em assets/modelos/ (já
// reduzidos e com Draco). Tudo é assíncrono: as funções devolvem na hora um THREE.Group vazio, já
// posicionado dentro do grupo do pesqueiro, e o modelo aparece nele quando termina de carregar.
// Cada arquivo é baixado uma vez só (cache) e as cópias dividem geometria, material e textura.
// Créditos em assets/modelos/CREDITOS.md.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { S } from "../state/gameState.js";

const BASE = new URL("../../assets/modelos/", import.meta.url).href;
const PASSO_TRAPICHE = 2.92; // comprimento de uma seção do trapiche modular (m)

let loader = null;
const cache = new Map(); // nome do arquivo -> Promise<THREE.Group>

function pegarLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/");
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

const qualidadeAlta = () => (S.settings?.quality ?? "high") !== "low";

/** Carrega (uma vez) um .glb de assets/modelos/. Devolve a cena original, que não deve ir para a tela. */
export function carregarModelo(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const p = new Promise((resolve, reject) => {
    pegarLoader().load(
      BASE + nome + ".glb",
      (gltf) => {
        const raiz = gltf.scene;
        raiz.traverse((o) => {
          if (!o.isMesh) return;
          // compartilhados entre todas as cópias: disposeObject3D() do cenário não pode liberá-los
          o.geometry.userData.shared = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            m.userData.shared = true;
            for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) {
              if (m[k]) {
                m[k].userData.shared = true;
                m[k].anisotropy = 8;
              }
            }
            if (m.name.includes("glass")) {
              m.transparent = true;
              m.opacity = 0.45;
              m.depthWrite = false;
            }
          }
        });
        resolve(raiz);
      },
      undefined,
      (err) => {
        console.warn("modelos: falha ao carregar", nome, err);
        cache.delete(nome);
        reject(err);
      }
    );
  });
  cache.set(nome, p);
  return p;
}

/** Pede vários modelos de uma vez (ex.: ao abrir o mapa), sem esperar. */
export function preCarregarModelos(nomes = ["trapiche", "tronco_grosso", "tronco_fino", "pedra_grande", "pedras_musgo", "pedra_rio_a", "pedra_rio_b", "banquinho", "balde", "lampiao", "chapeu"]) {
  for (const n of nomes) carregarModelo(n).catch(() => {});
}

// cópia leve de um nó do modelo (mesma geometria/material) com sombra conforme a qualidade
function copiar(no, { sombra = true, recebe = true } = {}) {
  const c = no.clone(true);
  const alta = qualidadeAlta();
  c.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = sombra && alta;
      o.receiveShadow = recebe;
    }
  });
  return c;
}

function noPorNome(raiz, nome) {
  let achado = null;
  raiz.traverse((o) => {
    if (!achado && o.name === nome) achado = o;
  });
  return achado;
}

// grupo vazio já no lugar; o conteúdo chega quando o arquivo carregar
function reservar(group, nome, x = 0, y = 0, z = 0, giro = 0) {
  const g = new THREE.Group();
  g.name = nome;
  g.position.set(x, y, z);
  g.rotation.y = giro;
  group.add(g);
  return g;
}

// pseudo-aleatório estável por posição: o mesmo pesqueiro fica sempre igual
function sorteio(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// ---------- trapiche ----------

/**
 * Trapiche de madeira de verdade, montado com as seções do modelo modular.
 * Vai de `inicioZ` (na margem) até `inicioZ - comprimento` (ponta, sobre a água), com o topo das
 * tábuas em `alturaDeck`. A ponta tem os moirões altos; a rampa fica do lado da margem.
 * Os pilares descem até o leito. Use no lugar de `makeDock` com os mesmos números.
 */
export function colocarTrapiche(group, { comprimento = 13, largura = 2.4, alturaDeck = 0.62, inicioZ = 9, x = 0 } = {}) {
  const alvo = reservar(group, "trapiche", x, alturaDeck, inicioZ - comprimento, Math.PI);
  carregarModelo("trapiche").then((raiz) => {
    const n = Math.max(2, Math.round(comprimento / PASSO_TRAPICHE));
    const corrente = new THREE.Group();
    // escala para bater o comprimento pedido e a largura (o modelo tem ~2,5 m de largura)
    corrente.scale.set(largura / 2.5, 1, comprimento / (n * PASSO_TRAPICHE));
    for (let i = 0; i < n; i++) {
      const nome = i === 0 ? "section_01" : i === n - 1 ? "section_04" : i % 2 ? "section_02" : "section_03";
      const no = noPorNome(raiz, nome);
      if (!no) continue;
      const s = copiar(no);
      s.position.set(0, 0, -i * PASSO_TRAPICHE);
      corrente.add(s);
    }
    alvo.add(corrente);
  }).catch(() => {});
  return alvo;
}

/** Estacas soltas de madeira fincadas na água (as três do conjunto do trapiche). */
export function colocarEstacas(group, x, z, giro = 0, escala = 1) {
  const alvo = reservar(group, "estacas", x, 0, z, giro);
  carregarModelo("trapiche").then((raiz) => {
    const no = noPorNome(raiz, "poles");
    if (!no) return;
    const c = copiar(no);
    // a origem fica a 2,65 m do pé; levanta para as pontas saírem ~0,6 m da água
    c.position.y = -1.4 * escala;
    c.scale.setScalar(escala);
    alvo.add(c);
  }).catch(() => {});
  return alvo;
}

// ---------- galhada ----------

/**
 * Tronco morto caído, meio afundado: abrigo de peixe. `tipo` "grosso" (4 m, padrão) ou "fino" (3 m);
 * `escala` multiplica o tamanho; `inclina` levanta uma das pontas para fora d'água (radianos).
 */
export function colocarGalhada(group, x, z, giro = 0, { tipo = "grosso", escala = 1, inclina = 0.12, afunda = 0.45 } = {}) {
  const alvo = reservar(group, "galhada", x, 0, z, giro);
  carregarModelo(tipo === "fino" ? "tronco_fino" : "tronco_grosso").then((raiz) => {
    const c = copiar(raiz);
    const caixa = new THREE.Box3().setFromObject(c);
    const alto = caixa.max.y - caixa.min.y;
    c.scale.setScalar(escala);
    c.rotation.z = inclina;
    c.position.y = -alto * escala * afunda;
    alvo.add(c);
  }).catch(() => {});
  return alvo;
}

// ---------- pedras ----------

const PEDRAS = {
  grande: { arquivo: "pedra_grande" },
  musgo: { arquivo: "pedras_musgo", filhos: ["rock01", "rock02", "rock03", "rock04", "rock05", "rock06"] },
  rio_a: { arquivo: "pedra_rio_a" },
  rio_b: { arquivo: "pedra_rio_b" },
};

/**
 * Pedra real. `escala` é o diâmetro aproximado em metros. `tipo`: "grande" (matacão), "musgo"
 * (seis formatos com limo), "rio_a"/"rio_b" (seixos lisos de rio) ou "auto" (sorteia pela posição).
 * `afunda` é quanto da altura fica dentro d'água (0 = apoiada na superfície).
 */
export function colocarPedra(group, x, z, escala = 1, { tipo = "auto", giro = null, afunda = 0.4, y = 0 } = {}) {
  const r = sorteio(x, z);
  if (tipo === "auto") tipo = escala > 1.6 ? (r < 0.5 ? "grande" : "musgo") : escala > 0.6 ? "musgo" : ["musgo", "rio_a", "rio_b"][Math.floor(r * 3)];
  const def = PEDRAS[tipo] || PEDRAS.musgo;
  const alvo = reservar(group, "pedra", x, y, z, giro ?? r * Math.PI * 2);
  carregarModelo(def.arquivo).then((raiz) => {
    let no = raiz;
    if (def.filhos) no = noPorNome(raiz, def.filhos[Math.floor(sorteio(z, x, 3) * def.filhos.length)]) || raiz;
    const c = copiar(no, { sombra: escala > 0.35 });
    c.position.set(0, 0, 0);
    const caixa = new THREE.Box3().setFromObject(c);
    const tam = Math.max(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z) || 1;
    const k = escala / tam;
    c.scale.multiplyScalar(k);
    c.position.y = -(caixa.max.y - caixa.min.y) * k * afunda;
    alvo.add(c);
  }).catch(() => {});
  return alvo;
}

// ---------- badulaques do pescador ----------

const OBJETOS = ["banquinho", "balde", "lampiao", "chapeu"];

/** Coloca um objeto avulso ("banquinho", "balde", "lampiao", "chapeu") apoiado em (x, y, z). */
export function colocarObjeto(group, nome, { x = 0, y = 0, z = 0, giro = 0, escala = 1, sombra = true } = {}) {
  const alvo = reservar(group, nome, x, y, z, giro);
  if (!OBJETOS.includes(nome)) return alvo;
  carregarModelo(nome).then((raiz) => {
    const c = copiar(raiz, { sombra });
    c.scale.setScalar(escala);
    alvo.add(c);
  }).catch(() => {});
  return alvo;
}

/**
 * Banquinho dobrável com o chapéu em cima, balde e lampião no deck, ao redor de onde o pescador fica.
 * (x, y, z) é a posição do pescador (playerSpot) e `y` o topo do deck; `lado` 1 = à esquerda dele (−X), -1 = à direita.
 * Ficam do lado oposto ao da câmera (que fica à direita e atrás) para enfeitar a borda da tela sem tapar a água.
 * Em qualidade baixa só o banquinho e o balde.
 */
export function colocarObjetosTrapiche(group, { x = 0, y = 0.62, z = -2.6, lado = 1, giro = 0 } = {}) {
  const g = reservar(group, "objetos_trapiche", x, y, z, giro);
  const alta = qualidadeAlta();
  // o pescador olha para -Z; os objetos ficam ao lado e um pouco atrás para não tapar o arremesso
  const e = -lado; // X da esquerda do pescador
  colocarObjeto(g, "banquinho", { x: 0.95 * e, z: 1.3, giro: 0.4 });
  if (alta) colocarObjeto(g, "chapeu", { x: 0.95 * e, y: 0.445, z: 1.3, giro: 2.1 });
  colocarObjeto(g, "balde", { x: 0.7 * e, z: 1.7, giro: 1.2 });
  if (alta) colocarObjeto(g, "lampiao", { x: 0.85 * e, z: -0.6, giro: -0.6, sombra: false });
  return g;
}
