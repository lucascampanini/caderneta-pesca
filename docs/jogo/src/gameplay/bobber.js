// O que vai na ponta da linha: boia (fica boiando e afunda na mordida), chumbada (afunda e fica no fundo,
// a mordida aparece na ponta da vara) ou isca artificial (o pescador recolhe e dá toques para ela trabalhar).
// Voo, pouso na água e recolhimento. Emite eventos quando pousa e quando volta.

import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { events } from "../state/gameState.js";
import { clamp, lerp } from "../utils/utils.js";

const WATER_Y = CONFIG.water.level;

export function zoneForDistance(d) {
  if (d <= CONFIG.zones.shallowMax) return "shallow";
  if (d <= CONFIG.zones.midMax) return "mid";
  return "deep";
}

export class Bobber {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.mode = "hidden"; // hidden | flying | floating | retrieving
    this.montagem = "boia"; // boia | fundo | artificial
    this.coluna = "sup"; // isca artificial: sup (superfície), meia ou fundo
    this.velIsca = 0; // velocidade da isca artificial sendo recolhida (m/s)
    this.toqueT = 0;
    this.vel = new THREE.Vector3();
    this.playerSpot = new THREE.Vector3();
    this.floatT = 0;
    this.flightT = 0;
    this.dip = 0;
    this.dipTarget = 0;
    this.rippleTimer = 0;
    this.group = this.build();
    this.group.visible = false;
    scene.add(this.group);
  }

  build() {
    const g = new THREE.Group();
    const bottom = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.35 })
    );
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.35 })
    );
    top.position.y = 0.07;
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6),
      new THREE.MeshStandardMaterial({ color: 0xe2b53b, roughness: 0.4 })
    );
    stick.position.y = 0.2;
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffd24d, emissive: 0xffaa00, emissiveIntensity: 0.5, roughness: 0.3,
      })
    );
    tip.position.y = 0.3;
    this.visBoia = new THREE.Group();
    this.visBoia.add(bottom, top, stick, tip);
    // chumbada oliva: some na água (fica no fundo)
    this.visChumbo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.6, roughness: 0.4 }));
    this.visChumbo.scale.set(1, 1.5, 1);
    // isca artificial: corpo, cabeça e garatéias
    this.visIsca = new THREE.Group();
    this.iscaCorpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 4, 10), new THREE.MeshStandardMaterial({ color: 0xf2f2ea, roughness: 0.3, metalness: 0.2 }));
    this.iscaCorpo.rotation.x = Math.PI / 2;
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd23a2a, roughness: 0.3 }));
    cabeca.position.z = -0.06;
    this.visIsca.add(this.iscaCorpo, cabeca);
    g.add(this.visBoia, this.visChumbo, this.visIsca);
    this.setMontagem("boia");
    return g;
  }

  /** Troca o que vai na ponta da linha. coluna: altura em que a isca artificial trabalha. */
  setMontagem(montagem, coluna = "sup", corIsca = null) {
    this.montagem = montagem;
    this.coluna = coluna;
    if (!this.visBoia) return;
    this.visBoia.visible = montagem === "boia";
    this.visChumbo.visible = montagem === "fundo";
    this.visIsca.visible = montagem === "artificial";
    if (corIsca !== null) this.iscaCorpo.material.color.setHex(corIsca);
  }

  /** Isca artificial: recolher (0 a 1 da velocidade do molinete). */
  recolher(dt, forca) {
    if (this.mode !== "floating" || this.montagem !== "artificial") return;
    const alvo = forca * 1.6; // recolhimento de isca artificial: ~1,6 m/s, como na vida real
    this.velIsca = lerp(this.velIsca, alvo, 1 - Math.exp(-6 * dt));
  }

  /** Isca artificial: um toque de vara (a zara "anda", a meia-água dá uma arrancadinha). */
  toque() {
    if (this.mode !== "floating" || this.montagem !== "artificial") return;
    this.velIsca += this.coluna === "sup" ? 1.8 : 1.3;
    this.toqueT = 0.25;
    if (this.coluna === "sup") this.effects.splash(this.pos, 0.35);
    else this.effects.ripple(this.pos, 1.2, 0.6);
  }

  get pos() {
    return this.group.position;
  }

  get distanceFromPlayer() {
    const dx = this.pos.x - this.playerSpot.x;
    const dz = this.pos.z - this.playerSpot.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  launch(origin, velocity, playerSpot) {
    this.playerSpot.copy(playerSpot);
    this.group.position.copy(origin);
    this.vel.copy(velocity);
    this.mode = "flying";
    this.flightT = 0;
    this.dip = 0;
    this.dipTarget = 0;
    this.group.visible = true;
  }

  setDip(target) {
    this.dipTarget = target;
  }

  startRetrieve() {
    if (this.mode === "floating") this.mode = "retrieving";
  }

  hide() {
    this.mode = "hidden";
    this.group.visible = false;
    this.dip = 0;
    this.dipTarget = 0;
  }

  land() {
    this.group.position.y = WATER_Y;
    this.mode = "floating";
    this.velIsca = 0;
    this.afundou = 0;
    this.floatT = 0;
    const speed = this.vel.length();
    const d = this.distanceFromPlayer;
    this.effects.splash(this.pos, clamp(speed / 12, 0.6, 1.5));
    this.effects.ripple(this.pos, 3.2, 1.4);
    events.emit("bobber:landed", { distance: d, zone: zoneForDistance(d), pos: this.pos.clone() });
  }

  update(dt) {
    switch (this.mode) {
      case "flying": {
        this.flightT += dt;
        this.vel.y -= CONFIG.cast.gravity * dt;
        this.group.position.addScaledVector(this.vel, dt);
        this.group.rotation.x += dt * 6;
        if (this.group.position.y <= WATER_Y + 0.02 || this.flightT > 6) this.land();
        break;
      }
      case "floating": {
        this.floatT += dt;
        if (this.montagem === "fundo") {
          // a chumbada desce até o fundo e fica lá (a mordida aparece na ponta da vara)
          this.afundou = Math.min(1, this.afundou + dt * 0.8);
          this.group.position.y = WATER_Y - 0.2 - this.afundou * 1.6;
          if (this.afundou < 1 && Math.random() < dt * 8) this.effects.ripple(this.pos, 0.6, 0.4);
          break;
        }
        if (this.montagem === "artificial") {
          // a isca vem na direção do pescador enquanto ele recolhe; parada, só balança
          const dir = this._dir || (this._dir = new THREE.Vector3());
          dir.subVectors(this.playerSpot, this.pos);
          dir.y = 0;
          const dist = dir.length();
          if (dist < 2.4) {
            this.hide();
            events.emit("bobber:retrieved");
            return;
          }
          dir.normalize();
          this.velIsca *= Math.exp(-(this.toqueT > 0 ? 1.5 : 3) * dt);
          this.toqueT -= dt;
          this.group.position.addScaledVector(dir, this.velIsca * dt);
          const prof = this.coluna === "sup" ? -0.01 : this.coluna === "meia" ? 0.25 : 0.9;
          this.group.position.y = WATER_Y - prof + Math.sin(this.floatT * 3) * 0.01;
          // zara anda em zigue-zague; as outras nadam reto, balançando
          const ziguezague = this.coluna === "sup" ? Math.sin(this.floatT * 9) * Math.min(1, this.velIsca) * 0.6 : Math.sin(this.floatT * 14) * 0.15;
          this.group.rotation.set(0, Math.atan2(dir.x, dir.z) + ziguezague, 0);
          this.rippleTimer -= dt;
          if (this.velIsca > 0.4 && this.coluna !== "fundo" && this.rippleTimer <= 0) {
            this.effects.ripple(this.pos, this.coluna === "sup" ? 1.0 : 0.6, 0.5);
            this.rippleTimer = 0.18;
          }
          break;
        }
        // dip eases toward its target so bites read as a sharp-but-smooth plunge
        this.dip = lerp(this.dip, this.dipTarget, 1 - Math.exp(-14 * dt));
        this.group.position.y = WATER_Y + 0.05 + Math.sin(this.floatT * 2.1) * 0.035 - this.dip;
        this.group.rotation.x = Math.sin(this.floatT * 1.7) * 0.12 + this.dip * 0.8;
        this.group.rotation.z = Math.cos(this.floatT * 1.4) * 0.1;
        if (this.dipTarget > 0.05 && Math.random() < dt * 6) {
          this.effects.ripple(this.pos, 1.6, 0.8);
        }
        break;
      }
      case "retrieving": {
        const dir = new THREE.Vector3().subVectors(this.playerSpot, this.pos);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 2.4) {
          this.hide();
          events.emit("bobber:retrieved");
          return;
        }
        dir.normalize();
        this.group.position.addScaledVector(dir, CONFIG.bite.retrieveSpeed * dt);
        this.floatT += dt;
        this.group.position.y = WATER_Y + 0.04 + Math.sin(this.floatT * 9) * 0.03;
        this.rippleTimer -= dt;
        if (this.rippleTimer <= 0) {
          this.effects.ripple(this.pos, 1.2, 0.7);
          this.rippleTimer = 0.16;
        }
        break;
      }
      default:
        break;
    }
  }
}
