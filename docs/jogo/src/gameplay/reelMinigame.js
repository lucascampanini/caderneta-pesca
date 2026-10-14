// The reel-in fight: tension vs catch-progress with telegraphed surges, fish
// fatigue, gear modifiers, a wandering fight point on the water, leaping fish
// during surges, and the final landing arc into the boat/dock.
// O peixe existe de verdade debaixo d'água: nada fundo no começo, sobe perto do fim (aparece escuro
// sob a superfície), rabeia, vira de lado quando cansa, deixa esteira nas arrancadas, pula em câmera
// lenta e sai da água pingando no embarque. A linha se prende na boca dele (lineEnd).

import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { events } from "../state/gameState.js";
import { FISH_BY_ID } from "../data/fishData.js";
import { createFishMesh, animarPeixe, bocaDoPeixe, descartarPeixe } from "../fish/fishFactory.js";
import { clamp, lerp, randRange } from "../utils/utils.js";

const WATER_Y = CONFIG.water.level;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// diferença de ângulo em (-π, π]
const difAng = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class ReelFight {
  constructor(scene, effects, audio) {
    this.scene = scene;
    this.effects = effects;
    this.audio = audio;
    this.active = false;
    this.phase = "idle"; // idle | fight | landing
    this.fishPoint = new THREE.Vector3();
    this.playerSpot = new THREE.Vector3();
    this.fishMesh = null;
    this.lineEnd = new THREE.Vector3(); // boca do peixe: onde a linha se prende
    this.escalaTempo = 1; // câmera lenta nos pulos (o main multiplica o dt do mundo)
    this.destaque = 0; // 0 a 1: momento dramático (pulo/embarque), para a câmera aproximar
    this._prev = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  /**
   * @param {object} fish   rolled fish instance
   * @param {Vector3} startPos bobber position when hooked
   * @param {Vector3} playerSpot
   * @param {object} stats { reelSpeed, lineStrength, control }
   */
  start(fish, startPos, playerSpot, stats) {
    this.fish = fish;
    this.stats = stats;
    this.playerSpot.copy(playerSpot);
    this.active = true;
    this.phase = "fight";
    this.t = 0;
    this.reeling = false;
    this.tension = CONFIG.reel.startTension;
    this.progress = CONFIG.reel.startProgress;

    const dx = startPos.x - playerSpot.x;
    const dz = startPos.z - playerSpot.z;
    this.startDist = Math.max(4, Math.sqrt(dx * dx + dz * dz));
    this.angle = Math.atan2(dx, dz); // angle around player, z-forward convention
    this.angleDrift = randRange(0.2, 0.5) * (Math.random() < 0.5 ? -1 : 1);
    this.fishPoint.copy(startPos);
    this.fishPoint.y = WATER_Y;
    this._prev.copy(this.fishPoint);

    this.surgeState = "calm"; // calm | telegraph | active
    this.surgeTimer = randRange(...fish.fight.surgeEvery) * 0.7; // first surge comes a bit early
    this.surgeT = 0;
    this.splashTimer = 0;
    this.esteiraT = 0;

    // o peixe sorteado, de verdade, nadando debaixo d'água
    this.fishMesh = createFishMesh(FISH_BY_ID[fish.speciesId], fish.sizeCm);
    this.fishMesh.visible = false;
    this.scene.add(this.fishMesh);
    this.comp = clamp(fish.sizeCm / 100, 0.16, 3.6);
    this.prof = 0.6; // fisgado perto da boia, logo mergulha
    this.rumo = Math.atan2(-dz, dx); // começa fugindo do pescador
    this.rumoVel = 0;
    this.rolagem = 0;
    this.velPeixe = 0;
    this.jump = null;
    this.landing = null;
    this.escalaTempo = 1;
    this.destaque = 0;
    this.falha = null; // motivo de escape decidido numa arrancada (dente sem aço, anzol que abre)
    this.prevProgress = this.progress;
    this.saindo = 0; // 0 a 1: velocidade com que o peixe tira linha do carretel (freio patinando)
    this.cabecadaT = randRange(1.2, 3);
    this.atualizaPeixe(0.016);
  }

  setReeling(on) {
    if (this.phase === "fight") this.reeling = on;
  }

  end() {
    this.active = false;
    this.phase = "idle";
    this.reeling = false;
    this.escalaTempo = 1;
    this.destaque = 0;
    if (this.fishMesh) {
      this.scene.remove(this.fishMesh);
      descartarPeixe(this.fishMesh);
      this.fishMesh = null;
    }
  }

  get tired() {
    return this.t > this.fish.fight.stamina;
  }

  // ---------- surge cycle ----------

  updateSurge(dt) {
    const f = this.fish.fight;
    if (this.surgeState === "calm") {
      this.surgeTimer -= dt;
      if (this.surgeTimer <= 0) {
        this.surgeState = "telegraph";
        this.surgeT = CONFIG.reel.telegraphTime;
        this.audio.play("surgeWarn");
        this.tryJump();
      }
    } else if (this.surgeState === "telegraph") {
      this.surgeT -= dt;
      if (this.surgeT <= 0) {
        this.surgeState = "active";
        this.surgeT = randRange(...CONFIG.reel.surgeDuration);
        const av = this.stats.av;
        if (av && !this.fish.tutorial) {
          if (av.dentes && Math.random() < 0.45) this.falha = `Cortou a linha com os dentes! ${av.nome} pede empate de aço.`;
          else if (av.anzolPequeno && Math.random() < 0.3) this.falha = `O anzol abriu na arrancada: pequeno demais para ${av.nome}.`;
        }
      }
    } else if (this.surgeState === "active") {
      this.surgeT -= dt;
      if (this.surgeT <= 0) {
        this.surgeState = "calm";
        const spacing = this.tired ? CONFIG.reel.tiredSurgeSpacing : 1;
        this.surgeTimer = randRange(...f.surgeEvery) * spacing;
      }
    }
  }

  tryJump() {
    if (this.fish.sizeCm < 30 || Math.random() > 0.75) {
      // não pulou: rebojo na superfície, mais forte se o peixe está raso
      this.effects.splash(this.fishPoint, this.prof < 1 ? 0.9 : 0.5);
      return;
    }
    const h = clamp(this.fish.sizeCm / 110, 0.5, 2.2);
    this.jump = { t: 0, dur: 0.6 + h * 0.18, h, from: this.fishPoint.clone(), avanco: this.comp * 1.6 + 0.6, pingoT: 0 };
    this.effects.splash(this.fishPoint, 1.3);
    this.audio.play("splash", { strength: 0.8 });
  }

  updateJump(dt) {
    const J = this.jump;
    if (!J) return;
    J.t += dt;
    const k = J.t / J.dur;
    const dir = this._dir.set(Math.cos(this.rumo), 0, -Math.sin(this.rumo));
    if (k >= 1) {
      const p = this._v.copy(J.from).addScaledVector(dir, J.avanco);
      p.y = WATER_Y;
      this.effects.splash(p, 1.4);
      this.effects.ripple(p, 2.6, 1.1, 1, 0, 0.8);
      this.audio.play("splash", { strength: 1.1 });
      this.fishPoint.x = p.x;
      this.fishPoint.z = p.z;
      // a briga continua de onde ele caiu
      this.angle = Math.atan2(p.x - this.playerSpot.x, p.z - this.playerSpot.z);
      this._prev.copy(this.fishPoint);
      this.prof = 0.35;
      this.jump = null;
      this.escalaTempo = 1;
      return;
    }
    // câmera lenta curta no alto do pulo
    this.escalaTempo = k > 0.18 && k < 0.72 ? 0.32 : 1;
    this.destaque = Math.max(this.destaque, Math.sin(k * Math.PI));
    const arc = Math.sin(k * Math.PI) * J.h;
    const m = this.fishMesh;
    m.visible = true;
    m.castShadow = true;
    m.position.copy(J.from).addScaledVector(dir, J.avanco * k);
    m.position.y = WATER_Y - 0.25 * this.comp + arc + this.comp * 0.25;
    m.rotation.y = this.rumo;
    m.rotation.x = Math.sin(J.t * 9) * 0.35; // se contorce no ar
    m.rotation.z = lerp(0.95, -1.15, k); // sai de nariz para cima, entra de cabeça
    animarPeixe(m, dt, { batida: 7, amp: 0.13, curva: Math.sin(J.t * 11) * 0.22, molhado: 1 });
    J.pingoT -= dt;
    if (J.pingoT <= 0) {
      this.effects.pingar(m.position, 3, this.comp * 0.35);
      J.pingoT = 0.03;
    }
  }

  // ---------- peixe debaixo d'água ----------

  /** Posição, profundidade, rumo e nado do peixe durante a briga. */
  atualizaPeixe(dt) {
    const m = this.fishMesh;
    if (!m || this.jump) return;
    const surging = this.surgeState === "active";
    const perto = smooth(0.4, 0.86, this.progress / 100);
    const cansado = this.tired;
    // fundo no começo; perto do fim sobe até quase a superfície; na arrancada mergulha
    let alvo = lerp(2.5, 0.32, perto) + (surging ? 0.7 * (1 - perto * 0.6) : 0) - (cansado ? 0.12 : 0);
    if (this.fish.sizeCm < 25) alvo = Math.min(alvo, 1.6);
    this.prof = lerp(this.prof, Math.max(0.22, alvo), 1 - Math.exp(-1.4 * dt));

    // velocidade na superfície -> rumo do corpo
    const v = this._v.subVectors(this.fishPoint, this._prev);
    const vel = dt > 0 ? v.length() / dt : 0;
    this._prev.copy(this.fishPoint);
    this.velPeixe = lerp(this.velPeixe, vel, 1 - Math.exp(-5 * dt));
    // radial: positivo = afastando do pescador
    const rx = this.fishPoint.x - this.playerSpot.x, rz = this.fishPoint.z - this.playerSpot.z;
    const rl = Math.hypot(rx, rz) || 1;
    let alvoRumo = this.rumo;
    if (vel > 0.15) {
      const radial = (v.x * rx + v.z * rz) / (rl * (v.length() || 1));
      if (radial < -0.3 && !surging) {
        // sendo arrastado pela boca: a cabeça aponta para o pescador, o corpo de lado
        alvoRumo = Math.atan2(rz / rl, -rx / rl) + Math.sign(this.angleDrift) * 0.5;
      } else alvoRumo = Math.atan2(-v.z, v.x);
    }
    const da = difAng(alvoRumo, this.rumo);
    const giro = clamp(da * 3, -3, 3);
    this.rumoVel = lerp(this.rumoVel, giro, 1 - Math.exp(-6 * dt));
    this.rumo += this.rumoVel * dt;

    // de lado quando cansa (mostra o flanco), balançando
    const deLado = cansado && this.progress > 62 ? 1.25 + Math.sin(this.t * 1.7) * 0.2 : Math.sin(this.t * 2.3) * 0.12;
    this.rolagem = lerp(this.rolagem, -deLado, 1 - Math.exp(-2 * dt));

    m.visible = this.prof < 2.3;
    m.castShadow = false;
    m.position.set(this.fishPoint.x, WATER_Y - this.prof, this.fishPoint.z);
    m.rotation.y = this.rumo;
    m.rotation.x = this.rolagem;
    m.rotation.z = surging ? -0.12 : Math.sin(this.t * 0.9) * 0.06;
    const forca = cansado ? 0.5 : 1;
    animarPeixe(m, dt, {
      batida: (1.3 + Math.min(this.velPeixe, 4) * 0.9 + (surging ? 3.2 : 0)) * forca + (cansado ? 0.4 : 0),
      amp: (0.045 + Math.min(this.velPeixe / 4, 1) * 0.04 + (surging ? 0.05 : 0)) * (cansado ? 0.8 : 1),
      curva: clamp(-this.rumoVel * 0.06, -0.25, 0.25),
    });
  }

  // ---------- main update ----------

  update(dt) {
    if (!this.active) return;
    this.destaque = Math.max(0, this.destaque - dt * 1.5);

    if (this.phase === "landing") {
      this.updateLanding(dt);
      return;
    }

    const R = CONFIG.reel;
    const f = this.fish.fight;
    this.t += dt;

    const strength = f.strength * (this.tired ? R.tiredStrengthMult : 1) * (this.fish.tutorial ? 0.55 : 1);
    const { reelSpeed, lineStrength, control } = this.stats;

    this.updateSurge(dt);
    if (this.falha) {
      const fish = this.fish, reason = this.falha;
      this.end();
      events.emit("fight:escape", { fish, reason, gear: true });
      return;
    }
    this.updateJump(dt);
    const surging = this.surgeState === "active";

    if (this.reeling) {
      // rod control tames how vicious a surge is allowed to get
      const surgeMult = surging ? 1 + (R.surgeReelMult - 1) / control : 1;
      this.tension += dt * R.tensionGain * strength * surgeMult / lineStrength;
      this.progress += dt * (R.reelRate * reelSpeed / f.heft) * (surging ? 0.55 : 1);
    } else {
      this.tension -= dt * R.tensionRecover * (surging ? 0.45 : 1);
      if (surging) this.tension += dt * R.surgeRestGain * strength / lineStrength;
      this.progress -= dt * R.escapeRate * strength * (surging ? 1.5 : 0.9);
    }

    // fail states checked on raw values before clamping for display
    if (this.tension >= 100) {
      const fish = this.fish;
      this.end();
      events.emit("fight:snap", { fish });
      return;
    }
    if (this.progress <= 0 && this.t > R.escapeGraceTime) {
      const fish = this.fish;
      this.end();
      events.emit("fight:escape", { fish, reason: "Escapou do anzol e foi embora..." });
      return;
    }
    if (this.t > R.maxFightTime) {
      const fish = this.fish;
      this.end();
      events.emit("fight:escape", { fish, reason: "Ele cansou você e se soltou..." });
      return;
    }

    this.tension = clamp(this.tension, 0, 100);

    // linha saindo: quando a captura recua, o peixe está tirando linha; na arrancada o freio patina forte
    const recuo = Math.max(0, (this.prevProgress - this.progress) / dt);
    this.prevProgress = this.progress;
    const alvoSaida = clamp(recuo / 9, 0, 1) * 0.8 + (surging ? 0.55 + 0.45 * clamp(strength / 1.6, 0, 1) : 0);
    this.saindo = lerp(this.saindo, clamp(alvoSaida, 0, 1), 1 - Math.exp(-10 * dt));

    // cabeçadas: o peixe sacode a cabeça e a ponta da vara treme
    this.cabecadaT -= dt;
    if (this.cabecadaT <= 0 && !surging) {
      this.cabecadaT = randRange(1.1, 3.2) / Math.max(0.6, f.strength);
      events.emit("fight:headshake", { forca: clamp(0.4 + this.fish.sizeNorm * 0.6, 0.4, 1) });
    }

    if (this.progress >= 100) {
      this.beginLanding();
      return;
    }

    // fight point wanders around the player and closes in with progress
    if (!this.jump) {
      const dist = lerp(this.startDist, R.minFishDist, this.progress / 100);
      this.angle += Math.sin(this.t * 0.7) * this.angleDrift * dt;
      if (surging) this.angle += Math.sin(this.t * 6) * 1.1 * dt;
      this.fishPoint.set(
        this.playerSpot.x + Math.sin(this.angle) * dist,
        WATER_Y,
        this.playerSpot.z + Math.cos(this.angle) * dist
      );
    }
    this.atualizaPeixe(dt);

    // superfície: rebojo onde o peixe está, mais forte quando ele está raso; esteira nas arrancadas
    const raso = 1 - smooth(0.6, 2.0, this.prof);
    this.splashTimer -= dt;
    if (this.splashTimer <= 0 && !this.jump) {
      // rebojo fraco: quando o peixe está raso ele mesmo aparece, a marola não pode escondê-lo
      this.effects.ripple(this.fishPoint, (surging ? 1.5 : 0.9) + raso * 0.3, 1.0, 1, 0, surging ? 0.3 : 0.16 + raso * 0.08);
      if ((surging && raso > 0.3) || (raso > 0.75 && Math.random() < 0.2)) this.effects.splash(this.fishPoint, 0.25 + raso * 0.3);
      this.splashTimer = surging ? 0.2 : 0.45;
    }
    if (surging && raso > 0.25 && this.velPeixe > 0.8 && !this.jump) {
      this.esteiraT -= dt;
      if (this.esteiraT <= 0) {
        this.effects.esteira(this.fishPoint, this._dir.set(Math.cos(this.rumo), 0, -Math.sin(this.rumo)), raso);
        this.esteiraT = 0.09;
      }
    }

    this.prenderLinha();
    events.emit("fight:update", {
      tension: this.tension,
      progress: clamp(this.progress, 0, 100),
      surge: this.surgeState,
      time: this.t,
      saindo: this.saindo,
      reeling: this.reeling,
    });
  }

  /** A linha vai até a boca do peixe (aparente, com a refração, quando debaixo d'água). */
  prenderLinha() {
    if (!this.fishMesh) return;
    bocaDoPeixe(this.fishMesh, this.lineEnd);
    if (this.lineEnd.y < WATER_Y) this.lineEnd.y = WATER_Y - (WATER_Y - this.lineEnd.y) * 0.75;
  }

  // ---------- landing ----------

  beginLanding() {
    this.phase = "landing";
    this.reeling = false;
    this.escalaTempo = 1;
    const from = this.fishPoint.clone();
    from.y = WATER_Y;
    const to = this.playerSpot.clone();
    to.y += 1.1;
    // o peixe é içado: sobe na vertical pendurado pela boca, depois balança até o pescador
    const alto = from.clone().lerp(to, 0.15);
    alto.y = WATER_Y + 0.4 + this.comp * 0.6;
    const mid = alto.clone().lerp(to, 0.5);
    mid.y = Math.max(alto.y, to.y) + 1.2;
    this.landing = { t: 0, dur: 1.35, from, alto, mid, to, pingoT: 0, saiu: false };
    this.effects.ripple(from, 3.0, 1.3, 1, 0, 0.7);
    events.emit("fight:update", { tension: 0, progress: 100, surge: "calm", landing: true });
  }

  updateLanding(dt) {
    const L = this.landing;
    L.t += dt;
    const k = clamp(L.t / L.dur, 0, 1);
    const m = this.fishMesh;
    m.visible = true;
    m.castShadow = true;
    const subida = 0.36; // fração do tempo saindo da água
    if (k < subida) {
      const a = smooth(0, 1, k / subida);
      m.position.lerpVectors(L.from, L.alto, a);
      m.position.y = lerp(WATER_Y - 0.3, L.alto.y, a);
      if (!L.saiu && m.position.y > WATER_Y - 0.05) {
        // rompe a superfície
        L.saiu = true;
        this.effects.splash(L.from, 1.5);
        this.audio.play("splash", { strength: 1.3 });
      }
    } else {
      const b = (k - subida) / (1 - subida);
      const p1 = this._v.copy(L.alto).lerp(L.mid, b);
      const p2 = this._dir.copy(L.mid).lerp(L.to, b);
      m.position.copy(p1.lerp(p2, b));
    }
    this.fishPoint.copy(m.position);
    // pendurado pela boca: nariz para cima, girando devagar e se debatendo
    m.rotation.z = lerp(m.rotation.z, 1.3, 1 - Math.exp(-6 * dt));
    m.rotation.y += dt * 1.6;
    m.rotation.x = Math.sin(L.t * 7) * 0.25;
    animarPeixe(m, dt, { batida: 4.5 - k * 2.5, amp: 0.12, curva: Math.sin(L.t * 8) * 0.28, molhado: 1 });
    this.destaque = Math.max(this.destaque, 1 - k * 0.6);
    // pingando: muito logo que sai, menos depois
    L.pingoT -= dt;
    if (L.saiu && L.pingoT <= 0) {
      this.effects.pingar(m.position, k < 0.6 ? 4 : 2, this.comp * 0.25);
      L.pingoT = 0.035;
    }
    this.prenderLinha();
    if (k >= 1) {
      const fish = this.fish;
      this.end();
      events.emit("fight:landed", { fish });
    }
  }
}
