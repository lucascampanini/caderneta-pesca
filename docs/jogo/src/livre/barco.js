// [livre] Física simples da voadeira, no referencial do rio (metros; rumo ψ com direção (sen ψ, −cos ψ)).
// W/S (ou ↑/↓) acelera e freia/dá ré, A/D (←/→) vira, Shift = motor no máximo. A correnteza empurra o
// barco rio abaixo quando ele não está ancorado. O barco não atravessa terra nem banco de areia.

const DIR = (psi) => [Math.sin(psi), -Math.cos(psi)];

export class Barco {
  constructor(dados) {
    this.dados = dados;
    this.x = 0;
    this.z = 0;
    this.psi = 0;
    this.v = 0; // m/s na direção da proa
    this.vx = 0; // velocidade total no chão (com a correnteza), para efeitos
    this.vz = 0;
    this.giroV = 0; // velocidade de giro atual (rad/s), para inclinar o casco
    this.corrente = 0.6; // m/s
    this.entrada = { acel: 0, giro: 0, turbo: false };
    this.indice = -1; // dica para a busca na linha central
    this.batida = 0; // >0 logo depois de bater na margem
    this.s = 0; // posição ao longo do rio (m)
    this._g = [0, 0];
  }

  colocar(x, z, psi) {
    this.x = x;
    this.z = z;
    this.psi = psi;
    this.v = 0;
    this.indice = -1;
    const p = this.dados.maisPerto(x, z);
    this.indice = p.i;
    this.s = p.s;
  }

  /** Livre de terra num ponto? (margem de segurança em metros) */
  livre(x, z, folga = 1.6) {
    const D = this.dados;
    if (!D.dentroDaGrade(x, z, 30)) return false;
    return D.sdf(x, z) < -folga && D.areia(x, z) < 0.55;
  }

  /**
   * Avança a simulação. Devolve "batida" quando encostou na margem neste passo.
   * @param {number} dt
   * @param {boolean} ancorado
   */
  passo(dt, ancorado) {
    const D = this.dados;
    const e = this.entrada;
    const vmax = e.turbo ? 15 : 10;
    // motor
    if (e.acel > 0) this.v += (this.v < 0 ? 6 : 3.0) * e.acel * dt;
    else if (e.acel < 0) this.v += (this.v > 0 ? -6 : -1.6) * -e.acel * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), (0.6 + Math.abs(this.v) * 0.12) * dt);
    if (this.v > vmax) this.v -= Math.min(this.v - vmax, 4 * dt);
    this.v = Math.max(-2.5, this.v);
    // leme: gira mais com o barco andando
    const giroAlvo = e.giro * (0.32 + Math.min(1, Math.abs(this.v) / 5) * 0.5) * (this.v < -0.2 ? -1 : 1);
    this.giroV += (giroAlvo - this.giroV) * Math.min(1, dt * 4);
    this.psi += this.giroV * dt;
    // correnteza: tangente da linha central (sentido rio abaixo)
    const p = D.maisPerto(this.x, this.z, this.indice);
    this.indice = p.i;
    this.s = p.s;
    let cx = 0, cz = 0;
    if (!ancorado) {
      // mais forte no meio do canal, fraca na beira e nos remansos
      const d = D.sdf(this.x, this.z);
      const k = Math.min(1, Math.max(0.15, -d / 12));
      cx = p.tx * this.corrente * k;
      cz = p.tz * this.corrente * k;
    }
    const [dx, dz] = DIR(this.psi);
    const nx = this.x + (dx * this.v + cx) * dt;
    const nz = this.z + (dz * this.v + cz) * dt;
    // colisão: centro e proa
    const proaX = nx + dx * 2.6 * Math.sign(this.v || 1), proaZ = nz + dz * 2.6 * Math.sign(this.v || 1);
    let bateu = false;
    if (this.livre(nx, nz, 1.6) && this.livre(proaX, proaZ, 0.4)) {
      this.x = nx;
      this.z = nz;
    } else {
      bateu = Math.abs(this.v) > 1.2;
      // empurra de volta para a água pelo gradiente e amortece
      const g = D.gradSdf(this.x, this.z, this._g);
      const l = Math.hypot(g[0], g[1]) || 1;
      this.x -= (g[0] / l) * 0.4;
      this.z -= (g[1] / l) * 0.4;
      // desliza ao longo da margem: tira a componente que entra na terra
      const vn = (dx * g[0] + dz * g[1]) / l;
      if (vn > 0) this.v *= 0.35;
      else this.v *= 0.92;
      if (!this.livre(this.x, this.z, 0.6)) {
        // ainda preso: volta para o canal pela linha central
        this.x += (p.x - this.x) * 0.08;
        this.z += (p.z - this.z) * 0.08;
      }
    }
    this.vx = dx * this.v + cx;
    this.vz = dz * this.v + cz;
    this.batida = Math.max(0, this.batida - dt);
    if (bateu && this.batida <= 0) {
      this.batida = 1.2;
      return "batida";
    }
    return null;
  }

  /** Piloto automático: segue a linha central até `alvoS` (m). Escreve a entrada dos controles. */
  pilotar(alvoS, vel = 9) {
    const D = this.dados;
    const sentido = alvoS >= this.s ? 1 : -1;
    const ahead = D.emS(this.s + sentido * Math.max(25, Math.abs(this.v) * 3.2));
    const desejado = Math.atan2(ahead.x - this.x, -(ahead.z - this.z));
    let erro = desejado - this.psi;
    while (erro > Math.PI) erro -= 2 * Math.PI;
    while (erro < -Math.PI) erro += 2 * Math.PI;
    this.entrada.giro = Math.max(-1, Math.min(1, erro * 2.2));
    const falta = Math.abs(alvoS - this.s);
    const alvoV = Math.min(vel, Math.max(1.5, falta / 6)) * (Math.abs(erro) > 0.9 ? 0.4 : 1);
    this.entrada.acel = Math.max(-1, Math.min(1, (alvoV - this.v) * 0.8));
    this.entrada.turbo = vel > 10;
    return falta < 15;
  }
}
