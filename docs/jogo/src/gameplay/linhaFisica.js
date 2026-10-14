// Linha de pesca como corda de verdade (Verlet com restrições de distância, estilo PBD):
// presa na ponta da vara e na boia/peixe, faz barriga pela gravidade e pelo vento quando frouxa,
// fica reta sob tensão, deita na superfície da água quando parada e afunda com arrasto até o peixe.

import * as THREE from "three";
import { CONFIG } from "../data/config.js";

const WATER_Y = CONFIG.water.level;
const G = 9.8;

export class LinhaFisica {
  constructor(n = 44) {
    this.n = n;
    this.p = new Float32Array(n * 3); // posição atual
    this.q = new Float32Array(n * 3); // posição anterior (Verlet)
    this.comprimento = 1;
    this.iniciada = false;
    this.vento = new THREE.Vector3(0.6, 0, 0.2);
    this.afunda = 0.12; // fração da gravidade que sobra dentro d'água (mono afunda devagar)
    this.boia = true; // a linha parada fica deitada na superfície
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this.t = 0;
  }

  /** Estica a linha reta de a até b (no começo, ou quando o alvo pula longe). */
  reset(a, b) {
    for (let i = 0; i < this.n; i++) {
      const k = i / (this.n - 1);
      const o = i * 3;
      this.p[o] = this.q[o] = a.x + (b.x - a.x) * k;
      this.p[o + 1] = this.q[o + 1] = a.y + (b.y - a.y) * k;
      this.p[o + 2] = this.q[o + 2] = a.z + (b.z - a.z) * k;
    }
    this.comprimento = Math.max(this.comprimento, a.distanceTo(b));
    this.iniciada = true;
    this._a.copy(a);
    this._b.copy(b);
  }

  /**
   * Avança a simulação.
   * @param {number} dt
   * @param {Vector3} a ponta da vara
   * @param {Vector3} b boia ou boca do peixe
   */
  step(dt, a, b) {
    if (!this.iniciada || this._b.distanceToSquared(b) > 36 || this._a.distanceToSquared(a) > 4) this.reset(a, b);
    this._a.copy(a);
    this._b.copy(b);
    this.t += dt;
    const n = this.n, p = this.p, q = this.q;
    const sub = 2;
    const h = Math.min(dt, 1 / 30) / sub;
    const seg = this.comprimento / (n - 1);
    // vento com rajadas: empurra só o que está no ar
    const rajada = 0.65 + 0.35 * Math.sin(this.t * 0.7) + 0.2 * Math.sin(this.t * 2.3 + 1.1);
    const vx = this.vento.x * rajada, vz = this.vento.z * rajada;
    for (let s = 0; s < sub; s++) {
      for (let i = 1; i < n - 1; i++) {
        const o = i * 3;
        const x = p[o], y = p[o + 1], z = p[o + 2];
        const naAgua = y < WATER_Y;
        // fio leve: o ar freia bastante (sem isso a linha chicoteia como corda pesada)
        const amort = naAgua ? 0.95 : 0.975;
        let ax = vx, ay = -G, az = vz;
        if (naAgua) {
          ax = 0; az = 0;
          ay = -G * this.afunda;
        }
        // velocidade limitada: um tranco não pode jogar o fio para o céu
        let ux = (x - q[o]) * amort, uy = (y - q[o + 1]) * amort, uz = (z - q[o + 2]) * amort;
        const u2 = ux * ux + uy * uy + uz * uz, umax = 12 * h;
        if (u2 > umax * umax) {
          const k = umax / Math.sqrt(u2);
          ux *= k; uy *= k; uz *= k;
        }
        p[o] = x + ux + ax * h * h;
        p[o + 1] = y + uy + ay * h * h;
        p[o + 2] = z + uz + az * h * h;
        q[o] = x; q[o + 1] = y; q[o + 2] = z;
        // linha parada: a tensão superficial segura o fio deitado na água
        if (this.boia && p[o + 1] < WATER_Y + 0.004 && p[o + 1] > WATER_Y - 0.25) {
          p[o + 1] = WATER_Y + 0.004;
          q[o + 1] = p[o + 1];
          // atrito com a água: quase não escorrega de lado
          p[o] = q[o] + (p[o] - q[o]) * 0.6;
          p[o + 2] = q[o + 2] + (p[o + 2] - q[o + 2]) * 0.6;
        }
      }
      // restrições de distância (ida e volta, para convergir dos dois lados)
      for (let it = 0; it < 14; it++) {
        p[0] = a.x; p[1] = a.y; p[2] = a.z;
        const e = (n - 1) * 3;
        p[e] = b.x; p[e + 1] = b.y; p[e + 2] = b.z;
        const ida = it % 2 === 0;
        for (let k = 0; k < n - 1; k++) {
          const i = ida ? k : n - 2 - k;
          const o = i * 3, o2 = o + 3;
          const dx = p[o2] - p[o], dy = p[o2 + 1] - p[o + 1], dz = p[o2 + 2] - p[o + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          // corda: só resiste a esticar; frouxa, fica livre
          if (d <= seg) continue;
          const corr = (d - seg) / d;
          const wa = i === 0 ? 0 : 0.5, wb = i + 1 === n - 1 ? 0 : 0.5;
          const wsum = wa + wb || 1;
          p[o] += dx * corr * (wa / wsum);
          p[o + 1] += dy * corr * (wa / wsum);
          p[o + 2] += dz * corr * (wa / wsum);
          p[o2] -= dx * corr * (wb / wsum);
          p[o2 + 1] -= dy * corr * (wb / wsum);
          p[o2 + 2] -= dz * corr * (wb / wsum);
        }
      }
      // amarras de longo alcance (LRA): nenhum nó pode estar mais longe das pontas do que o fio
      // permite. Isso tira a "borracha" que o Verlet tem em corda comprida e deixa a linha reta sob tensão.
      for (let i = 1; i < n - 1; i++) {
        const o = i * 3;
        for (let lado = 0; lado < 2; lado++) {
          const c = lado === 0 ? a : b;
          const max = (lado === 0 ? i : n - 1 - i) * seg;
          const dx = p[o] - c.x, dy = p[o + 1] - c.y, dz = p[o + 2] - c.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d > max && d > 1e-6) {
            const k = max / d;
            p[o] = c.x + dx * k;
            p[o + 1] = c.y + dy * k;
            p[o + 2] = c.z + dz * k;
          }
        }
      }
    }
  }

  /** Ponto i da linha. */
  ponto(i, out) {
    const o = i * 3;
    return out.set(this.p[o], this.p[o + 1], this.p[o + 2]);
  }

  /** Comprimento real do desenho atual (soma dos segmentos). */
  medir() {
    let s = 0;
    const p = this.p;
    for (let i = 0; i < this.n - 1; i++) {
      const o = i * 3;
      s += Math.hypot(p[o + 3] - p[o], p[o + 4] - p[o + 1], p[o + 5] - p[o + 2]);
    }
    return s;
  }

  /**
   * Onde a linha corta a superfície vindo do ar (a primeira descida abaixo do nível da água),
   * ou null se não entra na água. Devolve também a direção horizontal da linha ali.
   */
  entradaNaAgua(out, dir) {
    const p = this.p;
    for (let i = 0; i < this.n - 1; i++) {
      const o = i * 3;
      const y0 = p[o + 1] - WATER_Y, y1 = p[o + 4] - WATER_Y;
      if (y0 > 0.0 && y1 <= 0.0) {
        const k = y0 / (y0 - y1 || 1e-6);
        out.set(p[o] + (p[o + 3] - p[o]) * k, WATER_Y, p[o + 2] + (p[o + 5] - p[o + 2]) * k);
        if (dir) dir.set(p[o + 3] - p[o], 0, p[o + 5] - p[o + 2]).normalize();
        return out;
      }
    }
    return null;
  }
}
