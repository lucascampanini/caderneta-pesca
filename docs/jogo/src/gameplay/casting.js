// Aiming, charge meter, cast launch math, the angler's rod rig (with bend and
// cast-flick animation), the trajectory preview and the fishing line itself.

import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { clamp, lerp, degToRad } from "../utils/utils.js";
import { montarVara } from "./rodModel.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

const LINE_POINTS = 22;

export class CastingSystem {
  constructor(scene) {
    this.scene = scene;

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
    this.flickT = 1; // >= 1 means the cast flick animation is finished
    this.swayT = 0;
    this.bend = 0;
    this.bendTarget = 0;

    this.buildRod();
    this.buildPreview();
    this.buildLine();
    this._tip = new THREE.Vector3();
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
      this.joint0.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
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
    if (this.line) {
      this.line.material.color.setHex(m.linha.cor);
      this.line.material.opacity = m.linha.opacidade;
      this.line.material.linewidth = eq.line.tipo === "multi" ? 2 : 1.6;
    }
  }

  /** Fisgada: a vara dá um tranco para cima e enverga. */
  hookset() {
    this.hookT = 0;
    this.bendVel += 7;
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
  }

  /** Stops the meter, plays the flick, returns final power 0..1. */
  endCharge() {
    this.charging = false;
    this.flickT = 0;
    this.bendVel += 4 + this.power * 8; // chicotada: a ponta vai para a frente
    return this.power;
  }

  cancelCharge() {
    this.charging = false;
    this.power = 0;
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
    // linha com espessura em pixels (Line2), para aparecer bem na tela
    this.linePositions = new Float32Array(LINE_POINTS * 3);
    const geo = new LineGeometry();
    geo.setPositions(this.linePositions);
    const mat = new LineMaterial({ color: 0xdde8ee, linewidth: 1.6, transparent: true, opacity: 0.7, worldUnits: false });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", () => mat.resolution.set(window.innerWidth, window.innerHeight));
    this.line = new Line2(geo, mat);
    this.line.frustumCulled = false;
    this.line.visible = false;
    this.scene.add(this.line);
  }

  setLineTarget(target) {
    this.lineTarget = target;
  }

  setLineTension(t) {
    this.lineTension = clamp(t, 0, 1);
  }

  updateLine() {
    if (!this.lineTarget) {
      this.line.visible = false;
      return;
    }
    const tip = this.tipPos();
    const end = this.lineTarget;
    const dist = tip.distanceTo(end);
    const sag = dist * 0.085 * (1 - this.lineTension * 0.85);
    for (let i = 0; i < LINE_POINTS; i++) {
      const t = i / (LINE_POINTS - 1);
      const x = lerp(tip.x, end.x, t);
      const y = lerp(tip.y, end.y, t) - Math.sin(t * Math.PI) * sag;
      const z = lerp(tip.z, end.z, t);
      this.linePositions[i * 3] = x;
      this.linePositions[i * 3 + 1] = y;
      this.linePositions[i * 3 + 2] = z;
    }
    this.line.geometry.setPositions(this.linePositions);
    this.line.visible = true;
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
    this.joint0.rotation.x = lerp(baseAngle, (this.ergue ?? -0.38) + (baseAngle + 0.95) * 0.5, this.pose);
    this.joint0.rotation.z = -0.62 * this.pose;

    // curvatura como mola amortecida: enverga, passa um pouco do ponto e assenta (pulsa nas arrancadas)
    const alvo = this.charging ? -this.power * 0.35 : this.bendTarget;
    this.bendVel += (alvo - this.bend) * 75 * dt;
    this.bendVel *= Math.exp(-8.5 * dt);
    this.bend += this.bendVel * dt;
    this.tremorT += dt;
    this.tremorAmp *= Math.exp(-4 * dt);
    const tremor = Math.sin(this.tremorT * 34) * this.tremorAmp * 0.12;
    const total = (this.bend + tremor) * this.flex;
    // com a vara deitada para o lado, a linha puxa a ponta para baixo e para o centro (onde está o peixe)
    const lado = 1.15 * this.pose;
    const cx = Math.cos(lado), sz = Math.sin(lado);
    for (let i = 0; i < this.joints.length; i++) {
      this.joints[i].rotation.x = -total * this.pesos[i] * cx;
      this.joints[i].rotation.z = total * this.pesos[i] * sz;
    }

    // manivela gira quando recolhe; carretel gira ao contrário quando o peixe toma linha
    if (this.reel) {
      this.reel.manivela.rotation.x -= this.reelIn * dt * 14;
      if (this.lineOut > 0) this.reel.carretel.rotateY(this.lineOut * dt * 40);
    }

    this.updatePreview(!!opts.previewVisible);
    this.updateLine();
  }

  setBend(t) {
    this.bendTarget = clamp(t, -0.6, 1.4);
  }
}
