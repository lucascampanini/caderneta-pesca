// Pós-processamento: cena em HDR (meio-float, com MSAA) -> bloom bem sutil -> OutputPass
// (tone mapping ACES + sRGB, aplicado uma vez só) -> correção de cor leve e vinheta suave.
// A qualidade segue S.settings.quality: "high" com tudo, "low" sem bloom e sem MSAA
// (o pixelRatio menor já vem do core.setQuality).

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { S } from "../state/gameState.js";

// Filtro de segurança antes do bloom: um único pixel NaN/infinito (de qualquer shader) seria espalhado
// pelo desfoque do bloom e pintaria a tela de preto. Aqui ele vira 0 e o brilho fica limitado.
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      bvec4 ruim = bvec4(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b), isnan(c.a) || isinf(c.a));
      if (any(ruim)) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(min(c.rgb, vec3(64.0)), c.a);
    }`,
};

// roda depois do OutputPass, então trabalha em cor de tela (sRGB)
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContraste: { value: 1.06 },
    uSaturacao: { value: 1.08 },
    uVinheta: { value: 0.32 },
    uAspecto: { value: 1 },
    uTom: { value: new THREE.Vector3(1.0, 0.995, 0.985) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uContraste, uSaturacao, uVinheta, uAspecto;
    uniform vec3 uTom;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // contraste em curva S suave em volta do meio-tom (não estoura os brancos)
      c = clamp(mix(vec3(0.5), c, uContraste), 0.0, 1.0);
      c = mix(c, c * c * (3.0 - 2.0 * c), (uContraste - 1.0) * 1.5);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaturacao) * uTom;
      // vinheta: escurece só os cantos, em forma de elipse da tela
      vec2 q = (vUv - 0.5) * vec2(uAspecto, 1.0) / max(uAspecto, 1.0) * 2.0;
      float v = smoothstep(0.55, 1.45, length(q));
      c *= 1.0 - uVinheta * v * v;
      // um tiquinho de ruído quebra o degradê em faixas do céu
      float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0) + n / 255.0, 1.0);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = null;
    this._pr = 0;
    this.montar(S.settings.quality);
    window.addEventListener("resize", () => this.redimensionar());
  }

  montar(q) {
    this.quality = q;
    const alta = q !== "low";
    if (this.composer) {
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.bloom?.dispose();
    }
    const pr = this.renderer.getPixelRatio();
    const w = window.innerWidth, h = window.innerHeight;
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType,
      samples: alta ? 4 : 0,
    });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = null;
    if (alta) {
      // limiar alto em HDR: só o sol, o brilho dele na água e reflexos fortes acendem
      composer.addPass(new ShaderPass(SanitizeShader));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.22, 0.55, 2.2);
      composer.addPass(this.bloom);
    }
    composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);
    this.composer = composer;
    this._pr = pr;
    this.redimensionar();
  }

  redimensionar() {
    const w = window.innerWidth, h = window.innerHeight;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.grade.uniforms.uAspecto.value = w / h;
  }

  render() {
    if (S.settings.quality !== this.quality) this.montar(S.settings.quality);
    else if (this.renderer.getPixelRatio() !== this._pr) {
      this._pr = this.renderer.getPixelRatio();
      this.redimensionar();
    }
    this.composer.render();
  }
}
