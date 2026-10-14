// Fully procedural Web Audio sound design: no external files, every cue is
// synthesized. Each public method is safe to call even if the AudioContext
// could not be created — the game must run silently without errors.
// Sons curtos de equipamento (catraca do freio, estalo do pick-up, gota) são pré-sintetizados
// em AudioBuffers; cada voz avulsa se desconecta sozinha ao terminar (sem vazar nós).
// Ambiente do Pantanal: água batendo no trapiche, vento nas folhas, araras, aracuãs, tuiuiú
// batendo o bico e passarinhos de dia; grilos, sapos e sapo-martelo à noite; peixe pulando ao longe.

import { clamp, randRange } from "../utils/utils.js";

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.muted = false;
    this.noiseBuffer = null;
    this.ambience = null; // { nodes: [], timers: [] }
    this.ambienceProfile = null;
    this.ambienceSegment = "day";
    this.reelAccum = 0;
    this.vivos = 0; // vozes avulsas tocando agora (para conferir que nada vaza)
    this.buf = {};
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      // compressor suave na saída: freio + espirro + ambiente juntos não estouram
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 3;
      this.master.connect(this.comp).connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer(2);
      this.criarAmostras();
      if (this.ambienceProfile) this.setAmbience(this.ambienceProfile, this.ambienceSegment);
    } catch {
      this.ctx = null;
    }
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master && !this.muted) this.master.gain.value = this.volume;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  makeNoiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Sintetiza um buffer curto amostra a amostra. */
  sintetizar(seg, fn) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * seg);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = fn(i / sr, i);
    return buf;
  }

  criarAmostras() {
    const TAU = Math.PI * 2;
    // catraca do freio: estalo metálico (lingueta batendo na engrenagem), ressonâncias que morrem em ms
    this.buf.catraca = this.sintetizar(0.03, (t) => {
      const ruido = (Math.random() * 2 - 1) * Math.exp(-t * 2200) * 0.7;
      const corpo = Math.sin(TAU * 3150 * t) * Math.exp(-t * 520) * 0.5
        + Math.sin(TAU * 5230 * t + 1) * Math.exp(-t * 700) * 0.35
        + Math.sin(TAU * 7900 * t + 2) * Math.exp(-t * 900) * 0.2
        + Math.sin(TAU * 1450 * t) * Math.exp(-t * 300) * 0.18;
      return (ruido + corpo) * 0.9;
    });
    // estalo do pick-up: a alça de arame batendo no batente, com mola zunindo
    this.buf.pickup = this.sintetizar(0.12, (t) => {
      const golpe = (Math.random() * 2 - 1) * Math.exp(-t * 900);
      const mola = Math.sin(TAU * 2350 * t) * Math.exp(-t * 60) * 0.35 + Math.sin(TAU * 4100 * t) * Math.exp(-t * 90) * 0.2;
      const eco = t > 0.018 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.018) * 1400) * 0.5 : 0;
      return (golpe * 0.6 + mola + eco) * 0.8;
    });
    // gota/"ploc": bolha que ressoa subindo de tom, com baque grave
    this.buf.ploc = this.sintetizar(0.22, (t) => {
      const f = 420 + 1100 * (1 - Math.exp(-t * 45));
      const fase = TAU * (420 * t + 1100 * (t - (1 - Math.exp(-t * 45)) / 45));
      const bolha = Math.sin(fase) * Math.exp(-t * 26) * (f > 0 ? 0.55 : 0);
      const baque = Math.sin(TAU * 90 * t) * Math.exp(-t * 40) * 0.5;
      const ruido = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.25;
      return bolha + baque + ruido;
    });
    // batida de água na madeira do trapiche (oca, grave)
    this.buf.clop = this.sintetizar(0.35, (t) => {
      const ruido = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.5;
      const oco = Math.sin(TAU * 210 * t) * Math.exp(-t * 22) * 0.4 + Math.sin(TAU * 135 * t) * Math.exp(-t * 14) * 0.35;
      return ruido + oco;
    });
    // tuiuiú batendo o bico: estalo seco de madeira
    this.buf.bico = this.sintetizar(0.04, (t) => {
      return ((Math.random() * 2 - 1) * Math.exp(-t * 500) * 0.6 + Math.sin(TAU * 1250 * t) * Math.exp(-t * 260) * 0.5);
    });
  }

  // ----- low-level helpers -------------------------------------------------

  /** Liga uma voz avulsa: conta enquanto toca e desconecta tudo quando a fonte termina. */
  voz(fonte, nos) {
    this.vivos++;
    fonte.onended = () => {
      this.vivos--;
      for (const n of nos) {
        try { n.disconnect(); } catch { /* já solto */ }
      }
    };
  }

  env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0011), t0 + attack);
    g.exponentialRampToValueAtTime(0.001, t0 + attack + decay);
  }

  tone({ type = "sine", freq = 440, freqEnd = null, t0 = 0, dur = 0.15, peak = 0.2, attack = 0.01, destino = null }) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      const start = this.ctx.currentTime + t0;
      osc.frequency.setValueAtTime(freq, start);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + dur);
      this.env(g, start, peak, attack, dur);
      osc.connect(g).connect(destino || this.master);
      osc.start(start);
      osc.stop(start + attack + dur + 0.05);
      this.voz(osc, [osc, g]);
    } catch {
      /* ignore */
    }
  }

  noise({ t0 = 0, dur = 0.3, peak = 0.3, filterType = "lowpass", freq = 800, freqEnd = null, Q = 1, attack = 0.01, rate = 1 }) {
    if (!this.ctx) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      src.playbackRate.value = rate;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      const start = this.ctx.currentTime + t0;
      filter.frequency.setValueAtTime(freq, start);
      if (freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 10), start + dur);
      filter.Q.value = Q;
      const g = this.ctx.createGain();
      this.env(g, start, peak, attack, dur);
      src.connect(filter).connect(g).connect(this.master);
      src.start(start, Math.random() * 1.5);
      src.stop(start + attack + dur + 0.1);
      this.voz(src, [src, filter, g]);
    } catch {
      /* ignore */
    }
  }

  /** Toca uma amostra pré-sintetizada (com tom e volume), opcionalmente filtrada. */
  amostra(nome, { t0 = 0, ganho = 0.3, tom = 1, filtro = null, freq = 1000, Q = 0.7 } = {}) {
    if (!this.ctx || !this.buf[nome]) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buf[nome];
      src.playbackRate.value = tom;
      const g = this.ctx.createGain();
      g.gain.value = ganho;
      const nos = [src, g];
      let ult = src;
      if (filtro) {
        const f = this.ctx.createBiquadFilter();
        f.type = filtro;
        f.frequency.value = freq;
        f.Q.value = Q;
        ult.connect(f);
        ult = f;
        nos.push(f);
      }
      ult.connect(g).connect(this.master);
      src.start(this.ctx.currentTime + t0);
      this.voz(src, nos);
    } catch {
      /* ignore */
    }
  }

  // ----- one-shot game cues ------------------------------------------------

  play(name, opts = {}) {
    if (!this.ctx) return;
    switch (name) {
      case "click":
        this.tone({ type: "sine", freq: 950, dur: 0.05, peak: 0.12 });
        break;
      case "error":
        this.tone({ type: "square", freq: 140, dur: 0.14, peak: 0.1 });
        break;
      case "whoosh":
        // a vara cortando o ar na chicotada
        this.noise({ dur: 0.32, peak: 0.26, filterType: "bandpass", freq: 380, freqEnd: 2100, Q: 1.6, attack: 0.05 });
        this.noise({ t0: 0.04, dur: 0.18, peak: 0.08, filterType: "highpass", freq: 3000, attack: 0.03 });
        break;
      case "linhaAssobio": {
        // a linha saindo do carretel e assobiando nos passadores durante o voo da isca
        const d = clamp(opts.dur ?? 1.2, 0.4, 3);
        this.noise({ t0: 0.05, dur: d, peak: 0.07, filterType: "bandpass", freq: 4200, freqEnd: 1500, Q: 6, attack: 0.04 });
        this.noise({ t0: 0.05, dur: d * 0.9, peak: 0.035, filterType: "bandpass", freq: 7200, freqEnd: 2600, Q: 9, attack: 0.06 });
        break;
      }
      case "pickupAbre":
        this.amostra("pickup", { ganho: 0.22, tom: 1.15 });
        break;
      case "pickupFecha":
        this.amostra("pickup", { ganho: 0.32, tom: 0.92, t0: 0.08 });
        break;
      case "boiaCai": {
        // "ploc" da boia + chuá pequeno
        const s = clamp(opts.strength ?? 1, 0.3, 2);
        this.amostra("ploc", { ganho: 0.35 * s, tom: randRange(0.9, 1.1) });
        this.noise({ dur: 0.25 * s, peak: 0.12 * s, filterType: "lowpass", freq: 1800, freqEnd: 400, attack: 0.004 });
        this.amostra("ploc", { ganho: 0.08, tom: randRange(1.5, 1.9), t0: randRange(0.12, 0.25) });
        break;
      }
      case "splash": {
        const s = clamp(opts.strength ?? 1, 0.3, 2);
        // corpo grave do mergulho + chuá + gotas caindo de volta
        this.noise({ dur: 0.45 * s, peak: 0.3 * s, filterType: "lowpass", freq: 1500, freqEnd: 240, attack: 0.005 });
        this.noise({ dur: 0.25 * s, peak: 0.12 * s, filterType: "bandpass", freq: 3200, freqEnd: 1200, Q: 0.8, attack: 0.003 });
        this.tone({ type: "sine", freq: 120, freqEnd: 55, dur: 0.18, peak: 0.12 * s });
        for (let i = 0; i < 5; i++) this.amostra("ploc", { ganho: 0.05 * s, tom: randRange(1.3, 2.4), t0: randRange(0.12, 0.55) });
        break;
      }
      case "plip":
        this.amostra("ploc", { ganho: 0.12, tom: 1.6 });
        break;
      case "bite":
        this.tone({ type: "square", freq: 880, dur: 0.07, peak: 0.16 });
        this.tone({ type: "square", freq: 1318, t0: 0.08, dur: 0.09, peak: 0.16 });
        this.amostra("ploc", { ganho: 0.25, tom: 0.8 });
        break;
      case "hook":
        this.tone({ type: "triangle", freq: 660, freqEnd: 990, dur: 0.12, peak: 0.18 });
        // a linha estalando esticada na fisgada
        this.noise({ dur: 0.08, peak: 0.12, filterType: "bandpass", freq: 2600, Q: 3, attack: 0.002 });
        break;
      case "surgeWarn":
        this.tone({ type: "sawtooth", freq: 330, freqEnd: 440, dur: 0.16, peak: 0.1 });
        break;
      case "snap":
        this.noise({ dur: 0.12, peak: 0.4, filterType: "highpass", freq: 1800, attack: 0.002 });
        this.tone({ type: "sawtooth", freq: 320, freqEnd: 55, dur: 0.4, peak: 0.18 });
        break;
      case "headshake":
        this.tone({ type: "sine", freq: 95, freqEnd: 60, dur: 0.09, peak: 0.12 * (opts.forca ?? 1) });
        this.noise({ dur: 0.08, peak: 0.05 * (opts.forca ?? 1), filterType: "lowpass", freq: 700, attack: 0.003 });
        // a ponta da vara batendo: dois tiques de catraca
        this.amostra("catraca", { ganho: 0.1 * (opts.forca ?? 1), tom: 0.9 });
        this.amostra("catraca", { ganho: 0.07 * (opts.forca ?? 1), tom: 0.95, t0: 0.05 });
        break;
      case "escape":
        this.tone({ type: "sine", freq: 420, freqEnd: 210, dur: 0.35, peak: 0.12 });
        break;
      case "catch": {
        const notes = [523, 659, 784, 1046];
        notes.forEach((f, i) => this.tone({ type: "triangle", freq: f, t0: i * 0.09, dur: 0.16, peak: 0.16 }));
        this.tone({ type: "sine", freq: 2093, t0: 0.36, dur: 0.3, peak: 0.07 });
        break;
      }
      case "legendary": {
        const notes = [392, 523, 659, 784, 1046, 1318];
        notes.forEach((f, i) => this.tone({ type: "triangle", freq: f, t0: i * 0.11, dur: 0.22, peak: 0.17 }));
        this.noise({ t0: 0.1, dur: 0.8, peak: 0.06, filterType: "highpass", freq: 5000, attack: 0.2 });
        break;
      }
      case "levelup": {
        const notes = [440, 554, 659, 880];
        notes.forEach((f, i) => this.tone({ type: "square", freq: f, t0: i * 0.08, dur: 0.12, peak: 0.09 }));
        break;
      }
      case "buy":
        this.tone({ type: "sine", freq: 740, dur: 0.06, peak: 0.12 });
        this.tone({ type: "sine", freq: 988, t0: 0.07, dur: 0.08, peak: 0.12 });
        this.tone({ type: "sine", freq: 1975, t0: 0.13, dur: 0.12, peak: 0.06 });
        break;
      case "sell":
        this.tone({ type: "sine", freq: 1175, dur: 0.05, peak: 0.1 });
        this.tone({ type: "sine", freq: 1568, t0: 0.05, dur: 0.09, peak: 0.1 });
        break;
      default:
        break;
    }
  }

  // ----- briga: som contínuo de freio, catraca, engrenagem e linha esticada -----

  /** Nós persistentes da briga (criados na primeira chamada e reaproveitados em toda briga). */
  ensureFightNodes() {
    if (this.fight || !this.ctx) return;
    try {
      const mk = (type, freq, Q) => { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; return f; };
      // zumbido do freio patinando (linha saindo): ruído em banda estreita
      const buzzSrc = this.ctx.createBufferSource(); buzzSrc.buffer = this.noiseBuffer; buzzSrc.loop = true;
      const buzzF = mk("bandpass", 2600, 4); const buzzG = this.ctx.createGain(); buzzG.gain.value = 0;
      buzzSrc.connect(buzzF).connect(buzzG).connect(this.master); buzzSrc.start();
      // ronco da engrenagem ao recolher
      const gearSrc = this.ctx.createBufferSource(); gearSrc.buffer = this.noiseBuffer; gearSrc.loop = true; gearSrc.playbackRate.value = 0.6;
      const gearF = mk("lowpass", 380, 1.2); const gearG = this.ctx.createGain(); gearG.gain.value = 0;
      gearSrc.connect(gearF).connect(gearG).connect(this.master); gearSrc.start();
      // linha rangendo sob tensão alta
      const creak = this.ctx.createOscillator(); creak.type = "triangle"; creak.frequency.value = 2400;
      const vib = this.ctx.createOscillator(); vib.frequency.value = 11; const vibG = this.ctx.createGain(); vibG.gain.value = 90;
      vib.connect(vibG).connect(creak.frequency);
      const creakG = this.ctx.createGain(); creakG.gain.value = 0;
      creak.connect(creakG).connect(this.master); creak.start(); vib.start();
      // linha cortando a água quando o peixe corre: chiado agudo
      const cutSrc = this.ctx.createBufferSource(); cutSrc.buffer = this.noiseBuffer; cutSrc.loop = true; cutSrc.playbackRate.value = 1.3;
      const cutF = mk("bandpass", 5200, 2.5); const cutG = this.ctx.createGain(); cutG.gain.value = 0;
      cutSrc.connect(cutF).connect(cutG).connect(this.master); cutSrc.start();
      this.fight = { buzzG, buzzF, gearG, creakG, creak, cutG, nodes: [buzzSrc, gearSrc, creak, vib, cutSrc], clickAcc: 0 };
    } catch {
      this.fight = null;
    }
  }

  /**
   * Chamado a cada quadro durante a briga.
   * saindo: 0-1 linha saindo (freio); reeling: recolhendo; speed: velocidade do molinete; tension: 0-1; tipo: "molinete" | "carretilha" | "nenhum"
   */
  fightLoop(dt, { saindo = 0, reeling = false, speed = 1, tension = 0, tipo = "molinete" }) {
    if (!this.ctx) return;
    this.ensureFightNodes();
    const F = this.fight;
    if (!F) return;
    const t = this.ctx.currentTime;
    const semFreio = tipo === "nenhum";
    // freio: zumbido que só aparece quando os estalos da catraca se emendam (linha saindo rápido)
    const emenda = clamp((saindo - 0.45) / 0.55, 0, 1);
    F.buzzG.gain.setTargetAtTime(semFreio ? 0 : emenda * 0.05, t, 0.04);
    F.buzzF.frequency.setTargetAtTime(tipo === "carretilha" ? 1700 + saindo * 900 : 2500 + saindo * 1300, t, 0.05);
    if (!semFreio && saindo > 0.04) {
      // catraca de verdade: cada estalo é a lingueta passando num dente do carretel
      F.clickAcc += dt * (14 + saindo * 75);
      let n = 0;
      while (F.clickAcc >= 1 && n < 6) {
        F.clickAcc -= 1;
        n++;
        const tom = (tipo === "carretilha" ? 0.72 : 1) * randRange(0.96, 1.04);
        this.amostra("catraca", { ganho: 0.06 + saindo * 0.09, tom, t0: n * 0.004 });
      }
      if (F.clickAcc > 1) F.clickAcc = 0;
    } else F.clickAcc = 0;
    // engrenagem ao recolher
    F.gearG.gain.setTargetAtTime(reeling && !semFreio ? 0.045 * speed : 0, t, 0.05);
    // linha esticada demais começa a cantar
    const canta = clamp((tension - 0.68) / 0.32, 0, 1);
    F.creakG.gain.setTargetAtTime(canta * canta * 0.045, t, 0.05);
    F.creak.frequency.setTargetAtTime(2100 + tension * 900, t, 0.08);
    // a linha riscando a água acompanha a corrida do peixe
    F.cutG.gain.setTargetAtTime(clamp(saindo - 0.2, 0, 1) * 0.03, t, 0.06);
  }

  /** Silencia os sons contínuos da briga. */
  fightStop() {
    if (!this.fight || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const g of [this.fight.buzzG, this.fight.gearG, this.fight.creakG, this.fight.cutG]) g.gain.setTargetAtTime(0, t, 0.04);
    this.fight.clickAcc = 0;
  }

  /** Ratchet clicks while reeling; called every frame with held state. */
  reelTick(dt, active, speed = 1) {
    if (!this.ctx || !active) {
      this.reelAccum = 0;
      return;
    }
    this.reelAccum += dt * 13 * speed;
    let n = 0;
    while (this.reelAccum >= 1 && n < 4) {
      this.reelAccum -= 1;
      n++;
      // anti-reverso: tique leve e agudo, bem mais baixo que o freio
      this.amostra("catraca", { ganho: 0.05, tom: randRange(1.45, 1.6) });
    }
    if (this.reelAccum > 1) this.reelAccum = 0;
  }

  // ----- looping ambience ---------------------------------------------------

  stopAmbience() {
    if (!this.ambience) return;
    for (const t of this.ambience.timers) clearTimeout(t);
    for (const n of this.ambience.nodes) {
      try {
        if (n.stop) n.stop();
      } catch {
        /* ignore */
      }
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.ambience = null;
  }

  /**
   * Per-location ambient bed: lapping water + wind, plus randomized wildlife
   * chirps appropriate to the location and time of day.
   */
  setAmbience(profile, segment) {
    this.ambienceProfile = profile;
    this.ambienceSegment = segment;
    if (!this.ctx) return;
    this.stopAmbience();
    const amb = { nodes: [], timers: [], noite: null };
    this.ambience = amb;
    const C = this.ctx;
    const ruido = (rate = 1) => {
      const s = C.createBufferSource();
      s.buffer = this.noiseBuffer;
      s.loop = true;
      s.playbackRate.value = rate;
      return s;
    };
    const filtro = (type, freq, Q = 0.7) => {
      const f = C.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q;
      return f;
    };
    const ganho = (v) => {
      const g = C.createGain();
      g.gain.value = v;
      return g;
    };
    try {
      // água: marulho grave com respiração lenta
      const water = ruido();
      const lp = filtro("lowpass", 420);
      const wGain = ganho(0.05 * profile.waves);
      const lfo = C.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ganho(0.03 * profile.waves);
      lfo.connect(lfoGain).connect(wGain.gain);
      water.connect(lp).connect(wGain).connect(this.master);
      water.start();
      lfo.start();
      amb.nodes.push(water, lp, wGain, lfo, lfoGain);

      // vento: sopro grave + folhas farfalhando em rajadas
      const wind = ruido(0.7);
      const bp = filtro("bandpass", 650, 0.6);
      const windGain = ganho(0.02 * profile.wind);
      wind.connect(bp).connect(windGain).connect(this.master);
      wind.start();
      amb.nodes.push(wind, bp, windGain);
      const folhas = ruido(1.1);
      const hp = filtro("highpass", 2200, 0.5);
      const pico = filtro("peaking", 5200, 0.8);
      pico.gain.value = 5;
      const folhasG = ganho(0.012 * profile.wind);
      const raj1 = C.createOscillator();
      raj1.frequency.value = 0.071;
      const raj2 = C.createOscillator();
      raj2.frequency.value = 0.13;
      const rajG1 = ganho(0.009 * profile.wind), rajG2 = ganho(0.006 * profile.wind);
      raj1.connect(rajG1).connect(folhasG.gain);
      raj2.connect(rajG2).connect(folhasG.gain);
      folhas.connect(hp).connect(pico).connect(folhasG).connect(this.master);
      folhas.start();
      raj1.start();
      raj2.start();
      amb.nodes.push(folhas, hp, pico, folhasG, raj1, raj2, rajG1, rajG2);

      // grilos: trinado contínuo (portadora aguda pulsando), volume conforme a hora
      if (profile.crickets) {
        const osc = C.createOscillator();
        osc.frequency.value = 4650;
        const pulso = C.createOscillator();
        pulso.type = "square";
        pulso.frequency.value = 31;
        const pulsoG = ganho(0.5);
        const vca = ganho(0.5);
        pulso.connect(pulsoG).connect(vca.gain);
        const frase = C.createOscillator();
        frase.type = "square";
        frase.frequency.value = 1.6;
        const fraseG = ganho(0.5);
        const vca2 = ganho(0.5);
        frase.connect(fraseG).connect(vca2.gain);
        const noite = ganho(0);
        osc.connect(vca).connect(vca2).connect(noite).connect(this.master);
        osc.start();
        pulso.start();
        frase.start();
        amb.nodes.push(osc, pulso, pulsoG, vca, frase, fraseG, vca2, noite);
        amb.noite = noite;
      }
      this.ajustarNoite();

      // bichos e água batendo, sorteados conforme a hora do dia
      const agenda = (fn, min, max) => {
        const tick = () => {
          if (this.ambience !== amb) return;
          try { fn(); } catch { /* ignore */ }
          amb.timers.push(setTimeout(tick, randRange(min, max)));
          if (amb.timers.length > 40) amb.timers.splice(0, 20);
        };
        amb.timers.push(setTimeout(tick, randRange(min * 0.3, max * 0.6)));
      };
      const seg = () => this.ambienceSegment;
      const dia = () => seg() === "day" || seg() === "dawn";
      const noite = () => seg() === "night" || seg() === "dusk";
      // água batendo no trapiche/barco
      agenda(() => {
        this.amostra("clop", { ganho: randRange(0.04, 0.09) * (0.6 + profile.waves), tom: randRange(0.8, 1.25), filtro: "lowpass", freq: 900 });
      }, 900, 3200);
      // aves do dia
      agenda(() => {
        if (!profile.birds) return;
        if (dia()) {
          const r = Math.random();
          if (r < 0.3) this.arara();
          else if (r < 0.5) this.aracua();
          else if (r < 0.62) this.tuiuiu();
          else this.birdChirp();
        } else if (seg() === "dusk" && Math.random() < 0.4) this.aracua();
      }, 4500, 12000);
      // noite: sapos e sapo-martelo
      agenda(() => {
        if (!noite()) return;
        if (Math.random() < 0.55) this.sapo();
        else this.sapoMartelo();
      }, 1200, 4200);
      // peixe pulando ao longe
      agenda(() => {
        if (Math.random() < 0.6) this.peixeLonge();
      }, 14000, 38000);
    } catch {
      /* ignore */
    }
  }

  setAmbienceSegment(segment) {
    this.ambienceSegment = segment;
    this.ajustarNoite();
  }

  /** Grilos sobem ao anoitecer e somem de dia. */
  ajustarNoite() {
    const g = this.ambience?.noite;
    if (!g || !this.ctx) return;
    const s = this.ambienceSegment;
    const alvo = s === "night" ? 0.014 : s === "dusk" ? 0.008 : 0;
    g.gain.setTargetAtTime(alvo, this.ctx.currentTime, 2.5);
  }

  birdChirp() {
    const base = randRange(2100, 3300);
    for (let i = 0; i < 3; i++) {
      this.tone({ type: "sine", freq: base + i * randRange(60, 200), freqEnd: base * 1.25, t0: i * 0.11, dur: 0.07, peak: 0.03 });
    }
  }

  /** Arara: grito rouco e áspero ("rraah"), duas ou três vezes, ao longe. */
  arara() {
    const n = 2 + Math.floor(Math.random() * 2);
    const base = randRange(520, 760);
    for (let i = 0; i < n; i++) {
      const t0 = i * randRange(0.45, 0.7);
      this.tone({ type: "sawtooth", freq: base * 1.15, freqEnd: base * 0.8, t0, dur: 0.32, peak: 0.022, attack: 0.03 });
      this.tone({ type: "square", freq: base * 2.3, freqEnd: base * 1.7, t0, dur: 0.3, peak: 0.008, attack: 0.03 });
      this.noise({ t0, dur: 0.3, peak: 0.018, filterType: "bandpass", freq: 1500, freqEnd: 1100, Q: 3, attack: 0.03 });
    }
  }

  /** Aracuã: o coro ritmado "a-ra-cuã" de um bando, vozes se sobrepondo. */
  aracua() {
    const vozes = 2 + Math.floor(Math.random() * 2);
    for (let v = 0; v < vozes; v++) {
      const off = v * randRange(0.12, 0.3);
      const base = randRange(650, 900);
      for (let r = 0; r < 3; r++) {
        const t = off + r * 0.62;
        this.tone({ type: "triangle", freq: base, t0: t, dur: 0.08, peak: 0.02 });
        this.tone({ type: "triangle", freq: base * 1.18, t0: t + 0.12, dur: 0.08, peak: 0.02 });
        this.tone({ type: "triangle", freq: base * 1.32, freqEnd: base * 0.95, t0: t + 0.26, dur: 0.22, peak: 0.024 });
      }
    }
  }

  /** Tuiuiú: não canta, bate o bico como matraca. */
  tuiuiu() {
    const n = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < n; i++) this.amostra("bico", { ganho: 0.06 * (1 - i / (n * 1.4)), tom: randRange(0.9, 1.1), t0: i * randRange(0.065, 0.08) });
  }

  /** Sapo: coaxar grave em pulsos ("rrrrom"). */
  sapo() {
    const base = randRange(110, 180);
    const pulsos = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < pulsos; i++) this.tone({ type: "square", freq: base, freqEnd: base * 0.9, t0: i * 0.045, dur: 0.03, peak: 0.012 });
  }

  /** Sapo-martelo/ferreiro: "tonc" metálico, como martelo em bigorna. */
  sapoMartelo() {
    const f = randRange(1100, 1500);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.tone({ type: "sine", freq: f, t0: i * 0.5, dur: 0.12, peak: 0.02, attack: 0.002 });
      this.tone({ type: "sine", freq: f * 2.7, t0: i * 0.5, dur: 0.05, peak: 0.006, attack: 0.002 });
    }
  }

  /** Peixe pulando longe: "tchibum" abafado pela distância. */
  peixeLonge() {
    this.noise({ dur: 0.35, peak: 0.035, filterType: "lowpass", freq: 700, freqEnd: 200, attack: 0.006 });
    this.amostra("ploc", { ganho: 0.04, tom: 0.6, filtro: "lowpass", freq: 600 });
  }

  gullCry() {
    this.tone({ type: "sawtooth", freq: randRange(1100, 1400), freqEnd: randRange(600, 750), dur: 0.5, peak: 0.028, attack: 0.08 });
  }

  cricket() {
    for (let i = 0; i < 5; i++) {
      this.tone({ type: "sine", freq: 4200, t0: i * 0.07, dur: 0.03, peak: 0.018 });
    }
  }
}

export const audio = new AudioManager();
