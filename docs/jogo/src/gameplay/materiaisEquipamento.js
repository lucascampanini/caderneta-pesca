// Materiais "de verdade" da vara e do molinete: cortiça, EVA, metal escovado, blank de carbono
// com verniz (clearcoat), bambu com fibra (textura CC0 da Poly Haven), anel cerâmico dos passadores
// e a linha enrolada no carretel. Texturas procedurais em canvas são geradas uma vez só e
// compartilhadas (userData.shared = true: quem troca a vara não deve descartá-las).

import * as THREE from "three";

const cacheTex = new Map();
const cacheMat = new Map();

// pseudo-aleatório com semente: a mesma textura sai igual em toda partida
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function texDe(c, { cor = true, rx = 1, ry = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.shared = true;
  return t;
}

function tex(chave, gerar) {
  if (!cacheTex.has(chave)) cacheTex.set(chave, gerar());
  return cacheTex.get(chave);
}

function marca(m) {
  m.userData.shared = true;
  return m;
}

function material(chave, gerar) {
  if (!cacheMat.has(chave)) {
    const m = marca(gerar());
    // reflexo do céu e da água: sem isso metal e verniz ficam pretos
    if (!m.envMap) m.envMap = envEquipamento();
    m.envMapIntensity = intensidadeAmbiente;
    cacheMat.set(chave, m);
  }
  return cacheMat.get(chave);
}

// ---------- ambiente refletido ----------

let envTex = null;
let intensidadeAmbiente = 1;

/** Panorama equirretangular simples (céu, horizonte claro, água esverdeada) para os reflexos. */
function envEquipamento() {
  if (envTex) return envTex;
  const [c, g] = canvas(256, 128);
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#5f8fcf");
  grad.addColorStop(0.42, "#b9d2ea");
  grad.addColorStop(0.5, "#eef3f2");
  grad.addColorStop(0.53, "#7d9488");
  grad.addColorStop(0.75, "#3e5548");
  grad.addColorStop(1, "#1f2a24");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  // nuvens e o sol
  const r = rng(5);
  for (let i = 0; i < 14; i++) {
    const x = r() * 256, y = 18 + r() * 34, w = 14 + r() * 30;
    const rad = g.createRadialGradient(x, y, 1, x, y, w);
    rad.addColorStop(0, "rgba(255,255,255,0.75)");
    rad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rad;
    g.fillRect(x - w, y - w, w * 2, w * 2);
  }
  const sol = g.createRadialGradient(70, 26, 0, 70, 26, 12);
  sol.addColorStop(0, "rgba(255,250,235,1)");
  sol.addColorStop(1, "rgba(255,250,235,0)");
  g.fillStyle = sol;
  g.fillRect(50, 6, 40, 40);
  // faixa de mata no horizonte
  g.fillStyle = "rgba(48,70,44,0.85)";
  for (let x = 0; x < 256; x += 2) g.fillRect(x, 60 - r() * 4, 2, 5 + r() * 3);
  envTex = new THREE.CanvasTexture(c);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.userData.shared = true;
  return envTex;
}

/**
 * Acompanha a luz do dia: de noite o reflexo escurece. Se a cena ganhar um environment
 * de verdade (céu), os materiais passam a usar o dela.
 */
export function ajustarAmbienteEquipamento(intensidade, envCena = null) {
  intensidadeAmbiente = intensidade;
  for (const m of cacheMat.values()) {
    const env = envCena ? null : envEquipamento();
    if (m.envMap !== env) {
      m.envMap = env;
      m.needsUpdate = true;
    }
    m.envMapIntensity = intensidade;
  }
}

// ---------- texturas procedurais ----------

/** Cortiça: grânulos claros e escuros, poros fundos e as emendas dos anéis de cortiça. */
function texCortica() {
  return tex("cortica", () => {
    const [c, g] = canvas(256, 512);
    const [b, gb] = canvas(256, 512); // relevo (bump)
    const r = rng(7);
    g.fillStyle = "#b78a58";
    g.fillRect(0, 0, 256, 512);
    gb.fillStyle = "#808080";
    gb.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 9000; i++) {
      const x = r() * 256, y = r() * 512, s = 0.6 + r() * 2.2;
      const l = r();
      g.fillStyle = l < 0.5 ? `rgba(120,80,44,${0.25 + r() * 0.35})` : `rgba(222,186,140,${0.2 + r() * 0.3})`;
      g.fillRect(x, y, s, s * (0.6 + r()));
      gb.fillStyle = l < 0.5 ? "rgba(40,40,40,0.35)" : "rgba(200,200,200,0.3)";
      gb.fillRect(x, y, s, s);
    }
    // poros (lenticelas): manchinhas escuras alongadas no sentido da vara
    for (let i = 0; i < 260; i++) {
      const x = r() * 256, y = r() * 512, w = 1.5 + r() * 4, h = 2 + r() * 7;
      g.fillStyle = `rgba(70,42,20,${0.45 + r() * 0.4})`;
      g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
      gb.fillStyle = "rgba(0,0,0,0.85)";
      gb.beginPath(); gb.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); gb.fill();
    }
    // emendas entre os anéis
    for (let y = 0; y < 512; y += 32 + Math.floor(r() * 6)) {
      g.fillStyle = "rgba(90,60,32,0.55)";
      g.fillRect(0, y, 256, 1.5);
      gb.fillStyle = "rgba(30,30,30,0.8)";
      gb.fillRect(0, y, 256, 1.5);
    }
    return { map: texDe(c), bump: texDe(b, { cor: false }) };
  });
}

/** EVA: espuma preta fosca com poros finos. */
function texEva() {
  return tex("eva", () => {
    const [b, gb] = canvas(256, 256);
    const r = rng(11);
    gb.fillStyle = "#808080";
    gb.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 7000; i++) {
      const v = Math.floor(r() * 255);
      gb.fillStyle = `rgba(${v},${v},${v},0.25)`;
      gb.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    return texDe(b, { cor: false, rx: 2, ry: 2 });
  });
}

/** Metal escovado: riscos finos num sentido só (vai em roughnessMap). */
function texEscovado() {
  return tex("escovado", () => {
    const [c, g] = canvas(256, 256);
    const r = rng(23);
    g.fillStyle = "#6a6a6a";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      const y = r() * 256, v = 70 + Math.floor(r() * 120);
      g.fillStyle = `rgba(${v},${v},${v},${0.18 + r() * 0.3})`;
      g.fillRect(0, y, 256, 0.6 + r() * 1.1);
    }
    return texDe(c, { cor: false });
  });
}

/** Blank de carbono: enrolamento das mantas em hélice, bem sutil, sob o verniz. */
function texCarbono() {
  return tex("carbono", () => {
    const [c, g] = canvas(128, 512);
    const r = rng(31);
    g.fillStyle = "#e9e9e9";
    g.fillRect(0, 0, 128, 512);
    g.save();
    g.transform(1, -0.35, 0, 1, 0, 0);
    for (let y = -100; y < 620; y += 3) {
      const v = 205 + Math.floor(r() * 50);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, 128, 1.4);
    }
    g.restore();
    return texDe(c, { rx: 1, ry: 6 });
  });
}

/** Linha enrolada no carretel: voltas cruzadas (o vaivém do molinete) na cor da linha. */
function texLinhaCarretel(cor, multi) {
  const chave = `carretel-${cor.toString(16)}-${multi}`;
  return tex(chave, () => {
    const [c, g] = canvas(256, 128);
    const r = rng(41);
    const base = new THREE.Color(cor);
    const css = (k, a = 1) => `rgba(${Math.round(base.r * 255 * k)},${Math.round(base.g * 255 * k)},${Math.round(base.b * 255 * k)},${a})`;
    g.fillStyle = css(0.7);
    g.fillRect(0, 0, 256, 128);
    // voltas: listras quase horizontais (a linha dá a volta no carretel), cruzando em leve diagonal
    for (const inc of [0.06, -0.06]) {
      g.save();
      g.transform(1, inc, 0, 1, 0, 0);
      for (let y = -30; y < 160; y += multi ? 2.2 : 2.6) {
        g.fillStyle = css(0.85 + r() * 0.3, 0.6);
        g.fillRect(0, y, 256, multi ? 1.2 : 1.0);
        g.fillStyle = css(0.45, 0.35);
        g.fillRect(0, y + 1.2, 256, 0.6);
      }
      g.restore();
    }
    return texDe(c, { rx: 2, ry: 1 });
  });
}

// ---------- bambu: textura CC0 (Poly Haven, bamboo_veneer) com reserva procedural ----------

const ASSETS = new URL("../../assets/equipamento/", import.meta.url);

/** Carrega uma imagem para dentro de um canvas já em uso: até chegar, vale o desenho procedural. */
function texArquivo(chave, arquivo, desenhoReserva, cor = true) {
  return tex(chave, () => {
    // o canvas já nasce do tamanho da imagem (512): a textura não pode mudar de tamanho depois de enviada
    const [c, g] = canvas(512, 512);
    g.save();
    g.scale(2, 2);
    desenhoReserva(g);
    g.restore();
    const t = texDe(c, { cor, ry: 1 });
    const img = new Image();
    img.onload = () => {
      g.drawImage(img, 0, 0, 512, 512);
      t.needsUpdate = true;
    };
    img.src = new URL(arquivo, ASSETS).href;
    return t;
  });
}

function fibraReserva(g) {
  const r = rng(53);
  g.fillStyle = "#c9a464";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    const x = r() * 256, v = r();
    g.fillStyle = v < 0.5 ? "rgba(150,110,50,0.35)" : "rgba(235,205,140,0.3)";
    g.fillRect(x, 0, 0.6 + r() * 1.4, 256);
  }
}

// ---------- materiais ----------

/** Blank de carbono envernizado, na cor da vara. */
export function matBlank(cor) {
  return material(`blank-${cor.toString(16)}`, () => new THREE.MeshPhysicalMaterial({
    color: cor,
    map: texCarbono(),
    roughness: 0.42,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    anisotropy: 0.5,
    anisotropyRotation: Math.PI / 2,
  }));
}

/** Bambu do caniço: fibra longitudinal, cera fosca. */
export function matBambu() {
  return material("bambu", () => new THREE.MeshPhysicalMaterial({
    color: 0xe0c48a,
    map: texArquivo("bambu-cor", "bambu_cor.webp", fibraReserva),
    roughnessMap: texArquivo("bambu-rug", "bambu_rugosidade.webp", (g) => { g.fillStyle = "#909090"; g.fillRect(0, 0, 256, 256); }, false),
    normalMap: texArquivo("bambu-nor", "bambu_normal.webp", (g) => { g.fillStyle = "#8080ff"; g.fillRect(0, 0, 256, 256); }, false),
    roughness: 0.75,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
  }));
}

export function matNoBambu() {
  return material("noBambu", () => new THREE.MeshPhysicalMaterial({
    color: 0x9c7a44,
    map: texArquivo("bambu-cor", "bambu_cor.webp", fibraReserva),
    roughness: 0.7,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  }));
}

export function matCortica() {
  return material("cortica", () => {
    const t = texCortica();
    return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: 0.88, metalness: 0 });
  });
}

export function matEva(cor = 0x1d1d1d) {
  return material(`eva-${cor.toString(16)}`, () => new THREE.MeshStandardMaterial({ color: cor, bumpMap: texEva(), bumpScale: 0.6, roughness: 0.93, metalness: 0 }));
}

/** Metal escovado com reflexo alongado (anisotropia). */
export function matEscovado(cor = 0xb9bec5, rug = 0.32) {
  return material(`escovado-${cor.toString(16)}-${rug}`, () => new THREE.MeshPhysicalMaterial({
    color: cor,
    metalness: 1,
    roughness: rug,
    roughnessMap: texEscovado(),
    anisotropy: 0.35,
  }));
}

/** Cromado polido (alça do pick-up, armação dos passadores). */
export function matCromo(cor = 0xd4d8de) {
  return material(`cromo-${cor.toString(16)}`, () => new THREE.MeshStandardMaterial({ color: cor, metalness: 1, roughness: 0.12 }));
}

/** Pintura metálica com verniz (corpo do molinete/carretilha). */
export function matPintura(cor, rug = 0.38) {
  return material(`pintura-${cor.toString(16)}-${rug}`, () => new THREE.MeshPhysicalMaterial({
    color: cor,
    metalness: 0.6,
    roughness: rug,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  }));
}

/** Anel cerâmico dos passadores (óxido de alumínio / SiC): cinza-escuro vítreo. */
export function matCeramica() {
  return material("ceramica", () => new THREE.MeshPhysicalMaterial({ color: 0x3b4048, metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }));
}

/** Linha de amarração dos passadores: fio colorido envernizado. */
export function matAmarracao(cor) {
  return material(`amarra-${cor.toString(16)}`, () => new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }));
}

export function matBorracha(cor = 0x141518) {
  return material(`borracha-${cor.toString(16)}`, () => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.75, metalness: 0 }));
}

/** Linha enrolada no carretel (mono translúcida ou multi colorida). */
export function matLinhaCarretel(cor, multi) {
  return material(`linhaCarretel-${cor.toString(16)}-${multi}`, () => new THREE.MeshPhysicalMaterial({
    map: texLinhaCarretel(cor, multi),
    roughness: multi ? 0.7 : 0.25,
    metalness: 0,
    clearcoat: multi ? 0 : 0.8,
    clearcoatRoughness: 0.2,
    sheen: multi ? 0.6 : 0,
    sheenColor: new THREE.Color(cor),
  }));
}
