// Água do Pantanal: reflexo planar de verdade (Reflector do three), normal maps reais em várias
// camadas rolando com o vento, fresnel de Schlick, brilho do sol e cor de profundidade por pesqueiro.
//
// Onde o pesqueiro tem `fundo`, a superfície fica transparente (só o reflexo de fresnel) e um leito de
// verdade (seixos no rio de água clara, lodo na baía) é desenhado por baixo. A absorção da coluna d'água
// é feita no próprio leito, por canal de cor (a água limpa come o vermelho primeiro e fica verde-azulada),
// com cáusticas dançando no rio claro. Sem `fundo` (Rio Paraguai barrento, canal), o corpo d'água é opaco.
// A luz do corpo d'água vem das próprias luzes da cena (sol/lua e hemisfério), então acompanha o céu.
//
// Interface pública (usada por main.js e sky.js):
//   new WaterSurface(scene, quality) · setParams(loc.water) · setSun(dir, color) · update(dt)
//   setQuality(q) · setWind(0..1 | null) · water (o mesh da superfície)

import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { CONFIG } from "../data/config.js";

const BASE = new URL("../../assets/agua/", import.meta.url).href;
const loader = new THREE.TextureLoader();
const texCache = new Map();

function carregarTextura(nome, { cor = false } = {}) {
  if (texCache.has(nome)) return texCache.get(nome);
  const tex = loader.load(BASE + nome);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.userData.shared = true;
  texCache.set(nome, tex);
  return tex;
}

// Valores padrão de cada campo de `loc.water`. Os pesqueiros podem sobrescrever qualquer um.
const PADRAO = {
  color: 0x1f5f53, // cor da água funda (o que se vê quando a coluna d'água é espessa)
  corRasa: null, // cor da água rasa; define que cor a água "come" primeiro (null = derivada de `color`)
  distortion: 1.7, // quanto as ondas entortam o reflexo
  size: 3.2, // escala das ondulações (maior = ondas maiores)
  timeScale: 0.6, // velocidade da animação
  vento: 0.35, // 0 calmaria (espelho) .. 1 ventania (água picada)
  ventoDir: 0.6, // direção do vento em radianos (no plano XZ)
  turbidez: 1.6, // absorção por metro: 0,2 rio cristalino .. 3+ barrento
  sujeira: 0.25, // manchas de película/folhas boiando que deixam a água fosca
  fundo: null, // { textura: "seixos"|"lodo", raso, fundo, zMargem, rampa, caustica }
};

// Centro e raio do leito (fica à frente do pescador, que arremessa para -Z)
const LEITO_Z = -60;
const LEITO_TAM = 520;

// ---------- GLSL comum à superfície e ao leito ----------
const AGUA_COMUM = /* glsl */ `
uniform vec3 corFunda;
uniform vec3 corRasa;
uniform vec3 solDir;
uniform vec3 luzSol;
uniform vec3 luzCeu;
uniform float turbidez;
// luz que o corpo d'água espalha de volta (sol entrando pela superfície + céu)
vec3 luzAgua() {
  float sobe = clamp(solDir.y, 0.0, 1.0);
  return luzSol * (0.12 + 0.55 * sobe) * 0.5 + luzCeu * 0.5;
}
// absorção por metro em cada canal: base da turbidez + a parte "colorida" puxada de corRasa
vec3 sigmaAgua() {
  vec3 c = clamp(corRasa * 1.6, 0.04, 0.98);
  return vec3(turbidez * 0.6) - log(c) * 0.3;
}`;

// ---------- shaders da superfície ----------

const VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUvRefl;
varying vec3 vMundo;
#include <common>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
void main() {
  vUvRefl = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vMundo = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform vec3 color;
uniform float tempo;
uniform float distorcao;
uniform float escala;
uniform float vento;
uniform vec2 ventoDir;
uniform float sujeira;
uniform float temLeito;
varying vec4 vUvRefl;
varying vec3 vMundo;
#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
${AGUA_COMUM}

vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
vec2 amostra(vec2 uv) { return texture2D(tNormal, uv).rg * 2.0 - 1.0; }

void main() {
  #include <logdepthbuf_fragment>
  vec3 V = cameraPosition - vMundo;
  float dist = length(V);
  V /= dist;

  // ---- normais: quatro camadas do mesmo normal map, em escalas e direções diferentes ----
  vec2 p = vMundo.xz;
  vec2 vd = ventoDir;
  float t = tempo;
  float e = escala;
  vec2 s = vec2(0.0);
  s += amostra(p / (e * 9.0) + vd * t * 0.020) * 1.00;                      // marola grande, a favor do vento
  s += amostra(rot(p, 1.9) / (e * 5.3) - rot(vd, 0.7) * t * 0.028) * 0.80; // cruzada
  s += amostra(rot(p, -0.8) / (e * 2.1) + rot(vd, -0.4) * t * 0.045) * 0.55; // encrespado do vento
  s += amostra(rot(p, 2.6) / (e * 0.75) - vd * t * 0.07) * 0.32;           // detalhe fino de perto

  // película/pólen/folhas boiando: manchas grandes e lentas que acalmam a água
  float filme = texture2D(tNormal, p / 260.0 + vec2(t * 0.0015, 0.0)).b * 1.4 - texture2D(tNormal, p / 97.0).r * 0.6;
  filme = smoothstep(0.35, 0.75, filme) * sujeira;

  // de longe a água "assenta" (e evita cintilar): reduz a inclinação com a distância
  float forca = mix(0.07, 0.36, vento) * mix(1.0, 0.4, smoothstep(25.0, 420.0, dist)) * (1.0 - filme * 0.7);
  vec3 N = normalize(vec3(s.x * forca, 1.0, s.y * forca));

  // ---- reflexo planar distorcido pelas ondas ----
  vec2 uvR = vUvRefl.xy / vUvRefl.w;
  uvR += N.xz * distorcao * (0.0015 + 0.5 / (dist + 6.0));
  vec3 reflexo = texture2D(tDiffuse, uvR).rgb * color;

  // ---- fresnel (Schlick, F0 da água = 0,02) ----
  float cosV = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
  F *= 1.0 - filme * 0.3;

  // ---- corpo d'água (só onde não há leito desenhado por baixo, ou longe dele) ----
  vec3 luz = luzAgua();
  vec3 corpo = corFunda * luz;
  // luz do sol atravessando a crista das ondas contra o sol (subsurface barato)
  float contraSol = pow(clamp(dot(-V.xz, normalize(solDir.xz + 1e-4)) * 0.5 + 0.5, 0.0, 1.0), 3.0);
  corpo += corRasa * luzSol * contraSol * clamp(s.x * 0.6 + 0.4, 0.0, 1.0) * 0.05 * clamp(solDir.y * 3.0, 0.0, 1.0);
  corpo = mix(corpo, corpo * vec3(1.15, 1.0, 0.75) + luz * vec3(0.010, 0.009, 0.004), filme);
  float dLeito = length(vMundo.xz - vec2(0.0, ${LEITO_Z.toFixed(1)}));
  float a = mix(1.0, smoothstep(${(LEITO_TAM * 0.38).toFixed(1)}, ${(LEITO_TAM * 0.48).toFixed(1)}, dLeito), temLeito);

  // ---- brilho especular do sol/lua (lóbulo fino + espelhado largo) ----
  vec3 H = normalize(solDir + V);
  float nh = max(dot(N, H), 0.0);
  float brilho = pow(nh, 1400.0) * 6.0 + pow(nh, 160.0) * 0.35 + pow(nh, 24.0) * 0.025;
  vec3 especular = luzSol * brilho * smoothstep(-0.03, 0.05, solDir.y + 0.04) * (1.0 - filme * 0.8) * (0.5 + vento);

  // ---- composição: (leito atrás)·(1−F)·(1−a) + corpo·(1−F)·a + reflexo·F ----
  float alfa = 1.0 - (1.0 - F) * (1.0 - a);
  vec3 cor = (corpo * (1.0 - F) * a + reflexo * F + especular) / max(alfa, 0.001);
  gl_FragColor = vec4(cor, clamp(alfa + dot(especular, vec3(0.3)), 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// ---------- leito: cáusticas e absorção por canal ----------
const LEITO_PARS = /* glsl */ `
uniform float tempoC;
uniform float forcaC;
varying vec3 vMundoC;
${AGUA_COMUM}
float causticaAgua(vec2 q, float t) {
  vec2 pp = mod(q, 6.28318530718) - 250.0;
  vec2 i = pp;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = pp + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(pp.x / (sin(i.x + tt) / inten), pp.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}`;

const LEITO_LUZ = /* glsl */ `
#include <lights_fragment_end>
float profC = clamp(-vMundoC.y, 0.0, 8.0);
float cA = causticaAgua(vMundoC.xz * 0.85, tempoC * 0.6);
float cB = causticaAgua(vMundoC.xz * 0.85 + vec2(0.11, 0.05), tempoC * 0.6 + 0.4);
float caus = (cA + cB) * 0.5 * forcaC * smoothstep(0.05, 0.5, profC) * clamp(1.0 - profC / 6.0, 0.0, 1.0);
reflectedLight.directDiffuse *= 1.0 + caus * 2.5;`;

const LEITO_AGUA = /* glsl */ `
{
  // caminho do olho até o leito dentro d'água, pelo raio refratado
  vec3 Vb = normalize(cameraPosition - vMundoC);
  float sinI = sqrt(max(0.0, 1.0 - Vb.y * Vb.y));
  float cosT = sqrt(1.0 - (sinI / 1.333) * (sinI / 1.333));
  float caminho = max(0.0, -vMundoC.y) / max(cosT, 0.2);
  vec3 T = exp(-sigmaAgua() * caminho);
  gl_FragColor.rgb = gl_FragColor.rgb * T + corFunda * luzAgua() * (1.0 - T);
}
#include <tonemapping_fragment>`;

export class WaterSurface {
  constructor(scene, quality = "high") {
    this.scene = scene;
    this.quality = quality;
    this.params = { ...PADRAO };
    this.water = null;
    this.leito = null;
    this.tempo = 0;
    this._ventoExtra = null; // setWind() do clima sobrescreve o vento do pesqueiro
    this._sol = null; // luzes da cena, achadas no primeiro update()
    this._ceu = null;
    this._amb = null;
    this._tmp = new THREE.Color();
    this.normalTex = carregarTextura("waternormals.jpg");
    // uniforms compartilhados entre a superfície e o leito (sobrevivem a setQuality)
    this.u = {
      tNormal: { value: this.normalTex },
      tempo: { value: 0 },
      solDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
      luzSol: { value: new THREE.Color(2.5, 2.5, 2.5) },
      luzCeu: { value: new THREE.Color(0.6, 0.7, 0.8) },
      corFunda: { value: new THREE.Color() },
      corRasa: { value: new THREE.Color() },
      distorcao: { value: 1.7 },
      escala: { value: 3.2 },
      vento: { value: 0.35 },
      ventoDir: { value: new THREE.Vector2(1, 0) },
      turbidez: { value: 1.6 },
      sujeira: { value: 0.25 },
      temLeito: { value: 0 },
      tempoC: { value: 0 },
    };
    this._solCor = new THREE.Color(1, 1, 1);
    this.build();
  }

  build() {
    const cfg = CONFIG.quality[this.quality] || CONFIG.quality.high;
    const texSize = cfg.waterTex ?? 1024;
    const geometry = new THREE.PlaneGeometry(CONFIG.water.size, CONFIG.water.size);
    const shader = {
      name: "AguaPantanal",
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { tDiffuse: { value: null }, textureMatrix: { value: null }, color: { value: new THREE.Color(1, 1, 1) } },
      ]),
      vertexShader: VERT,
      fragmentShader: FRAG,
    };
    const water = new Reflector(geometry, {
      textureWidth: texSize,
      textureHeight: texSize,
      clipBias: 0.003,
      color: 0xffffff,
      multisample: this.quality === "low" ? 0 : 4,
      shader,
    });
    const m = water.material;
    Object.assign(m.uniforms, this.u); // mesmos objetos: mudar this.u muda a água e o leito
    m.fog = true;
    m.transparent = true;
    m.depthWrite = true;
    water.rotation.x = -Math.PI / 2;
    water.position.y = CONFIG.water.level;
    water.renderOrder = -1; // primeiro entre os transparentes: linha, espuma e partículas desenham por cima
    water.name = "agua";
    this.scene.add(water);
    this.water = water;
    this._aplicarUniforms();
    this._montarLeito();
  }

  // ---------- leito ----------

  _alturaLeito(z) {
    const f = this.params.fundo;
    // a rampa desce de zMargem (perto da margem) para -Z (rumo ao meio do rio)
    return THREE.MathUtils.lerp(f.fundo, f.raso, THREE.MathUtils.smoothstep(z, f.zMargem - f.rampa, f.zMargem));
  }

  _montarLeito() {
    if (this.leito) {
      this.scene.remove(this.leito);
      this.leito.geometry.dispose();
      this.leito.material.dispose();
      this.leito = null;
    }
    const f = this.params.fundo;
    if (!f) return;
    const seixos = f.textura === "seixos";
    const seg = this.quality === "low" ? 60 : 110;
    const geo = new THREE.PlaneGeometry(LEITO_TAM, LEITO_TAM, seg, seg);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, LEITO_Z);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const rep = seixos ? LEITO_TAM / 2.4 : LEITO_TAM / 5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const ondula = Math.sin(x * 0.13 + z * 0.05) * 0.18 + Math.sin(x * 0.37 - z * 0.29) * 0.08;
      pos.setY(i, this._alturaLeito(z) + ondula);
      uv.setXY(i, uv.getX(i) * rep, uv.getY(i) * rep); // repetição na UV: texturas continuam compartilhadas
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: carregarTextura(seixos ? "fundo_seixos_cor.jpg" : "fundo_lodo_cor.jpg", { cor: true }),
      color: seixos ? 0xd8d2c0 : 0x8a8466,
      roughness: 0.95,
      metalness: 0,
    });
    if (seixos) {
      mat.normalMap = carregarTextura("fundo_seixos_normal.jpg");
      mat.normalScale.set(1.3, 1.3);
    }
    const forcaC = { value: f.caustica ?? (seixos ? 1.0 : 0.2) };
    mat.onBeforeCompile = (sh) => {
      for (const k of ["corFunda", "corRasa", "solDir", "luzSol", "luzCeu", "turbidez", "tempoC"]) sh.uniforms[k] = this.u[k];
      sh.uniforms.forcaC = forcaC;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vMundoC;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvMundoC = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + LEITO_PARS)
        .replace("#include <lights_fragment_end>", LEITO_LUZ)
        .replace("#include <tonemapping_fragment>", LEITO_AGUA);
    };
    mat.customProgramCacheKey = () => "leito_agua_v1";
    const leito = new THREE.Mesh(geo, mat);
    leito.receiveShadow = true;
    leito.name = "leito";
    this.scene.add(leito);
    this.leito = leito;
  }

  // ---------- parâmetros ----------

  _aplicarUniforms() {
    const p = this.params;
    const u = this.u;
    u.corFunda.value.setHex(p.color);
    if (p.corRasa != null) u.corRasa.value.setHex(p.corRasa);
    else u.corRasa.value.setHex(p.color).offsetHSL(0, -0.05, 0.12);
    u.distorcao.value = p.distortion;
    u.escala.value = p.size;
    u.vento.value = this._ventoExtra ?? p.vento;
    u.ventoDir.value.set(Math.cos(p.ventoDir), Math.sin(p.ventoDir));
    u.turbidez.value = p.turbidez;
    u.sujeira.value = p.sujeira;
    u.temLeito.value = p.fundo ? 1 : 0;
  }

  setParams(p) {
    const fundoAntes = JSON.stringify(this.params.fundo);
    // campos ausentes voltam ao padrão para não herdar o pesqueiro anterior
    this.params = { ...PADRAO, ...p };
    this._aplicarUniforms();
    if (JSON.stringify(this.params.fundo) !== fundoAntes || (this.params.fundo && !this.leito)) this._montarLeito();
  }

  /** Vento do clima (0..1). Passe null para voltar ao vento do pesqueiro. */
  setWind(v) {
    this._ventoExtra = v == null ? null : THREE.MathUtils.clamp(v, 0, 1);
    this._aplicarUniforms();
  }

  setSun(direction, color) {
    this.u.solDir.value.copy(direction).normalize();
    this._solCor.copy(color);
  }

  // intensidade real do sol/lua e do céu, lida das luzes da cena (o céu mexe nelas ao longo do dia)
  _lerLuzes() {
    if (!this._sol) {
      for (const o of this.scene.children) {
        if (o.isDirectionalLight && !this._sol) this._sol = o;
        else if (o.isHemisphereLight && !this._ceu) this._ceu = o;
        else if (o.isAmbientLight && !this._amb) this._amb = o;
      }
    }
    const u = this.u;
    if (this._sol) u.luzSol.value.copy(this._solCor).multiplyScalar(this._sol.intensity);
    else u.luzSol.value.copy(this._solCor).multiplyScalar(2.5);
    if (this._ceu) {
      // média entre a cor do céu e a do chão, como a água "vê" o ambiente
      u.luzCeu.value.copy(this._ceu.color).lerp(this._tmp.copy(this._ceu.groundColor), 0.3).multiplyScalar(this._ceu.intensity);
    }
    if (this._amb) u.luzCeu.value.add(this._tmp.copy(this._amb.color).multiplyScalar(this._amb.intensity));
    if (this.scene.environment) u.luzCeu.value.multiplyScalar(1.15); // com HDRI a cena fica um pouco mais clara
  }

  update(dt) {
    const v = this._ventoExtra ?? this.params.vento;
    this.tempo += dt * this.params.timeScale * (0.7 + v * 0.8);
    this.u.tempo.value = this.tempo;
    this.u.tempoC.value += dt;
    this._lerLuzes();
  }

  setQuality(quality) {
    if (quality === this.quality) return;
    this.quality = quality;
    const old = this.water;
    this.scene.remove(old);
    // libera o alvo de reflexo e o material antigos
    old.dispose();
    old.geometry.dispose();
    this.build();
  }
}
