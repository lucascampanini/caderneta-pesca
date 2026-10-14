// [livre] Modo livre: monte a traia e desça o Rio Aquidauana de voadeira, com o formato do rio pela imagem
// de satélite mais recente, o nível da régua da ANA e o clima e a hora reais do lugar. Para pescar, ancore:
// a pesca usa o sistema do jogo (arremesso, mordida, briga) com a tabela de peixes do rio.
//
// Ligação com main.js (linhas marcadas com // [livre]): antes(dt) e depois(dt) no laço, cameraPropria(),
// bloqueiaArremesso(), ajustarCaptura(fish), alternarMapa(), sair(), setQualidade(), e `loc` no lugar
// do pesqueiro atual enquanto o modo está ativo.

import * as THREE from "three";
import { DadosRio } from "./dadosRio.js";
import { ClimaAoVivo, horaLocal, dataLocal } from "./climaAoVivo.js";
import { MundoRio, voadeiraLivre } from "./mundoRio.js";
import { Barco } from "./barco.js";
import { tabelaDoMomento, corDaAgua, motivoSoltar, emPiracema, dicaOnde, TABELA_AQUIDAUANA } from "./peixesRio.js";
import { injetarEstilo, injetarBotaoMenu, PainelEntrada, HudLivre, MapaGrande, mostrarCarregando, nomeFase } from "./interfaceLivre.js";
import { FISH_BY_ID } from "../data/fishData.js";
import { bomPara } from "../gameplay/rules.js";

const CHAVE_SALVO = "pesca_livre_aquidauana_v1";
const PROMPT_PESCA = "Mire com o <b>mouse</b> e segure o <b>clique</b> ou <b>espaço</b> para arremessar · <b>E</b> levanta a âncora";
const PROMPT_NAVEGA = "<b>W/S</b> acelera e freia · <b>A/D</b> vira · <b>Shift</b> no máximo · <b>E</b> ancora para pescar · <b>M</b> mapa";
const VELOCIDADES_TEMPO = [1, 60, 600];

const lerSalvo = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SALVO) || "null");
  } catch {
    return null;
  }
};

export class ModoLivre {
  constructor(deps) {
    this.d = deps;
    this.ativo = false;
    this.navegando = false;
    this.loc = null;
    this.dados = new DadosRio("aquidauana");
    this.clima = null;
    this.mundo = null;
    this.barco = null;
    this.barcoMesh = null;
    this.teclas = new Set();
    this.piloto = null; // alvo (s) do piloto automático
    this.velocidadeTeste = 1; // os testes automáticos aceleram a simulação do barco
    this.tempoIdx = 0;
    this.horasExtra = 0;
    this.camPos = new THREE.Vector3();
    this.camOlha = new THREE.Vector3();
    this.camYawExtra = 0;
    this._v = new THREE.Vector3();
    this._p = { x: 0, z: 0 };
    this._salvoT = 0;
    this._tabT = 0;
    this._infoT = 0;
    this._chuvaRipT = 0;
    this.motorAudio = null;

    injetarEstilo();
    injetarBotaoMenu(() => this.abrirPainel());
    this.painel = new PainelEntrada({
      S: deps.S,
      economy: deps.economy,
      compat: deps.compat,
      equipar: (cat, i) => {
        const E = deps.economy;
        if (!deps.S.gear.owned[cat].includes(i)) {
          if (E.modoDono()) E.buyGear(cat, i);
          else return;
        }
        E.equipGear(cat, i);
      },
      temSalvo: () => !!lerSalvo(),
      onFechar: () => {
        this.painel.fechar();
        deps.screens.showMenu(true);
      },
      onPartir: (op) => this.entrar(op),
    });
    this.hud = new HudLivre({
      alternarAncora: () => this.alternarAncora(),
      alternarPiloto: () => this.alternarPiloto(),
      alternarTempo: () => this.alternarTempo(),
      abrirMapa: () => this.alternarMapa(),
    });
    this.mapa = new MapaGrande({
      fechar: () => this.mapa.fechar(),
      pesqueiros: () => {
        this.mapa.fechar();
        this.sair(false);
        deps.machine.set(deps.Phase.MAP);
      },
      levarPara: (x, z) => this.levarPara(x, z),
      irPara: (s) => {
        const p = this.dados.emS(s);
        this.levarPara(p.x, p.z);
      },
    });

    // teclado do barco
    window.addEventListener("keydown", (e) => {
      if (!this.ativo) return;
      if (e.target.closest?.("input, select, textarea")) return;
      this.teclas.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyE") this.alternarAncora();
      if (e.code === "KeyP" && this.navegando) this.alternarPiloto();
    });
    window.addEventListener("keyup", (e) => this.teclas.delete(e.code));
    window.addEventListener("blur", () => this.teclas.clear());
    // arrastar o mouse gira a câmera em volta do barco enquanto navega
    let arrasto = null;
    deps.container.addEventListener("pointerdown", (e) => {
      if (this.ativo && this.navegando) arrasto = e.clientX;
    });
    window.addEventListener("pointermove", (e) => {
      if (arrasto == null) return;
      this.camYawExtra += (e.clientX - arrasto) * 0.006;
      arrasto = e.clientX;
    });
    window.addEventListener("pointerup", () => (arrasto = null));
    deps.container.addEventListener("dblclick", () => (this.camYawExtra = 0));

    // a boia caiu em terra (margem, mato): enroscou
    deps.events.on("bobber:landed", () => {
      if (!this.ativo || !this.mundo) return;
      const b = deps.bobber.pos;
      const p = this.mundo.quadro.paraRio(b.x, b.z, this._p);
      if (this.dados.sdf(p.x, p.z) > 0.5) {
        deps.hud.toast("Enroscou no mato da margem! Recolhendo...", "warn");
        setTimeout(() => {
          if (deps.machine.is(deps.Phase.WAITING)) deps.machine.set(deps.Phase.RETRIEVING);
        }, 350);
      }
    });
    // ao voltar das telas (loja, diário) para o jogo, o prompt certo
    deps.events.on("phase", ({ to }) => {
      if (!this.ativo) return;
      if (to === deps.Phase.IDLE) {
        deps.hud.setPrompt(this.navegando ? PROMPT_NAVEGA : PROMPT_PESCA);
        this.d.casting.rig.visible = !this.navegando;
      }
    });
    deps.events.on("gear", () => this._kit());
    // pré-carrega o rio.json para a escolha do rio aparecer rápido
    this.dados.carregarMeta().catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // entrada e saída
  // ---------------------------------------------------------------------------

  async abrirPainel() {
    const D = this.d;
    D.audio.init();
    document.getElementById("screen-menu")?.classList.add("hidden");
    this.painel.abrir(null, null);
    let meta = null;
    try {
      meta = await this.dados.carregarMeta();
    } catch (e) {
      console.warn("[livre]", e);
    }
    if (meta && !this.clima) {
      const pin = meta.pontos.find((p) => p.tipo === "pindo") || meta.pontos[0];
      this.clima = new ClimaAoVivo(pin.lat, pin.lon, meta.clima_no_pacote);
      this.clima.buscar().then(() => this.painel.abrir(meta, this.clima.estado));
    }
    this.painel.abrir(meta, this.clima?.estado);
  }

  async entrar({ inicio = "cidade" } = {}) {
    const D = this.d;
    this.painel.fechar();
    mostrarCarregando("Baixando o Rio Aquidauana (satélite, relevo e nível)…");
    try {
      await this.dados.carregar();
    } catch (e) {
      console.error("[livre]", e);
      mostrarCarregando(null);
      D.hud.toast("Não deu para baixar o rio. Confira a internet.", "warn");
      D.screens.showMenu(true);
      return;
    }
    const meta = this.dados.meta;
    if (!this.clima) {
      const pin = meta.pontos.find((p) => p.tipo === "pindo") || meta.pontos[0];
      this.clima = new ClimaAoVivo(pin.lat, pin.lon, meta.clima_no_pacote);
    }
    this.clima.iniciar();
    this.fase = meta.fase_rio || "seco";
    this.agua = corDaAgua(meta);
    this.pindo = meta.pontos.find((p) => p.tipo === "pindo");
    this.cidade = meta.pontos.find((p) => p.tipo === "cidade");
    this.loc = this._criarLocal(meta);
    mostrarCarregando("Montando o rio…");
    await new Promise((r) => setTimeout(r, 30));

    // tira o pesqueiro atual de cena (volta ao sair)
    if (D.env.group) D.env.group.visible = false;
    D.bite.cancel();
    D.bobber.hide();
    if (D.fight.active) D.fight.end();
    D.water.setParams(this.loc.water);
    D.effects.setLocationAmbient(this.loc);
    D.audio.setAmbience(this.loc.ambience, D.gclock.segment);

    // nível do rio: barranco mais alto na seca, correnteza mais forte na cheia
    const pct = meta.percentil_nivel ?? 0.4;
    const alturaBarranco = this.fase === "cheio" ? 0.6 : Math.max(0.7, Math.min(3.4, 3.6 - 2.6 * pct));
    this.mundo = new MundoRio(D.scene, this.dados, { qualidade: D.S.settings.quality, alturaBarranco });
    if (this.cidade) this.mundo.cidade = { x: this.cidade.xz[0], z: this.cidade.xz[1] };
    this.barco = new Barco(this.dados);
    this.barco.corrente = { subindo: 0.95, cheio: 1.15, baixando: 0.75, seco: 0.45 }[this.fase] ?? 0.6;

    // ponto de partida
    const salvo = lerSalvo();
    let s0 = (this.cidade?.s ?? 0) + 1100; // logo abaixo da Ponte da Amizade
    if (inicio === "pindo" && this.pindo) s0 = this.pindo.s - 250;
    let pos = this.dados.emS(s0);
    let psi = Math.atan2(pos.tx, -pos.tz);
    if (inicio === "salvo" && salvo && this.barco.livre(salvo.x, salvo.z)) {
      pos = { x: salvo.x, z: salvo.z };
      psi = salvo.psi;
    }
    this.barco.colocar(pos.x, pos.z, psi);
    this.mundo.quadro.definir(pos.x, pos.z, -psi);
    // o Pindó marcado no rio: boia vermelha com bandeira e placa no meio do canal
    if (this.pindo) {
      const pp = this.dados.emS(this.pindo.s);
      this.mundo.setMarcos([{ nome: "Pindó", x: pp.x, z: pp.z, cor: 0xe0322e }]);
    }
    const t0 = performance.now();
    this.mundo.refazer(pos.x, pos.z);
    console.info(`[livre] rio montado em ${Math.round(performance.now() - t0)} ms (${this.mundo.trechos.size} trechos)`);

    if (!this.barcoMesh) this.barcoMesh = voadeiraLivre();
    D.scene.add(this.barcoMesh);

    this.hud.prepararBase(this.dados);
    this.hud.setCreditos(meta.creditos || []);
    this.ativo = true;
    this.navegando = true;
    this.piloto = null;
    this._atualizarTabela(true);
    const dt = (iso) => iso.split("-").reverse().join("/");
    D.hud.toast(`Rio Aquidauana pelo satélite de ${dt(meta.satelite.data_maior_parte || meta.satelite.data_principal)} a ${dt(meta.satelite.data_principal)}; rio ${nomeFase(this.fase)}`, "info");
    if (emPiracema(dataLocal())) D.hud.toast("Piracema em MS (5/nov a 28/fev): só pesque e solte.", "gold");
    mostrarCarregando(null);
    document.body.classList.add("lv-ativo");
    this._posicionarBarco(0);
    D.machine.set(D.Phase.IDLE);
    this._navegar(true);
    this.hud.mostrar(true);
    this._posicionarCameraNavegacao(true);
    D.hud.updateGear?.();
  }

  /** Sai do modo livre. `menu`: voltando ao menu (senão, para os pesqueiros). */
  sair(menu = false) {
    if (!this.ativo) return;
    const D = this.d;
    this._salvarPosicao();
    this.ativo = false;
    this.navegando = false;
    this.piloto = null;
    this.clima?.parar();
    this._motor(0, 0);
    this.mundo?.descartar();
    this.mundo = null;
    if (this.barcoMesh) D.scene.remove(this.barcoMesh);
    this.hud.mostrar(false);
    document.body.classList.remove("lv-ativo");
    this.mapa.fechar();
    D.casting.rig.visible = true;
    D.water.water.position.set(0, D.water.water.position.y, 0);
    D.sunLight.target.position.set(0, 0, 0);
    D.effects.motes.position.set(0, 0, 0);
    D.setVento(1);
    D.water.setWind(null);
    if (D.env.group) D.env.group.visible = true;
    // reconstrói o pesqueiro de antes (cenário, âncora da câmera, água e som)
    D.travelTo(D.S.world.current, true);
    D.gclock.hours = D.S.world.hour;
    D.hud.updateLocation();
    if (!menu) D.hud.toast("De volta aos pesqueiros", "info");
  }

  setQualidade(q) {
    if (!this.mundo) return;
    this.mundo.setQualidade(q);
    this.mundo.refazer(this.barco.x, this.barco.z);
  }

  _criarLocal(meta) {
    // água barrenta do Aquidauana: cor tirada do satélite (meio do canal), puxada para o tom de rio
    const c = meta.satelite.cor_agua_rgb || [0.118, 0.098, 0.064];
    const corFunda = new THREE.Color(c[0] * 2.6, c[1] * 2.5, c[2] * 2.3).multiplyScalar(0.62);
    const corRasa = new THREE.Color(c[0] * 4.2, c[1] * 3.9, c[2] * 3.6);
    return {
      id: "livre_aquidauana",
      name: "Rio Aquidauana",
      livre: true,
      env: "livre",
      water: {
        color: corFunda.getHex(), corRasa: corRasa.getHex(), distortion: 3.0, size: 2.6, timeScale: 0.9,
        vento: 0.4, ventoDir: 1.2, turbidez: this.agua === "barrenta" ? 4.0 : this.agua === "verde" ? 2.2 : 1.0, sujeira: 0.12, fundo: null,
      },
      sky: { turbidity: 3.0, rayleigh: 2.0, mieCoefficient: 0.0035, mieDirectionalG: 0.82 },
      fog: { day: 0xb0c9d6, night: 0x0a141e, density: 0.0019 },
      ambience: { waves: 0.35, wind: 0.32, birds: true, crickets: true, gulls: false },
      biteMult: 1,
      fishTable: TABELA_AQUIDAUANA.slice(),
      unlock: { level: 1, cost: 0 },
    };
  }

  // ---------------------------------------------------------------------------
  // âncora
  // ---------------------------------------------------------------------------

  alternarAncora() {
    if (!this.ativo) return;
    const D = this.d;
    if (this.navegando) {
      if (!D.machine.is(D.Phase.IDLE)) return;
      if (Math.abs(this.barco.v) > 3) {
        D.hud.toast("Diminua a velocidade para ancorar", "warn");
        return;
      }
      mostrarCarregando("Ancorando…");
      setTimeout(() => {
        this.ancorar();
        mostrarCarregando(null);
      }, 30);
    } else {
      if (!D.machine.is(D.Phase.IDLE)) {
        D.hud.toast("Recolha a linha antes de levantar a âncora", "warn");
        return;
      }
      this._navegar(true);
    }
  }

  ancorar() {
    const D = this.d, B = this.barco;
    this.piloto = null;
    B.v = 0;
    B.giroV = 0;
    // refaz o mundo com o barco na origem e a proa para −Z (o arremesso do jogo é para −Z)
    const t0 = performance.now();
    this.mundo.quadro.definir(B.x, B.z, -B.psi);
    this.mundo.refazer(B.x, B.z);
    console.info(`[livre] ancorado: mundo refeito em ${Math.round(performance.now() - t0)} ms`);
    this._navegar(false);
    this._posicionarBarco(0);
    D.env.playerSpot.set(0, 0.42, -1.0);
    D.casting.attachTo(D.env.playerSpot);
    D.rig.setAnchor(D.env.playerSpot);
    D.rig.setMode("play");
    const d = this.dados.sdf(B.x, B.z);
    const meio = d < -12 ? "no meio do canal" : "perto da margem";
    const alvo = this._melhorAgora();
    D.hud.toast(`Ancorado ${meio}. ${alvo ? `${FISH_BY_ID[alvo].name}: ${dicaOnde(alvo, this.fase)}` : ""}`, "success");
    this._salvarPosicao();
  }

  _navegar(on) {
    const D = this.d;
    this.navegando = on;
    D.casting.rig.visible = !on;
    D.casting.setLineTarget?.(null);
    if (this.barcoMesh) {
      this.barcoMesh.userData.piloto.visible = on;
      this.barcoMesh.userData.ancora.visible = !on;
    }
    this.hud.setAncorado(!on);
    D.hud.setPrompt(on ? PROMPT_NAVEGA : PROMPT_PESCA);
    if (on) this._posicionarCameraNavegacao(true);
  }

  cameraPropria() {
    return this.ativo && this.navegando;
  }

  bloqueiaArremesso() {
    return this.ativo && this.navegando;
  }

  // ---------------------------------------------------------------------------
  // laço
  // ---------------------------------------------------------------------------

  /** Antes de atualizar a água e o céu: hora, clima, barco e trechos. */
  antes(dt, phase, paused) {
    if (!this.ativo) return;
    const D = this.d;
    // hora real de MS (com o "acelerar o tempo" somando horas)
    const vel = VELOCIDADES_TEMPO[this.tempoIdx];
    if (!paused && vel > 1) this.horasExtra += (dt * (vel - 1)) / 3600;
    D.gclock.hours = (horaLocal() + this.horasExtra) % 24;
    D.S.world.hour = D.gclock.hours;
    // clima ao vivo
    const cl = this.clima.estado;
    this.nuvens = cl.nuvem * (cl.chovendo ? 1 : 0.85);
    const tempo = cl.nuvem >= 0.6 || cl.chovendo ? "cloudy" : "clear";
    if (D.S.world.weather !== tempo) {
      D.S.world.weather = tempo;
      D.events.emit("weather", { weather: tempo });
    }
    const vento = Math.min(1, cl.vento / 28);
    D.water.setWind(0.12 + vento * 0.75);
    D.setVento(0.5 + cl.vento / 9);
    this._tabT -= dt;
    if (this._tabT <= 0) this._atualizarTabela();

    const navegaAgora = this.navegando && phase === D.Phase.IDLE && !paused;
    if (navegaAgora) {
      this._entrada();
      const passos = Math.max(1, Math.round(this.velocidadeTeste));
      let bateu = false;
      for (let i = 0; i < passos; i++) bateu = this.barco.passo(dt, false) === "batida" || bateu;
      if (bateu) {
        D.hud.toast("Opa, a margem! Cuidado com o barranco.", "warn");
        D.rig.addShake?.(0.3);
        D.audio.play?.("plip");
      }
      // saiu do trecho modelado
      const fimS = this.dados.comprimento - 60;
      if (this.barco.s > fimS && this.barco.v > 0) this.barco.v *= 0.9;
    }
    // trechos em volta do barco (um pouco por quadro)
    if (this.mundo && this.navegando) this.mundo.atualizar(this.barco.x, this.barco.z, 5);
    this._posicionarBarco(dt);
    // motor
    const B = this.barco;
    this._motor(navegaAgora ? 1 : 0, Math.abs(B.v) / 15 + Math.abs(B.entrada.acel) * 0.25);
    // esteira
    if (navegaAgora && Math.abs(B.v) > 1.5) {
      this._esteiraT = (this._esteiraT || 0) - dt;
      if (this._esteiraT <= 0) {
        this._esteiraT = 0.14;
        const m = this.barcoMesh;
        const dir = this._v.set(Math.sin(this._psiMundo), 0, -Math.cos(this._psiMundo));
        const popa = m.position.clone().addScaledVector(dir, -3.1);
        D.effects.ripple(popa, 0.7 + Math.abs(B.v) * 0.07, 1.3, 3.2, Math.atan2(-dir.z, dir.x), 0.26);
        if (Math.abs(B.v) > 8 && Math.random() < 0.5) D.effects.esteira(m.position.clone().addScaledVector(dir, 2.4), dir.clone().multiplyScalar(-1), 0.4);
      }
    }
    // informações e salvamento
    this._infoT -= dt;
    if (this._infoT <= 0) {
      this._infoT = 0.25;
      this._atualizarInfo(cl);
    }
    this._salvoT += dt;
    if (this._salvoT > 20) {
      this._salvoT = 0;
      this._salvarPosicao();
    }
  }

  /** Depois do céu: sol acompanhando o barco (sombras), chuva e câmera da navegação. */
  depois(dt) {
    if (!this.ativo) return;
    const D = this.d;
    const m = this.barcoMesh;
    const bx = m.position.x, bz = m.position.z;
    D.sunLight.position.x += bx;
    D.sunLight.position.z += bz;
    D.sunLight.target.position.set(bx, 0, bz);
    D.sunLight.target.updateMatrixWorld();
    D.water.water.position.set(bx, D.water.water.position.y, bz);
    D.effects.motes.position.set(bx, 0, bz);
    // chuva ao vivo
    const cl = this.clima.estado;
    const ang = ((cl.ventoDir + 180) * Math.PI) / 180;
    const vv = Math.min(6, cl.vento / 6);
    this.mundo?.atualizarChuva(cl.chuva, D.camera, dt, [Math.sin(ang) * vv, -Math.cos(ang) * vv]);
    if (cl.chovendo) {
      this._chuvaRipT -= dt;
      if (this._chuvaRipT <= 0 && !D.fight.active) {
        this._chuvaRipT = 0.12 / Math.max(0.2, cl.chuva);
        const p = this._v.set(bx + (Math.random() - 0.5) * 30, 0, bz - 4 - Math.random() * 26);
        D.effects.ripple(p.clone(), 0.35 + Math.random() * 0.3, 0.8, 1, 0, 0.35);
      }
    }
    if (this.navegando) this._cameraNavegacao(dt);
  }

  _entrada() {
    const B = this.barco, t = this.teclas, toque = this.hud.toque;
    const fr = t.has("KeyW") || t.has("ArrowUp") || toque.acel;
    const tr = t.has("KeyS") || t.has("ArrowDown") || toque.re;
    const es = t.has("KeyA") || t.has("ArrowLeft") || toque.esq;
    const di = t.has("KeyD") || t.has("ArrowRight") || toque.dir;
    if (fr || tr || es || di) this.piloto = null; // mexeu nos controles: desliga o piloto
    if (this.piloto != null) {
      const chegou = B.pilotar(this.piloto.alvo, this.piloto.vel);
      if (chegou) {
        this.piloto = null;
        B.entrada.acel = 0;
        B.entrada.giro = 0;
        this.d.hud.toast("Chegamos. Ancore (E) e bom peixe!", "success");
      }
      return;
    }
    B.entrada.acel = (fr ? 1 : 0) - (tr ? 1 : 0);
    B.entrada.giro = (di ? 1 : 0) - (es ? 1 : 0);
    B.entrada.turbo = t.has("ShiftLeft") || t.has("ShiftRight");
  }

  alternarPiloto(alvoS = null, vel = 9) {
    if (!this.ativo || !this.navegando) return;
    if (this.piloto && alvoS == null) {
      this.piloto = null;
      this.d.hud.toast("Piloto automático desligado", "info");
      return;
    }
    const alvo = alvoS ?? (this.barco.s < (this.pindo?.s ?? 0) - 30 ? this.pindo.s : this.dados.comprimento - 80);
    this.piloto = { alvo, vel };
    this.d.hud.toast(alvoS == null ? (alvo === this.pindo?.s ? "Piloto automático: rumo ao Pindó" : "Piloto automático: rio abaixo até o fim do trecho") : "Piloto automático ligado", "info");
  }

  alternarTempo() {
    this.tempoIdx = (this.tempoIdx + 1) % VELOCIDADES_TEMPO.length;
    if (this.tempoIdx === 0) this.horasExtra = 0;
    const v = VELOCIDADES_TEMPO[this.tempoIdx];
    this.hud.btnTempo.textContent = v === 1 ? "Hora real" : `Tempo ${v}x`;
    this.d.hud.toast(v === 1 ? "Hora real de Mato Grosso do Sul" : `Tempo acelerado ${v}x (1 s = ${v >= 60 ? v / 60 + " min" : v + " s"})`, "info");
  }

  levarPara(x, z) {
    if (!this.ativo) return;
    const p = this.dados.maisPerto(x, z);
    this.barco.colocar(p.x, p.z, Math.atan2(p.tx, -p.tz));
    if (!this.navegando) this._navegar(true);
    this.mundo.quadro.definir(p.x, p.z, -this.barco.psi);
    this.mundo.refazer(p.x, p.z);
    this._posicionarBarco(0);
    this._posicionarCameraNavegacao(true);
    this.mapa.fechar();
    this.d.hud.toast(`Barco no km ${(p.s / 1000).toFixed(1)} do trecho`, "info");
  }

  alternarMapa() {
    if (!this.ativo) return;
    if (this.mapa.aberto) {
      this.mapa.fechar();
      return;
    }
    const m = this.dados.meta;
    const B = this.barco;
    const ll = this.dados.lonLat(B.x, B.z);
    const nv = m.nivel;
    const info = `<p><b>Você está em</b> ${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)} · km ${(B.s / 1000).toFixed(1)} do trecho.</p>
      <p>Pindó: km ${(this.pindo.s / 1000).toFixed(1)} (${((this.pindo.s - B.s) / 1000).toFixed(1)} km ${this.pindo.s >= B.s ? "rio abaixo" : "rio acima"}).</p>
      <p><b>Satélite:</b> ${m.satelite.cenas.map((c) => c.data.split("-").reverse().join("/")).join(", ")} (Sentinel-2).<br>
      <b>Nível:</b> ${nv ? `${Math.round(nv.cm)} cm em ${nv.data.split("-").reverse().join("/")} (ANA), ${nomeFase(this.fase)}` : "sem leitura"}.<br>
      <b>Água:</b> ${this.agua}.</p>`;
    this.mapa.abrir(this.dados, this.hud.base, B, m.pontos, info);
  }

  // ---------------------------------------------------------------------------
  // pesca
  // ---------------------------------------------------------------------------

  _atualizarTabela(forcar = false) {
    this._tabT = 30;
    const cl = this.clima.estado;
    const t = tabelaDoMomento(cl, this.fase, this.agua, this.d.gclock.hours);
    this.loc.fishTable = t.fishTable;
    this.loc.biteMult = t.biteMult;
    this._kit();
    if (forcar) console.info("[livre] tabela de peixes", t);
  }

  /** "Pega bem aqui" do cartão Meu conjunto, com os peixes do rio. */
  _kit() {
    if (!this.ativo) return;
    const D = this.d;
    const eq = D.economy.getEquipped();
    const erro = D.compat(eq);
    const bons = erro ? [] : bomPara(eq, this.loc);
    D.hud.kitBom.className = "kit-bom" + (erro || !bons.length ? " ruim" : "");
    D.hud.kitBom.textContent = erro ? erro : bons.length ? "Pega bem no Aquidauana: " + bons.slice(0, 4).join(", ") : "Essa traia não combina com os peixes do rio. Veja \"Indicado para\" na Loja.";
  }

  _melhorAgora() {
    const t = this.loc?.fishTable || [];
    let best = null, w = 0;
    for (const [id, p] of t) {
      if (["piranha", "mandi"].includes(id)) continue;
      if (p > w) {
        w = p;
        best = id;
      }
    }
    return best;
  }

  /** Chamado depois do cartão de captura: solta o peixe quando a regra manda (piracema, medida, proibido). */
  ajustarCaptura(fish) {
    if (!this.ativo) return;
    const motivo = motivoSoltar(fish, dataLocal());
    if (!motivo) return;
    const S = this.d.S;
    const ult = S.inventory[S.inventory.length - 1];
    if (ult && ult.speciesId === fish.speciesId && ult.sizeCm === fish.sizeCm && !FISH_BY_ID[fish.speciesId].solta) {
      S.inventory.pop();
      this.d.events.emit("inventory");
    }
    const card = document.querySelector("#catch-root .catch-card");
    if (card) {
      const v = card.querySelector(".catch-value");
      if (v) v.textContent = motivo;
      const b = card.querySelector("button");
      if (b) b.textContent = "Soltar o peixe";
    }
  }

  // ---------------------------------------------------------------------------
  // barco, câmera e HUD
  // ---------------------------------------------------------------------------

  _posicionarBarco(dt) {
    const m = this.barcoMesh, B = this.barco, Q = this.mundo.quadro;
    if (!m) return;
    const p = Q.paraMundo(B.x, B.z, this._p);
    this._psiMundo = B.psi + Q.a;
    this._tb = (this._tb || 0) + dt;
    const t = this._tb;
    const vel = Math.abs(B.v);
    // planando: a proa levanta com a velocidade; marola balança
    const proa = Math.min(0.09, vel * 0.009) - (vel > 9 ? (vel - 9) * 0.004 : 0);
    m.position.set(p.x, 0.04 + Math.sin(t * 1.7) * 0.025 + Math.min(0.08, vel * 0.006), p.z);
    m.rotation.set(proa + Math.sin(t * 1.3) * 0.012, -this._psiMundo, -B.giroV * Math.min(1, vel / 6) * 0.22 + Math.sin(t * 1.1) * 0.015, "YXZ");
    const motor = m.userData.motor;
    if (motor) motor.rotation.y = -B.entrada.giro * 0.35;
  }

  _posicionarCameraNavegacao(snap) {
    if (!this.barcoMesh || !Number.isFinite(this._psiMundo)) return;
    this._cameraNavegacao(1 / 60, snap);
  }

  _cameraNavegacao(dt, snap = false) {
    const cam = this.d.camera;
    const m = this.barcoMesh;
    if (this.vistaCima) {
      // vista de cima, norte para cima (comparação com o satélite nos testes)
      const Q = this.mundo.quadro;
      cam.up.set(Q.s, 0, -Q.c);
      cam.position.set(m.position.x, this.vistaCima, m.position.z);
      cam.lookAt(m.position.x, 0, m.position.z);
      cam.fov = 60;
      cam.updateProjectionMatrix();
      this.d.scene.fog.density = 0;
      return;
    }
    cam.up.set(0, 1, 0);
    const psi = this._psiMundo + this.camYawExtra;
    const dx = Math.sin(psi), dz = -Math.cos(psi);
    const v = Math.abs(this.barco.v);
    const atras = 9.5 + v * 0.25, alto = 3.6 + v * 0.06;
    const alvoPos = this._v.set(m.position.x - dx * atras, alto, m.position.z - dz * atras);
    const k = snap || this.velocidadeTeste > 1 ? 1 : 1 - Math.exp(-3.5 * dt);
    this.camPos.lerp(alvoPos, k);
    if (snap) this.camPos.copy(alvoPos);
    this.camOlha.set(m.position.x + dx * 16, 1.2, m.position.z + dz * 16);
    if (!Number.isFinite(this.camPos.x + this.camPos.y + this.camPos.z)) this.camPos.copy(alvoPos);
    cam.position.copy(this.camPos);
    cam.lookAt(this.camOlha);
    const fov = 60 + Math.min(8, v * 0.5);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    if (!this.teclas.size && this.camYawExtra !== 0 && !this._arrastando) this.camYawExtra *= Math.exp(-0.4 * dt);
  }

  _atualizarInfo(cl) {
    const B = this.barco;
    const kmh = Math.abs(B.vx * 0 + Math.hypot(B.vx, B.vz)) * 3.6;
    const ll = this.dados.lonLat(B.x, B.z);
    const paraPindo = (this.pindo.s - B.s) / 1000;
    const pindoTxt = Math.abs(paraPindo) < 0.15 ? "<b>no Pindó!</b>" : `Pindó ${paraPindo > 0 ? "a" : "passou"} <b>${Math.abs(paraPindo).toFixed(1)} km</b>`;
    const nv = this.dados.meta.nivel;
    this.hud.info.innerHTML = `${this.navegando ? `<span><b>${Math.round(kmh)}</b> km/h</span><span class="lv-sep">|</span>` : `<span>⚓ ancorado</span><span class="lv-sep">|</span>`}
      <span>km <b>${(B.s / 1000).toFixed(1)}</b></span><span class="lv-sep">|</span><span>${pindoTxt}</span><span class="lv-sep">|</span>
      <span>${Math.round(cl.temp)} °C · ${cl.descricao}${cl.chovendo ? " 🌧" : ""} · vento ${Math.round(cl.vento)} km/h</span><span class="lv-sep">|</span>
      <span>Rio ${nomeFase(this.fase)}${nv ? ` (${Math.round(nv.cm)} cm)` : ""}</span>`;
    this.hud.miniPe.textContent = `${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)}`;
    this.hud.desenharMini(B, this.dados.meta.pontos.filter((p) => p.tipo === "pindo" || p.tipo === "cidade" || (p.dist_rio ?? 0) < 400));
    const D = this.d;
    D.hud.loc.textContent = "Rio Aquidauana · modo livre";
    D.hud.weather.textContent = `${Math.round(cl.temp)}° ${cl.chovendo ? "Chuva" : cl.nuvem > 0.6 ? "Nublado" : "Limpo"}`;
    this.hud.dica.textContent = this.navegando
      ? this.piloto ? "Piloto automático ligado (P desliga)" : "Arraste o mouse para olhar em volta"
      : "";
  }

  _salvarPosicao() {
    if (!this.barco) return;
    try {
      localStorage.setItem(CHAVE_SALVO, JSON.stringify({ x: this.barco.x, z: this.barco.z, psi: this.barco.psi, t: Date.now() }));
    } catch {
      /* sem armazenamento: começa da cidade da próxima vez */
    }
  }

  // ronco do motor de popa (Web Audio do próprio jogo)
  _motor(ligado, carga) {
    const A = this.d.audio;
    if (!A.ctx || !A.master) return;
    if (!this.motorAudio && ligado) {
      const ctx = A.ctx;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      const filtro = ctx.createBiquadFilter();
      filtro.type = "lowpass";
      filtro.frequency.value = 500;
      const ganho = ctx.createGain();
      ganho.gain.value = 0;
      osc.connect(filtro);
      osc2.connect(filtro);
      filtro.connect(ganho).connect(A.master);
      osc.start();
      osc2.start();
      this.motorAudio = { osc, osc2, filtro, ganho };
    }
    const M = this.motorAudio;
    if (!M) return;
    const t = A.ctx.currentTime;
    const c = Math.min(1, carga);
    M.osc.frequency.setTargetAtTime(38 + c * 70, t, 0.15);
    M.osc2.frequency.setTargetAtTime(19 + c * 35, t, 0.15);
    M.filtro.frequency.setTargetAtTime(300 + c * 900, t, 0.2);
    M.ganho.gain.setTargetAtTime(ligado ? 0.035 + c * 0.06 : 0, t, 0.25);
  }
}
