// Over-the-shoulder camera with smooth follow, aim-yaw tracking, fight focus,
// charge FOV pull and decaying shake. Also drives the slow menu orbit.

import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { lerp, clamp } from "../utils/utils.js";

const UP = new THREE.Vector3(0, 1, 0);

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = "menu"; // 'menu' | 'play'
    this.anchor = new THREE.Vector3(0, 0.7, -2);
    this.aimYaw = 0;
    this.fovPulse = 0; // 0..1 while charging
    this.shakeAmt = 0;
    this.focus = null; // Vector3 to look at during fights
    this.menuT = 0;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this.briga = null;
    this.snapNext = true;
  }

  setAnchor(pos) {
    this.anchor.copy(pos);
    this.snapNext = true;
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.snapNext = true;
    }
  }

  setAimYaw(yaw) {
    this.aimYaw = yaw;
  }

  setFovPulse(p) {
    this.fovPulse = clamp(p, 0, 1);
  }

  setFocus(point) {
    this.focus = point;
  }

  /** Briga em andamento (objeto ReelFight) ou null: a câmera acompanha o peixe, aproxima e treme com a tensão. */
  setBriga(f) {
    this.briga = f && f.active ? f : null;
  }

  addShake(amount) {
    this.shakeAmt = Math.min(this.shakeAmt + amount, 0.8);
  }

  update(dt) {
    const cam = this.camera;
    const C = CONFIG.camera;

    if (this.mode === "menu") {
      this.menuT += dt * 0.05;
      const r = 13;
      this._desired.set(
        this.anchor.x + Math.sin(this.menuT) * r,
        this.anchor.y + 3.6,
        this.anchor.z + Math.cos(this.menuT * 0.7) * 6 + 9
      );
      // gaze sweeps along the horizon so sky, water and shoreline all read
      this._look.set(this.anchor.x - Math.sin(this.menuT) * 10, 2.4, this.anchor.z - 42);
      const k = this.snapNext ? 1 : 1 - Math.exp(-1.6 * dt);
      this._pos.lerp(this._desired, k);
      if (this.snapNext) this._pos.copy(this._desired);
      cam.position.copy(this._pos);
      cam.lookAt(this._look);
      cam.fov = lerp(cam.fov, C.fov + 4, 1 - Math.exp(-2 * dt));
      cam.updateProjectionMatrix();
      this.snapNext = false;
      return;
    }

    // play mode: behind and slightly right of the angler, facing the aim
    const yaw = this.aimYaw;
    this._dir.set(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

    // briga: quanto mais perto o peixe, mais a câmera chega junto; pulo e embarque aproximam mais
    const B = this.briga;
    const perto = B ? clamp((B.progress - 45) / 55, 0, 1) : 0;
    const dest = B ? B.destaque || 0 : 0;
    this.pertoS = lerp(this.pertoS || 0, B ? Math.max(perto * 0.8, B.phase === "landing" ? 1 : 0) : 0, 1 - Math.exp(-2 * dt));
    this.destS = lerp(this.destS || 0, dest, 1 - Math.exp(-5 * dt));
    this.tensaoS = lerp(this.tensaoS || 0, B ? B.tension / 100 : 0, 1 - Math.exp(-6 * dt));
    // na briga a câmera passa para o ombro esquerdo: a vara (na mão direita) fica de lado e não tapa o peixe
    this.brigaS = lerp(this.brigaS || 0, B ? 1 : 0, 1 - Math.exp(-1.5 * dt));

    this._desired
      .copy(this.anchor)
      .addScaledVector(this._dir, -C.back + this.pertoS * 0.7)
      .addScaledVector(right, C.side - this.brigaS * (this.ladoBriga ?? 1.0))
      .addScaledVector(UP, C.height - this.pertoS * 0.2);

    if (this.focus) {
      this._look.copy(this.focus);
      this._look.y = Math.max(this._look.y, 0.2);
      // pull the look point a bit toward the horizon so the fish isn't dead-center low;
      // perto do fim, olha um pouco aquém do peixe para ele subir na tela (acima do painel da briga)
      this._look.addScaledVector(this._dir, lerp(2, -1.4, this.pertoS));
      if (B && B.fishMesh && this.destS > 0.05) {
        // pulo/embarque: o olhar segue o peixe no ar
        const p = B.fishMesh.position;
        this._look.lerp(this._tmp.set(p.x, Math.max(p.y, 0.2), p.z), this.destS * 0.7);
      }
    } else {
      this._look.copy(this.anchor).addScaledVector(this._dir, 16);
      this._look.y = 0.6;
    }

    const k = this.snapNext ? 1 : 1 - Math.exp(-6 * dt);
    this._pos.lerp(this._desired, k);
    if (this.snapNext) this._pos.copy(this._desired);

    // decaying shake
    this.shakeAmt *= Math.exp(-5.5 * dt);
    const sh = this.shakeAmt;
    // tremor contínuo e suave, proporcional à tensão (os braços segurando o peixe)
    this.tremT = (this.tremT || 0) + dt;
    const tr = Math.pow(Math.max(0, this.tensaoS - 0.35) / 0.65, 2) * 0.03;
    const t = this.tremT;
    const nx = Math.sin(t * 13.1) + Math.sin(t * 21.7 + 1.3) * 0.6;
    const ny = Math.sin(t * 11.3 + 0.7) + Math.sin(t * 17.9 + 2.1) * 0.5;
    cam.position.set(
      this._pos.x + (Math.random() - 0.5) * sh * 0.5 + nx * tr,
      this._pos.y + (Math.random() - 0.5) * sh * 0.35 + ny * tr,
      this._pos.z + (Math.random() - 0.5) * sh * 0.5
    );
    cam.lookAt(this._look);

    const targetFov = C.fov - this.fovPulse * C.chargeFovDrop - this.pertoS * 9 - this.destS * 13;
    cam.fov = lerp(cam.fov, targetFov, 1 - Math.exp(-8 * dt));
    cam.updateProjectionMatrix();
    this.snapNext = false;
  }
}
