// Céu fotográfico: esfera com 4 HDRIs reais (Poly Haven, CC0) misturados conforme a hora do jogo,
// iluminação baseada em imagem (environment map via PMREM) e o ajuste de sol, hemisfério, neblina
// e exposição para casar com cada céu. A água recebe a direção e a cor do sol daqui (water.setSun).
//
// As texturas guardam a radiância em codificação Reinhard reversível (v = x/(1+x), salvo como v^(1/2.2)),
// então o shader recupera a luz "de verdade" do céu (o sol passa de 1.0) e o tone mapping ACES é
// aplicado uma vez só, no OutputPass do pós-processamento. Conversão: D:/AI/pesca_assets/ceu_agente/converter.py

import * as THREE from "three";
import { lerp, clamp, smoothstep01, degToRad } from "../utils/utils.js";

const PASTA = new URL("../../assets/ceu/", import.meta.url);

// ordem fixa dos canais do shader: 0 dia, 1 amanhecer, 2 entardecer, 3 noite.
// solU = coluna (0..1) onde está o sol na foto; ganho = brilho relativo no jogo.
const CEUS = [
  { nome: "dia", arquivo: "ceu_dia.webp", solU: 0.595, ganho: 1.0 },
  { nome: "amanhecer", arquivo: "ceu_amanhecer.webp", solU: 0.597, ganho: 1.0 },
  { nome: "entardecer", arquivo: "ceu_entardecer.webp", solU: 0.607, ganho: 1.0 },
  { nome: "noite", arquivo: "ceu_noite.webp", solU: 0.599, ganho: 1.0 },
];

// quadros-chave da mistura por hora: [hora, dia, amanhecer, entardecer, noite]
const CHAVES = [
  [0, 0, 0, 0, 1],
  [4.6, 0, 0, 0, 1],
  [5.6, 0, 1, 0, 0],
  [7.4, 0, 1, 0, 0],
  [8.4, 1, 0, 0, 0],
  [16.6, 1, 0, 0, 0],
  [17.6, 0, 0, 1, 0],
  [19.0, 0, 0, 1, 0],
  [20.0, 0, 0, 0, 1],
  [24, 0, 0, 0, 1],
];

const VERT = /* glsl */ `
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D tCeu[4];
  uniform float uPeso[4];
  uniform float uGiro[4];
  uniform float uGanho[4];
  uniform float uNublado;
  uniform vec3 uNeblina;
  uniform vec3 uChao;
  uniform vec3 uReserva;     // cor lisa enquanto a primeira foto não carregou
  uniform float uPesoReserva;
  varying vec3 vMundo;
  #define PI 3.141592653589793

  vec3 decodifica(vec3 s) {
    vec3 v = min(pow(s, vec3(2.2)), vec3(0.996));
    return v / (1.0 - v);
  }
  vec3 amostra(sampler2D t, vec3 d, float giro) {
    float u = fract(atan(d.z, d.x) / (2.0 * PI) - giro);
    float v = clamp(asin(clamp(d.y, 0.0, 1.0)) / (0.5 * PI), 0.002, 0.998);
    return decodifica(texture2D(t, vec2(u, v)).rgb);
  }

  void main() {
    vec3 d = normalize(vMundo - cameraPosition);
    vec3 c = uReserva * uPesoReserva;
    if (uPeso[0] > 0.001) c += amostra(tCeu[0], d, uGiro[0]) * uPeso[0] * uGanho[0];
    if (uPeso[1] > 0.001) c += amostra(tCeu[1], d, uGiro[1]) * uPeso[1] * uGanho[1];
    if (uPeso[2] > 0.001) c += amostra(tCeu[2], d, uGiro[2]) * uPeso[2] * uGanho[2];
    if (uPeso[3] > 0.001) c += amostra(tCeu[3], d, uGiro[3]) * uPeso[3] * uGanho[3];

    // tempo fechado: tira a cor, achata o contraste e escurece um pouco
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 cinza = vec3(l) * vec3(0.95, 0.98, 1.04);
    float lMedia = dot(uNeblina, vec3(0.2126, 0.7152, 0.0722));
    cinza = mix(cinza, vec3(lMedia) * vec3(0.93, 0.97, 1.03), 0.55);
    c = mix(c, cinza * 0.85, uNublado * 0.85);

    // abaixo do horizonte: emenda com a neblina (no environment map vira o chão)
    #ifdef ENV
      vec3 baixo = uChao;
      c = mix(baixo, c, smoothstep(-0.06, 0.0, d.y));
    #else
      c = mix(uNeblina, c, smoothstep(-0.03, 0.015, d.y));
    #endif
    gl_FragColor = vec4(c, 1.0);
  }`;

export class SkySystem {
  constructor(scene, renderer, sunLight, hemiLight, ambient, water) {
    this.scene = scene;
    this.renderer = renderer;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.ambient = ambient;
    this.water = water;

    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.sunColor = new THREE.Color(0xffffff);
    this.dayFactor = 1;

    // texturas: começam com um pixel neutro; o dia carrega primeiro e o resto em segundo plano
    const vazio = new THREE.DataTexture(new Uint8Array([128, 160, 200, 255]), 1, 1);
    vazio.needsUpdate = true;
    this.texturas = CEUS.map(() => vazio);
    this.prontas = CEUS.map(() => false);
    this.horizontes = CEUS.map(() => null); // cor do horizonte por azimute (64 fatias), radiância linear

    this.uniforms = {
      tCeu: { value: this.texturas.slice() },
      uPeso: { value: [1, 0, 0, 0] },
      uGiro: { value: [0, 0, 0, 0] },
      uGanho: { value: CEUS.map((c) => c.ganho) },
      uNublado: { value: 0 },
      uNeblina: { value: new THREE.Color(0.5, 0.55, 0.65) },
      uChao: { value: new THREE.Color(0.05, 0.06, 0.04) },
      uReserva: { value: new THREE.Color(0.35, 0.5, 0.8) },
      uPesoReserva: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    // a esfera acompanha a câmera que estiver desenhando (a principal, a do reflexo da água e a do PMREM)
    const geo = new THREE.SphereGeometry(1800, 48, 24);
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.dome.onBeforeRender = (_r, _s, cam) => {
      this.dome.position.setFromMatrixPosition(cam.matrixWorld);
      this.dome.updateMatrixWorld();
    };
    scene.add(this.dome);

    // cena separada só com o céu, para gerar o environment map (abaixo do horizonte vira chão escuro)
    this.envScene = new THREE.Scene();
    const envMat = mat.clone();
    envMat.uniforms = this.uniforms;
    envMat.defines = { ENV: 1 };
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), envMat);
    this.envScene.add(this.envDome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this._envT = 99;
    this._envPesos = [-1, -1, -1, -1];
    this._envGiro = 0;
    this._envNublado = -1;

    this._pesos = [1, 0, 0, 0];
    this._neb = new THREE.Color();
    this._tmp = new THREE.Color();
    this._cinza = new THREE.Color();
    this._hemiSkyDay = new THREE.Color(0xbcd9ff);
    this._hemiSkyNight = new THREE.Color(0x24345a);
    this._hemiGndDay = new THREE.Color(0x56683c);
    this._hemiGndNight = new THREE.Color(0x0c1218);
    this._sunWarm = new THREE.Color(0xff9a50);
    this._sunWhite = new THREE.Color(0xfff1dc);
    this._moonBlue = new THREE.Color(0x9ab8e8);
    this._chaoDia = new THREE.Color(0.06, 0.07, 0.045);
    this._chaoNoite = new THREE.Color(0.003, 0.004, 0.006);

    this.carregar();
  }

  /** Dia primeiro (é o horário de início mais comum), depois os outros três, um de cada vez. */
  carregar() {
    const loader = new THREE.TextureLoader();
    const um = (i) =>
      new Promise((ok) => {
        loader.load(
          new URL(CEUS[i].arquivo, PASTA).href,
          (tex) => {
            tex.colorSpace = THREE.NoColorSpace; // decodificação feita no shader
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.generateMipmaps = false; // a costura do atan() daria uma linha com mipmap; a foto é maior que a tela
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            this.horizontes[i] = this.lerHorizonte(tex.image);
            this.texturas[i] = tex;
            this.uniforms.tCeu.value[i] = tex;
            this.prontas[i] = true;
            this._envT = 99; // força refazer o environment map
            ok();
          },
          undefined,
          () => {
            console.warn("[ceu] não carregou", CEUS[i].arquivo);
            ok();
          }
        );
      });
    // a hora atual decide quem vem logo depois do dia
    um(0).then(async () => {
      for (const i of [1, 2, 3]) await um(i);
    });
  }

  /** Média da faixa do horizonte (0–6° de altura) em 64 fatias de azimute, já decodificada para radiância. */
  lerHorizonte(img) {
    try {
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 16;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 64, 16);
      const px = ctx.getImageData(0, 15, 64, 1).data;
      const out = new Float32Array(64 * 3);
      for (let i = 0; i < 64 * 3; i++) {
        const s = px[(i / 3 | 0) * 4 + (i % 3)] / 255;
        const v = Math.min(Math.pow(s, 2.2), 0.996);
        out[i] = v / (1 - v);
      }
      return out;
    } catch {
      return null;
    }
  }

  /** Cor do horizonte de uma foto na direção (azimute atan2(z,x)) dada, com o giro aplicado. */
  horizonteEm(i, az, out) {
    const h = this.horizontes[i];
    if (!h) return out.setRGB(0.5, 0.55, 0.65);
    const u = (((az / (2 * Math.PI) - this.uniforms.uGiro.value[i]) % 1) + 1) % 1;
    const f = u * 64 - 0.5;
    const a = ((Math.floor(f) % 64) + 64) % 64, b = (a + 1) % 64, t = f - Math.floor(f);
    return out.setRGB(lerp(h[a * 3], h[b * 3], t), lerp(h[a * 3 + 1], h[b * 3 + 1], t), lerp(h[a * 3 + 2], h[b * 3 + 2], t));
  }

  /** Pesos dos 4 céus para a hora; se uma foto ainda não chegou, o peso dela vai para o dia. */
  pesosDaHora(hours) {
    const h = ((hours % 24) + 24) % 24;
    let k = 0;
    while (k < CHAVES.length - 2 && CHAVES[k + 1][0] <= h) k++;
    const A = CHAVES[k], B = CHAVES[k + 1];
    const t = smoothstep01((h - A[0]) / Math.max(1e-6, B[0] - A[0]));
    const p = this._pesos;
    for (let i = 0; i < 4; i++) p[i] = lerp(A[i + 1], B[i + 1], t);
    for (let i = 1; i < 4; i++) {
      if (!this.prontas[i]) { p[0] += p[i]; p[i] = 0; }
    }
    return p;
  }

  /**
   * @param {number} hours      0-24 game time
   * @param {number} cloud      0 clear, 1 fully cloudy
   * @param {object} loc        active location definition (sky/fog params)
   */
  update(hours, cloud, loc) {
    const elevDeg = Math.sin(((hours - 6) / 12) * Math.PI) * 62;
    // o sol nasce à direita, passa por trás do pescador ao meio-dia e se põe à esquerda:
    // assim o céu à frente (onde se arremessa, -Z) fica limpo, sem o clarão do sol na cara
    const azimuthDeg = 90 - ((hours - 6) / 12) * 180;
    const isDay = elevDeg > -2;

    // 0 = noite fechada, 1 = dia pleno
    const f = smoothstep01((elevDeg + 10) / 22);
    this.dayFactor = f;

    this.sunDir.setFromSphericalCoords(1, degToRad(90 - elevDeg), degToRad(azimuthDeg));

    // ---- céu: pesos, giro (sol da foto na direção do sol do jogo) e brilho do crepúsculo
    const u = this.uniforms;
    const p = this.pesosDaHora(hours);
    for (let i = 0; i < 4; i++) u.uPeso.value[i] = p[i];
    u.uPesoReserva.value = this.prontas[0] ? 0 : 1;
    const azSol = Math.atan2(this.sunDir.z, this.sunDir.x);
    // as estrelas giram devagar em volta do polo durante a noite
    const azNoite = azSol + Math.PI;
    for (let i = 0; i < 4; i++) {
      const az = i === 3 ? azNoite * 0.35 : azSol;
      u.uGiro.value[i] = az / (2 * Math.PI) - CEUS[i].solU;
    }
    // amanhecer/entardecer escurecem quando o sol está abaixo do horizonte
    const crep = lerp(0.18, 1, smoothstep01((elevDeg + 14) / 16));
    u.uGanho.value[0] = CEUS[0].ganho * lerp(0.55, 1, smoothstep01((elevDeg - 4) / 20));
    u.uGanho.value[1] = CEUS[1].ganho * crep;
    u.uGanho.value[2] = CEUS[2].ganho * crep;
    u.uGanho.value[3] = CEUS[3].ganho;
    u.uNublado.value = cloud;

    // ---- neblina: a cor do horizonte da foto à frente do pescador, misturada com a média em volta
    const neb = this._neb.setRGB(0, 0, 0);
    for (let i = 0; i < 4; i++) {
      if (p[i] < 0.001) continue;
      const g = p[i] * u.uGanho.value[i];
      this.horizonteEm(i, -Math.PI / 2, this._tmp);
      neb.r += this._tmp.r * g * 0.55; neb.g += this._tmp.g * g * 0.55; neb.b += this._tmp.b * g * 0.55;
      for (const az of [0, Math.PI / 2, Math.PI]) {
        this.horizonteEm(i, az, this._tmp);
        neb.r += this._tmp.r * g * 0.15; neb.g += this._tmp.g * g * 0.15; neb.b += this._tmp.b * g * 0.15;
      }
    }
    if (!this.prontas[0]) neb.setHex(loc.fog.day);
    const lNeb = neb.r * 0.2126 + neb.g * 0.7152 + neb.b * 0.0722;
    this._cinza.setRGB(lNeb * 0.93, lNeb * 0.97, lNeb * 1.03).multiplyScalar(0.85);
    neb.lerp(this._cinza, cloud * 0.85);
    u.uNeblina.value.copy(neb);
    this.scene.fog.color.copy(neb);
    this.scene.fog.density = loc.fog.density * (1 + (1 - f) * 0.4 + cloud * 0.45);

    // ---- luzes: sol de dia, lua azulada à noite
    const horizonWarmth = clamp(1 - Math.abs(elevDeg) / 20, 0, 1);
    if (isDay) {
      this.sunColor.copy(this._sunWhite).lerp(this._sunWarm, horizonWarmth * horizonWarmth);
      this.sunLight.color.copy(this.sunColor);
      this.sunLight.intensity = lerp(0.1, 3.2, f) * (1 - cloud * 0.6);
      this.sunLight.position.copy(this.sunDir).multiplyScalar(120);
    } else {
      const moonDir = this.sunDir.clone().multiplyScalar(-1);
      moonDir.y = Math.abs(moonDir.y) * 0.7 + 0.25;
      this.sunColor.copy(this._moonBlue);
      this.sunLight.color.copy(this._moonBlue);
      this.sunLight.intensity = 0.38 * (1 - cloud * 0.4);
      this.sunLight.position.copy(moonDir).normalize().multiplyScalar(120);
    }

    // o environment map já traz a luz do céu; o hemisfério fica só como reforço suave e luz do chão
    this.hemiLight.color.copy(this._hemiSkyNight).lerp(this._hemiSkyDay, f);
    this.hemiLight.groundColor.copy(this._hemiGndNight).lerp(this._hemiGndDay, f);
    this.hemiLight.intensity = lerp(0.18, 0.42, f) * (1 - cloud * 0.15);
    this.ambient.intensity = lerp(0.04, 0.06, f);
    this.scene.environmentIntensity = lerp(1.6, 0.9, f) * (1 + cloud * 0.25);
    u.uChao.value.copy(this._chaoNoite).lerp(this._chaoDia, f);

    // olho adaptado: de noite a exposição sobe para ainda se enxergar a água e a mata
    this.renderer.toneMappingExposure = lerp(1.25, 0.62, f) * (1 + cloud * 0.12);

    this.atualizarEnv(p, cloud);

    // a água acompanha a fonte de luz ativa
    this.water.setSun(
      isDay ? this.sunDir : this.sunLight.position.clone().normalize(),
      this.sunColor
    );
  }

  /** Refaz o environment map só quando o céu mudou o bastante (troca de segmento, giro, nuvens). */
  atualizarEnv(p, cloud) {
    this._envT++;
    let dif = Math.abs(cloud - this._envNublado) * 0.5;
    for (let i = 0; i < 4; i++) dif = Math.max(dif, Math.abs(p[i] - this._envPesos[i]));
    const giro = this.uniforms.uGiro.value[0];
    let dg = Math.abs(giro - this._envGiro) % 1;
    dg = Math.min(dg, 1 - dg);
    const precisa = this._envT >= 99 || dif > 0.12 || dg > 12 / 360;
    if (!precisa || this._envT < 30) return; // no máximo ~2 vezes por segundo
    this._envT = 0;
    for (let i = 0; i < 4; i++) this._envPesos[i] = p[i];
    this._envGiro = giro;
    this._envNublado = cloud;
    const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 200);
    this.scene.environment = rt.texture;
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
  }
}
