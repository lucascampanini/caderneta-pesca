// Aiming, charge meter, cast launch math, the angler's rod rig (with bend and
// cast-flick animation), the trajectory preview and the fishing line itself.
// A linha é uma corda simulada (linhaFisica.js) e a curvatura da vara vem da direção
// e da força reais com que a linha puxa a ponta.

import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { clamp, lerp, degToRad } from "../utils/utils.js";
import { montarVara } from "./rodModel.js";
import { ajustarAmbienteEquipamento } from "./materiaisEquipamento.js";
import { LinhaFisica } from "./linhaFisica.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

const LINE_POINTS = 44;
const WATER_Y = CONFIG.water.level;
const COR_AGUA = new THREE.Color(0x2c4436);

export class CastingSystem {
  constructor(scene) {
    this.scene = scene;
    this.effects = null; // ligado pelo main: marolinhas e risco da linha na água

    // rig group sits at the player spot and rotates with aim
    this.rig = new THREE.Group();
    scene.add(this.rig);

    this.aimYaw = 0;
    this.targetYaw = 0;
    this.pointerX = 0.5;
    this.charging = false;
    this.chargeT = 0;
    this.power = 0;
    this.castMult = 1;
    this.lineTension = 0;
    this.lineTarget = null;
    this.lineMode = "boia";
    this.flickT = 1; // >= 1 means the cast flick animation is finished
    this.swayT = 0;
    this.bend = 0;
    this.bendTarget = 0;

    // curvatura como vetor de rotação (eixo × ângulo) no referencial da base da vara
    this.bendVec = new THREE.Vector3();
    this.bendVecVel = new THREE.Vector3();
    this.puxao = new THREE.Vector3(0, -1, 0); // direção (mundo) em que a linha puxa a ponta
    this.pickupAberto = false;
    this.pickupAng = null;
    this.entradaT = 0;
    this.riscoT = 0;

    this.buildRod();
    this.buildPreview();
    this.buildLine();
    this._tip = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._eixo = new THREE.Vector3();
    this._entrada = new THREE.Vector3();
    this._dirEntrada = new THREE.Vector3();
  }

  // ---------- rod ----------

  buildRod() {
    const rodRoot = new THREE.Group();
    rodRoot.position.set(0.42, 1.1, 0.15);
    this.rig.add(rodRoot);
    this.rodRoot = rodRoot;
    // até o equipamento chegar, uma vara vazia (setGear monta a de verdade)
    this.joint0 = new THREE.Group();
    rodRoot.add(this.joint0);
    this.joints = [];
    this.pesos = [];
    this.flex = 1;
    this.reel = null;
    this.tipMarker = new THREE.Object3D();
    this.joint0.add(this.tipMarker);
    this.bendVel = 0;
    this.tremorAmp = 0;
    this.tremorT = 0;
    this.hookT = 1;
    this.reelIn = 0;
    this.lineOut = 0;
  }

  /** Monta a vara, o molinete/carretilha e a cor da linha conforme o equipamento em uso. */
  setGear(eq) {
    const key = [eq.rod.id, eq.reel.id, eq.line.id].join("|");
    if (key === this.gearKey) return;
    this.gearKey = key;
    if (this.joint0) {
      this.rodRoot.remove(this.joint0);
      this.joint0.traverse((o) => {
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        if (o.material && !o.material.userData?.shared) o.material.dispose?.();
      });
    }
    const m = montarVara(eq);
    this.joint0 = m.root;
    this.joint0.rotation.x = -0.95;
    this.rodRoot.add(m.root);
    this.joints = m.joints;
    this.pesos = m.pesos;
    this.flex = m.spec.flex;
    // vara comprida sobe menos na briga, para a ponta continuar no quadro
    this.ergue = -0.38 - Math.min(1, Math.max(0, (m.spec.comp - 1.65) / 1.35)) * 0.34;
    this.reel = m.reel;
    this.tipMarker = m.tip;
    this.pickupAng = null;
    this.linhaAp = m.linha;
    if (this.line) {
      this.line.material.opacity = m.linha.opacidade;
      this.line.material.linewidth = m.linha.largura;
      // multi boia e afunda pouco; mono afunda devagar
      this.fis.afunda = m.linha.tipo === "multi" ? 0.05 : 0.12;
    }
  }

  /** Fisgada: a vara dá um tranco para cima e enverga. */
  hookset() {
    this.hookT = 0;
    this.bendVecVel.x -= 7 * this.flex;
  }

  /** Cabeçada do peixe: a ponta treme. */
  tremor(amount) {
    this.tremorAmp = Math.max(this.tremorAmp, amount);
  }

  /** Velocidade de recolher (manivela) e de linha saindo (carretel girando ao contrário), 0 a 1. */
  setReelMotion(recolhendo, saindo) {
    this.reelIn = recolhendo;
    this.lineOut = saindo;
  }

  /** Fecha a alça do pick-up (depois que a boia cai na água). */
  fecharPickup() {
    this.pickupAberto = false;
  }

  attachTo(playerSpot) {
    this.rig.position.copy(playerSpot);
    this.aimYaw = 0;
    this.targetYaw = 0;
    this.rig.rotation.y = 0;
  }

  tipPos() {
    return this.tipMarker.getWorldPosition(this._tip);
  }

  get dir() {
    return new THREE.Vector3(Math.sin(this.aimYaw), 0, -Math.cos(this.aimYaw));
  }

  // ---------- aiming & charging ----------

  setPointerX(normX) {
    this.pointerX = clamp(normX, 0, 1);
  }

  /** Steer the rod toward an arbitrary world point (used during the fight). */
  aimAtPoint(p) {
    const dx = p.x - this.rig.position.x;
    const dz = p.z - this.rig.position.z;
    this.targetYaw = Math.atan2(dx, -dz);
  }

  beginCharge() {
    this.charging = true;
    this.chargeT = 0;
    this.power = 0;
    this.pickupAberto = true; // dedo na linha, alça aberta
  }

  /** Stops the meter, plays the flick, returns final power 0..1. */
  endCharge() {
    this.charging = false;
    this.flickT = 0;
    this.bendVecVel.x -= (4 + this.power * 8) * this.flex; // chicotada: a ponta vai para a frente
    this.fis.comprimento = 0.5; // a linha começa a sair do carretel
    return this.power;
  }

  cancelCharge() {
    this.charging = false;
    this.power = 0;
    this.pickupAberto = false;
  }

  /** power -> world-space launch state for the bobber. */
  computeLaunch(power, castMult) {
    const C = CONFIG.cast;
    const maxDist = C.baseMaxDist * castMult;
    const dist = lerp(C.minDist, maxDist, Math.pow(power, C.powerCurve));
    const theta = degToRad(C.launchAngleDeg);
    const v = Math.sqrt((dist * C.gravity) / Math.sin(2 * theta));
    const dir = this.dir;
    const velocity = new THREE.Vector3(
      dir.x * v * Math.cos(theta),
      v * Math.sin(theta),
      dir.z * v * Math.cos(theta)
    );
    return { origin: this.tipPos().clone(), velocity, dist };
  }

  // ---------- trajectory preview ----------

  buildPreview() {
    const max = 48;
    this.previewPositions = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.previewPositions, 3));
    geo.setDrawRange(0, 0);
    this.previewMat = new THREE.PointsMaterial({
      color: 0xbfe9ff,
      size: 0.09,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.preview = new THREE.Points(geo, this.previewMat);
    this.preview.frustumCulled = false;
    this.scene.add(this.preview);

    const ringGeo = new THREE.RingGeometry(0.55, 0.7, 28);
    this.previewRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    this.previewRing.rotation.x = -Math.PI / 2;
    this.previewRing.renderOrder = 2;
    this.scene.add(this.previewRing);
  }

  updatePreview(visible) {
    if (!visible) {
      this.preview.visible = false;
      this.previewRing.visible = false;
      return;
    }
    const power = this.charging ? this.power : 0.5;
    const { origin, velocity } = this.computeLaunch(power, this.castMult);
    const pos = origin.clone();
    const vel = velocity.clone();
    const step = 1 / 28;
    let count = 0;
    const max = 48;
    while (count < max) {
      this.previewPositions[count * 3] = pos.x;
      this.previewPositions[count * 3 + 1] = pos.y;
      this.previewPositions[count * 3 + 2] = pos.z;
      count++;
      vel.y -= CONFIG.cast.gravity * step;
      pos.addScaledVector(vel, step);
      if (pos.y <= CONFIG.water.level) break;
    }
    this.preview.geometry.setDrawRange(0, count);
    this.preview.geometry.attributes.position.needsUpdate = true;
    this.preview.visible = true;
    this.previewMat.opacity = this.charging ? 0.75 : 0.3;
    this.previewRing.position.set(pos.x, CONFIG.water.level + 0.03, pos.z);
    this.previewRing.material.opacity = this.charging ? 0.6 : 0.25;
    this.previewRing.visible = true;
  }

  // ---------- fishing line ----------

  buildLine() {
    // linha com espessura em pixels (Line2), para aparecer bem na tela; buffers atualizados no lugar
    this.fis = new LinhaFisica(LINE_POINTS);
    this.linePositions = new Float32Array(LINE_POINTS * 3);
    this.lineColors = new Float32Array(LINE_POINTS * 3).fill(1);
    const geo = new LineGeometry();
    geo.setPositions(this.linePositions);
    geo.setColors(this.lineColors);
    const mat = new LineMaterial({ color: 0xffffff, linewidth: 1.6, transparent: true, opacity: 0.7, worldUnits: false, vertexColors: true, depthWrite: false });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", () => mat.resolution.set(window.innerWidth, window.innerHeight));
    this.line = new Line2(geo, mat);
    this.line.frustumCulled = false;
    this.line.visible = false;
    this.line.renderOrder = 3;
    this.scene.add(this.line);
    this._cor = new THREE.Color();
  }

  /**
   * @param {Vector3|null} target o que está na ponta da linha
   * @param {string} modo "voando" | "boia" | "briga" | "embarque"
   */
  setLineTarget(target, modo = "boia") {
    if (!target && this.lineTarget) this.fis.iniciada = false;
    this.lineTarget = target;
    this.lineMode = modo;
  }

  setLineTension(t) {
    this.lineTension = clamp(t, 0, 1);
  }

  /** Escreve os pontos da corda direto nos buffers intercalados do Line2 (sem alocar a cada quadro). */
  escreverLinha() {
    const geo = this.line.geometry;
    const pos = geo.attributes.instanceStart.data;
    const col = geo.attributes.instanceColorStart.data;
    const P = this.fis.p;
    const ap = this.linhaAp || { cor: 0xcfe6dc, cores: null };
    const base = this._cor.setHex(ap.cor);
    // multi grossa: uma cor a cada 10 m, contados a partir da boia/peixe (as cores andam quando recolhe)
    const total = this.fis.comprimento;
    const passo = total / (LINE_POINTS - 1);
    const cores = ap.cores;
    const tmp = this._v2;
    for (let i = 0; i < LINE_POINTS - 1; i++) {
      for (let k = 0; k < 2; k++) {
        const j = i + k;
        const o = j * 3, d = i * 6 + k * 3;
        pos.array[d] = P[o];
        pos.array[d + 1] = P[o + 1];
        pos.array[d + 2] = P[o + 2];
        let r = base.r, g = base.g, b = base.b;
        if (cores) {
          const desdeFim = total - j * passo;
          const c = cores[Math.floor(Math.max(0, desdeFim) / 10) % cores.length];
          r = ((c >> 16) & 255) / 255; g = ((c >> 8) & 255) / 255; b = (c & 255) / 255;
        }
        // debaixo d'água a linha some no verde-escuro do rio
        const prof = WATER_Y - P[o + 1];
        if (prof > 0) {
          const f = Math.min(0.85, 0.35 + prof * 0.5);
          tmp.set(r, g, b).lerp(COR_AGUA, f);
          r = tmp.x; g = tmp.y; b = tmp.z;
        }
        col.array[d] = r;
        col.array[d + 1] = g;
        col.array[d + 2] = b;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  updateLine(dt) {
    if (!this.lineTarget) {
      this.line.visible = false;
      return;
    }
    const tip = this.tipPos();
    const end = this.lineTarget;
    const dist = tip.distanceTo(end);
    const F = this.fis;
    const T = this.lineTension;
    switch (this.lineMode) {
      case "voando":
        // a linha sai do carretel atrás da boia, com barriga
        F.boia = true;
        F.comprimento = Math.max(F.comprimento, dist * 1.05 + 0.3);
        break;
      case "boia":
        // o pescador recolhe a sobra devagar, mas a linha continua deitada na água
        F.boia = true;
        F.comprimento = Math.max(dist * 1.004, lerp(F.comprimento, dist * (1.02 - T * 0.02), 1 - Math.exp(-0.6 * dt)));
        break;
      case "embarque":
        F.boia = false;
        F.comprimento = dist * 1.0;
        break;
      default: {
        // briga: sob tensão a linha fica reta; frouxa (peixe vindo) faz barriga
        F.boia = false;
        const folga = 0.0002 + Math.pow(1 - T, 5) * 0.03;
        // a sobra é recolhida na hora (o pescador mantém a linha esticada); linha saindo acompanha rápido
        const alvo = dist * (1 + folga);
        F.comprimento = alvo < F.comprimento ? alvo : lerp(F.comprimento, alvo, 1 - Math.exp(-12 * dt));
        break;
      }
    }
    F.step(dt, tip, end);
    this.escreverLinha();
    this.line.visible = true;

    // direção em que a linha puxa a ponta: um trecho adiante, para não tremer com o primeiro nó
    F.ponto(3, this._v).sub(tip);
    if (this._v.lengthSq() > 1e-6) this.puxao.copy(this._v).normalize();

    this.efeitosNaAgua(dt);
  }

  /** Marolinha onde a linha entra na água e o risco na superfície quando o peixe corre. */
  efeitosNaAgua(dt) {
    if (!this.effects) return;
    const e = this.fis.entradaNaAgua(this._entrada, this._dirEntrada);
    if (!e) return;
    const briga = this.lineMode === "briga";
    this.entradaT -= dt;
    if (this.entradaT <= 0) {
      if (briga) {
        this.effects.ripple(e, 0.5 + this.lineTension * 0.5, 0.7);
        this.entradaT = 0.32 - this.lineTension * 0.12;
      } else if (this.lineMode === "boia" && Math.random() < 0.3) {
        this.effects.ripple(e, 0.35, 0.9);
        this.entradaT = 1.4;
      } else this.entradaT = 0.6;
    }
    // peixe tomando linha: a linha corta a água e levanta um leque de gotinhas
    if (briga && this.lineOut > 0.2) {
      this.riscoT -= dt;
      if (this.riscoT <= 0) {
        this.effects.risco?.(e, this._dirEntrada, this.lineOut);
        this.riscoT = 0.05;
      }
    }
  }

  // ---------- per-frame ----------

  /**
   * @param {number} dt
   * @param {object} opts { aiming, previewVisible }
   */
  update(dt, opts = {}) {
    if (opts.aiming) {
      const maxYaw = degToRad(CONFIG.cast.aimMaxYawDeg);
      this.targetYaw = lerp(-maxYaw, maxYaw, this.pointerX);
    }
    this.aimYaw = lerp(this.aimYaw, this.targetYaw, 1 - Math.exp(-10 * dt));
    this.rig.rotation.y = -this.aimYaw;

    if (this.charging) {
      this.chargeT += dt;
      const u = this.chargeT / CONFIG.cast.chargeTime;
      this.power = 1 - Math.abs((u % 2) - 1); // triangle wave 0->1->0
    }

    // vara: balanço parado, carga para trás no arremesso, chicotada, fisgada e curvatura na briga
    this.swayT += dt;
    let baseAngle = -0.95 + Math.sin(this.swayT * 1.3) * 0.012;
    if (this.charging) baseAngle -= this.power * 0.45;

    if (this.flickT < 1) {
      this.flickT = Math.min(1, this.flickT + dt / 0.42);
      const t = this.flickT;
      if (t < 0.3) baseAngle += lerp(0, 0.62, t / 0.3);
      else baseAngle += lerp(0.62, 0, (t - 0.3) / 0.7);
    }
    if (this.hookT < 1) {
      this.hookT = Math.min(1, this.hookT + dt / 0.35);
      baseAngle -= Math.sin(this.hookT * Math.PI) * 0.4;
    }
    // na briga o pescador levanta a vara e a deita para o lado: o arco da vara aparece de verdade
    const querPose = !this.charging && this.bendTarget > 0.1 ? 1 : 0;
    this.pose = lerp(this.pose || 0, querPose, 1 - Math.exp(-3.5 * dt));
    this.joint0.rotation.x = lerp(baseAngle, (this.ergue ?? -0.38) + (this.ergueExtra ?? 0.2) + (baseAngle + 0.95) * 0.5, this.pose);
    this.joint0.rotation.z = -(this.ladoPose ?? 0.35) * this.pose;
    this.rodRoot.rotation.y = -(this.giroPose ?? 0.6) * this.pose;

    this.curvarVara(dt);

    // manivela gira quando recolhe; rotor do molinete acompanha; carretel gira quando o peixe toma linha
    if (this.reel) {
      this.reel.manivela.rotation.x -= this.reelIn * dt * 14;
      if (this.reel.rotor) this.reel.rotor.rotation.y -= this.reelIn * dt * 14 * 5.2;
      if (this.lineOut > 0) this.reel.carretel.rotateY(this.lineOut * dt * 40);
      if (!this.reel.rotor && this.reelIn > 0) this.reel.carretel.rotateY(-this.reelIn * dt * 30);
      // alça do pick-up: abre no arremesso, fecha com estalo quando a boia cai
      const alca = this.reel.alca;
      if (alca) {
        const alvo = this.pickupAberto ? alca.userData.aberta : alca.userData.fechada;
        if (this.pickupAng === null) this.pickupAng = alvo;
        this.pickupAng = lerp(this.pickupAng, alvo, 1 - Math.exp(-(this.pickupAberto ? 14 : 22) * dt));
        alca.rotation.x = this.pickupAng;
      }
    }

    this.updatePreview(!!opts.previewVisible);
    this.updateLine(dt);
    this.acompanharLuz(dt);
  }

  /** Reflexo da vara acompanha a luz do dia (procura a luz hemisférica da cena uma vez). */
  acompanharLuz(dt) {
    this.luzT = (this.luzT ?? 0) - dt;
    if (this.luzT > 0) return;
    this.luzT = 0.5;
    if (!this.hemi) this.scene.traverse((o) => { if (o.isHemisphereLight && !this.hemi) this.hemi = o; });
    const k = this.hemi ? clamp(this.hemi.intensity / 0.7, 0.12, 1.1) : 1;
    ajustarAmbienteEquipamento(k, this.scene.environment);
  }

  /**
   * Curvatura da vara pela linha: a ponta enverga na direção em que a linha puxa, tanto mais quanto
   * maior a carga (tensão/peso, via setBend), sem passar do alinhamento com a linha. O carregamento
   * do arremesso e os trancos (fisgada, chicotada) entram como mola amortecida no mesmo vetor.
   */
  curvarVara(dt) {
    // direção do puxão no referencial da base da vara (joint0), onde o eixo da vara é +Y
    this.joint0.updateWorldMatrix(true, false);
    this.joint0.getWorldQuaternion(this._q).invert();
    const d = this._v.copy(this.puxao).applyQuaternion(this._q);
    const perp = Math.hypot(d.x, d.z);
    const angLinha = Math.atan2(perp, d.y); // ângulo entre o eixo da vara e a linha
    const alvo = this._v2.set(0, 0, 0);
    // sem linha (vitrine/testes) a carga puxa a ponta para baixo
    if (!this.lineTarget) this.puxao.lerp(this._eixo.set(0, -1, 0), 1 - Math.exp(-4 * dt)).normalize();
    const temLinha = (!!this.lineTarget || this.bendTarget > 0.05) && perp > 1e-4;
    if (temLinha) {
      // carga: o que vem da briga (setBend) mais o peso da própria linha quando parada
      const carga = Math.max(0, this.bendTarget) + 0.04;
      const ang = Math.min(angLinha * 0.92, carga * this.flex * 1.7);
      // eixo de giro que leva +Y em direção ao puxão: (dz, 0, -dx)
      alvo.set(d.z / perp, 0, -d.x / perp).multiplyScalar(ang);
    }
    if (this.charging) alvo.x += this.power * 0.35 * this.flex; // vara carregando para trás
    // mola amortecida: enverga, passa um pouco do ponto e assenta (pulsa nas arrancadas)
    this.bendVecVel.addScaledVector(this._eixo.copy(alvo).sub(this.bendVec), 75 * dt);
    this.bendVecVel.multiplyScalar(Math.exp(-8.5 * dt));
    this.bendVec.addScaledVector(this.bendVecVel, dt);

    // tremor: cabeçadas e a ponta vibrando perto do limite da linha
    this.tremorT += dt;
    this.tremorAmp *= Math.exp(-4 * dt);
    const limite = clamp((this.lineTension - 0.78) / 0.22, 0, 1);
    const amp = this.tremorAmp * 0.1 + limite * 0.035;
    const v = this._eixo.copy(this.bendVec);
    if (amp > 1e-4) {
      const ang = v.length() || 1;
      // vibra de lado (perpendicular ao plano da curva) e no próprio plano
      const lx = -v.z / ang, lz = v.x / ang;
      const s1 = Math.sin(this.tremorT * 34) * amp, s2 = Math.sin(this.tremorT * 47 + 1.3) * amp * 0.6;
      v.x += lx * s1 + (v.x / ang) * s2;
      v.z += lz * s1 + (v.z / ang) * s2;
    }
    const total = v.length();
    if (total > 1e-5) v.multiplyScalar(1 / total);
    else v.set(1, 0, 0);
    for (let i = 0; i < this.joints.length; i++) this.joints[i].quaternion.setFromAxisAngle(v, total * this.pesos[i]);
  }

  setBend(t) {
    this.bendTarget = clamp(t, -0.6, 1.4);
  }
}
