// [livre] Telas e HUD do modo livre: botão no menu, escolha do rio e da traia, mini-mapa com a posição
// real (lat/lon), mapa grande do trecho com o Pindó marcado, controles na tela (celular), créditos dos dados.

import { GEAR } from "../data/gearData.js";

const $ = (s, r = document) => r.querySelector(s);

const CSS = /* css */ `
#livre-hud { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
#livre-hud .lv-card { pointer-events: auto; background: var(--glass); border: 1px solid var(--stroke); border-radius: 14px;
  box-shadow: var(--shadow); backdrop-filter: blur(6px); }
#livre-info { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); padding: 8px 14px; font-size: .86rem;
  display: flex; gap: 12px; align-items: center; white-space: nowrap; }
#livre-info b { color: var(--gold); font-weight: 700; }
#livre-info .lv-sep { opacity: .35; }
#livre-mini { position: absolute; right: 16px; bottom: 64px; padding: 6px; }
#livre-mini canvas { display: block; border-radius: 10px; width: 190px; height: 190px; }
#livre-mini .lv-mini-pe { font-size: .72rem; color: var(--dim); text-align: center; margin-top: 4px; }
#livre-mini button { position: absolute; top: 10px; left: 10px; padding: 4px 8px; font-size: .72rem; }
#livre-acoes { position: absolute; right: 220px; bottom: 64px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
#livre-acoes .btn { pointer-events: auto; }
#livre-ancora { font-weight: 800; }
#livre-dica { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); font-size: .9rem; color: var(--text);
  background: var(--glass-soft); padding: 6px 14px; border-radius: 10px; white-space: nowrap; }
#livre-creditos { position: absolute; left: 50%; bottom: 2px; transform: translateX(-50%); font-size: .62rem; color: rgba(234,243,250,.72);
  text-shadow: 0 1px 2px #000; white-space: nowrap; pointer-events: auto; }
#livre-creditos a { color: inherit; }
#livre-toque { position: absolute; left: 16px; bottom: 96px; display: none; gap: 10px; }
#livre-toque .lv-pad { pointer-events: auto; width: 64px; height: 64px; border-radius: 50%; font-size: 1.6rem; display: grid; place-items: center;
  background: var(--glass); border: 1px solid var(--stroke); color: var(--text); touch-action: none; user-select: none; }
#livre-toque-acel { position: absolute; right: 16px; bottom: 270px; display: none; flex-direction: column; gap: 10px; }
#livre-hud.lv-toque #livre-toque, #livre-hud.lv-toque #livre-toque-acel { display: flex; }
#livre-hud.lv-ancorado #livre-toque, #livre-hud.lv-ancorado #livre-toque-acel { display: none !important; }
#hud.lv-navegando #hud-kit, #hud.lv-navegando #hud-bag { display: none; }
body.lv-ativo #coach { display: none !important; }
#livre-carregando { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: rgba(4,10,16,.82); }
#livre-carregando .lv-box { text-align: center; }
#livre-carregando .boot-spin { margin: 0 auto 14px; }
.lv-painel .lv-rio { display: grid; grid-template-columns: 1fr; gap: 10px; padding: 14px; border-radius: 14px; border: 1px solid var(--stroke);
  background: rgba(255,255,255,.04); margin-bottom: 14px; }
.lv-painel .lv-rio h3 { font-size: 1.15rem; }
.lv-painel .lv-meta { font-size: .85rem; color: var(--dim); line-height: 1.5; }
.lv-painel .lv-meta b { color: var(--text); font-weight: 600; }
.lv-painel .lv-traia { display: grid; grid-template-columns: 110px 1fr; gap: 8px 10px; align-items: center; font-size: .9rem; margin: 6px 0 12px; }
.lv-painel select { width: 100%; padding: 7px 8px; border-radius: 8px; background: rgba(0,0,0,.35); color: var(--text); border: 1px solid var(--stroke); font: inherit; font-size: .85rem; }
.lv-painel .lv-aviso { font-size: .85rem; color: #ffd27a; margin: 4px 0 10px; }
.lv-painel .lv-ok { font-size: .85rem; color: var(--ok); margin: 4px 0 10px; }
.lv-painel .lv-linha { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.lv-painel .lv-scroll { overflow: auto; max-height: calc(88vh - 90px); padding-right: 4px; }
#livre-mapa .panel { width: min(1000px, 96vw); height: min(760px, 92vh); display: flex; flex-direction: column; }
#livre-mapa .lv-mapa-corpo { flex: 1; display: flex; gap: 14px; min-height: 0; }
#livre-mapa canvas { height: 100%; max-width: 62%; border-radius: 10px; cursor: crosshair; background: #0b1a12; }
#livre-mapa .lv-mapa-lado { flex: 1; overflow: auto; font-size: .88rem; line-height: 1.5; color: var(--dim); }
#livre-mapa .lv-mapa-lado b { color: var(--text); }
#livre-mapa .lv-poi { display: block; width: 100%; text-align: left; margin: 4px 0; }
@media (max-width: 760px) {
  #livre-info { top: auto; bottom: 150px; font-size: .74rem; gap: 6px; padding: 6px 10px; }
  #livre-mini canvas { width: 120px; height: 120px; }
  #livre-mini { bottom: 56px; right: 10px; }
  #livre-acoes { right: 150px; bottom: 56px; }
  #livre-dica { display: none; }
  #livre-creditos { font-size: .52rem; white-space: normal; width: 96vw; text-align: center; }
  #livre-mapa canvas { max-width: 100%; height: 55vh; }
  #livre-mapa .lv-mapa-corpo { flex-direction: column; align-items: center; }
}
`;

export function injetarEstilo() {
  if ($("#livre-estilo")) return;
  const s = document.createElement("style");
  s.id = "livre-estilo";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Botão "Modo livre" no menu principal (logo depois de "Jogar"). */
export function injetarBotaoMenu(onClick) {
  const caixa = $("#screen-menu .menu-buttons");
  if (!caixa || $("#menu-livre")) return;
  const b = document.createElement("button");
  b.id = "menu-livre";
  b.className = "btn btn-primary";
  b.innerHTML = "Modo livre: Rio Aquidauana";
  b.title = "Monte sua traia e desça o Rio Aquidauana de voadeira, com o rio e o clima de verdade";
  const jogar = $("#menu-play");
  if (jogar && jogar.nextSibling) caixa.insertBefore(b, jogar.nextSibling);
  else caixa.appendChild(b);
  b.addEventListener("click", onClick);
}

const fmtData = (iso) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const FASES = { subindo: "subindo (repiquete)", cheio: "cheio", baixando: "baixando (vazante)", seco: "baixo e estável" };
export const nomeFase = (f) => FASES[f] || f;

// ---------------------------------------------------------------------------
// escolha do rio e da traia
// ---------------------------------------------------------------------------

export class PainelEntrada {
  /**
   * @param {object} cb { onPartir(opcoes), onFechar(), economy, compat, temSalvo() }
   */
  constructor(cb) {
    this.cb = cb;
    this.root = document.createElement("div");
    this.root.id = "screen-livre";
    this.root.className = "screen hidden";
    this.root.innerHTML = `<div class="panel panel-mid lv-painel">
      <div class="panel-head"><h2 class="panel-title">Modo livre</h2><button class="btn btn-close" data-a="fechar">Voltar</button></div>
      <div class="lv-scroll"><div data-a="corpo">Carregando o rio…</div></div></div>`;
    document.getElementById("app").appendChild(this.root);
    this.root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "fechar") this.cb.onFechar();
      if (a === "partir") this.cb.onPartir({ inicio: $("[data-a=inicio]", this.root)?.value || "cidade" });
    });
    this.root.addEventListener("change", (e) => {
      const sel = e.target.closest("select[data-cat]");
      if (sel) {
        this.cb.equipar(sel.dataset.cat, +sel.value);
        this.renderTraia();
      }
    });
  }

  abrir(meta, clima) {
    this.meta = meta;
    this.clima = clima;
    this.root.classList.remove("hidden");
    this.render();
  }

  fechar() {
    this.root.classList.add("hidden");
  }

  render() {
    const m = this.meta;
    const corpo = $("[data-a=corpo]", this.root);
    if (!m) {
      corpo.innerHTML = `<p class="lv-aviso">Não deu para baixar os dados do rio. Confira a internet e tente de novo.</p>`;
      return;
    }
    const sat = m.satelite;
    const nv = m.nivel;
    const cl = this.clima;
    const datas = sat.cenas.map((c) => fmtData(c.data)).join(", ");
    corpo.innerHTML = `
      <div class="lv-rio">
        <h3>Rio Aquidauana (MS)</h3>
        <div class="lv-meta">${m.trecho}: <b>${(m.linha.comprimento_m / 1000).toFixed(1)} km de rio</b>, com o Pindó marcado.<br>
        Formato do rio pelo satélite Sentinel-2: imagem mais recente sem nuvem de <b>${fmtData(sat.data_principal)}</b>,
        a maior parte de <b>${fmtData(sat.data_maior_parte || sat.data_principal)}</b> (cenas usadas: ${datas}).<br>
        Nível: ${nv ? `<b>${Math.round(nv.cm)} cm</b> em ${fmtData(nv.data)} na régua da ANA em Aquidauana, <b>${nomeFase(m.fase_rio)}</b>` : "sem leitura recente da ANA (usando o satélite)"}.<br>
        Clima agora: ${cl ? `<b>${Math.round(cl.temp)} °C</b>, ${cl.descricao.toLowerCase()}, vento ${Math.round(cl.vento)} km/h` : "buscando…"}.<br>
        Pacote atualizado em ${fmtData(m.gerado_em)}.</div>
      </div>
      <h3 style="margin:4px 0 6px">Sua traia</h3>
      <div data-a="traia"></div>
      <div class="lv-linha" style="margin-top:10px">
        <label for="lv-inicio" style="font-size:.9rem">Sair de:</label>
        <select id="lv-inicio" data-a="inicio" style="width:auto">
          <option value="cidade">Aquidauana (Ponte da Amizade)</option>
          <option value="pindo">Pindó</option>
          ${this.cb.temSalvo() ? '<option value="salvo" selected>Onde parei da última vez</option>' : ""}
        </select>
        <button class="btn btn-primary btn-big" data-a="partir">Partir de voadeira</button>
      </div>
      <p class="lv-meta" style="margin-top:12px">W/S acelera e freia, A/D vira, Shift dá o máximo, <b>E</b> ancora para pescar, <b>M</b> abre o mapa.
      No celular, use os botões na tela.</p>`;
    this.renderTraia();
  }

  renderTraia() {
    const el = $("[data-a=traia]", this.root);
    if (!el) return;
    const { economy, compat } = this.cb;
    const S = this.cb.S;
    const dono = economy.modoDono();
    const cats = [["rods", "Vara"], ["reels", "Molinete"], ["lines", "Linha"], ["terminals", "Anzol"], ["baits", "Isca"]];
    let html = `<div class="lv-traia">`;
    for (const [cat, rot] of cats) {
      const itens = GEAR[cat].map((it, i) => ({ it, i })).filter(({ i }) => dono || S.gear.owned[cat].includes(i));
      html += `<label>${rot}</label><select data-cat="${cat}">${itens
        .map(({ it, i }) => `<option value="${i}" ${S.gear.equipped[cat] === i ? "selected" : ""}>${it.name}${S.gear.owned[cat].includes(i) ? "" : " (dono)"}</option>`)
        .join("")}</select>`;
    }
    html += `</div>`;
    const erro = compat(economy.getEquipped());
    html += erro ? `<p class="lv-aviso">${erro}</p>` : `<p class="lv-ok">Traia montada. Vara e molinete combinam.</p>`;
    html += `<p class="lv-meta">${dono ? "Conta de administrador: todo o equipamento liberado." : "Aqui aparece o que você já tem. Para comprar mais, use a Loja (B) dentro do rio."}</p>`;
    el.innerHTML = html;
  }
}

// ---------------------------------------------------------------------------
// HUD do rio
// ---------------------------------------------------------------------------

export class HudLivre {
  constructor(cb) {
    this.cb = cb;
    const r = document.createElement("div");
    r.id = "livre-hud";
    r.className = "hidden";
    r.innerHTML = `
      <div id="livre-info" class="lv-card"></div>
      <div id="livre-acoes">
        <button id="livre-ancora" class="btn btn-primary" title="Ancorar / levantar âncora (E)">Ancorar e pescar (E)</button>
        <button id="livre-piloto" class="btn" title="Piloto automático rio abaixo até o Pindó (P)">Piloto até o Pindó (P)</button>
        <button id="livre-tempo" class="btn" title="Acelerar o tempo do jogo">Hora real</button>
      </div>
      <div id="livre-mini" class="lv-card"><canvas width="380" height="380"></canvas><div class="lv-mini-pe"></div><button class="btn" data-a="mapa">Mapa (M)</button></div>
      <div id="livre-toque">
        <div class="lv-pad" data-k="esq">◀</div><div class="lv-pad" data-k="dir">▶</div>
      </div>
      <div id="livre-toque-acel">
        <div class="lv-pad" data-k="acel">▲</div><div class="lv-pad" data-k="re">▼</div>
      </div>
      <div id="livre-dica"></div>
      <div id="livre-creditos"></div>`;
    document.getElementById("app").appendChild(r);
    this.root = r;
    this.info = $("#livre-info", r);
    this.mini = $("#livre-mini canvas", r);
    this.miniPe = $("#livre-mini .lv-mini-pe", r);
    this.dica = $("#livre-dica", r);
    this.creditos = $("#livre-creditos", r);
    this.btnAncora = $("#livre-ancora", r);
    this.btnPiloto = $("#livre-piloto", r);
    this.btnTempo = $("#livre-tempo", r);
    this.btnAncora.addEventListener("click", () => cb.alternarAncora());
    this.btnPiloto.addEventListener("click", () => cb.alternarPiloto());
    this.btnTempo.addEventListener("click", () => cb.alternarTempo());
    $("[data-a=mapa]", r).addEventListener("click", () => cb.abrirMapa());
    this.mini.addEventListener("click", () => cb.abrirMapa());
    // controles de toque: segurar o botão
    this.toque = { esq: false, dir: false, acel: false, re: false };
    for (const pad of r.querySelectorAll(".lv-pad")) {
      const k = pad.dataset.k;
      const on = (e) => {
        e.preventDefault();
        this.toque[k] = true;
      };
      const off = () => (this.toque[k] = false);
      pad.addEventListener("pointerdown", on);
      pad.addEventListener("pointerup", off);
      pad.addEventListener("pointercancel", off);
      pad.addEventListener("pointerleave", off);
    }
    if (matchMedia("(pointer: coarse)").matches) r.classList.add("lv-toque");
    this.base = null; // canvas pré-desenhado do trecho
  }

  mostrar(on) {
    this.root.classList.toggle("hidden", !on);
    document.getElementById("hud")?.classList.toggle("lv-navegando", on && !this.ancorado);
  }

  setAncorado(on) {
    this.ancorado = on;
    this.root.classList.toggle("lv-ancorado", on);
    this.btnAncora.textContent = on ? "Levantar âncora (E)" : "Ancorar e pescar (E)";
    this.btnPiloto.classList.toggle("hidden", on);
    document.getElementById("hud")?.classList.toggle("lv-navegando", !on && !this.root.classList.contains("hidden"));
  }

  setCreditos(lista) {
    this.creditos.textContent = lista.join(" · ");
  }

  /** Desenha uma vez o trecho: satélite + água destacada (1 px = 10 m). */
  prepararBase(dados) {
    const W = dados.cor.w, H = dados.cor.h;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const img = g.createImageData(W, H);
    const cor = dados.cor.d, campo = dados.campo.d;
    const cw = dados.campo.w;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = (y * W + x) * 4;
        const kc = (Math.min(dados.campo.h - 1, y) * cw + Math.min(cw - 1, x)) * 4;
        const agua = campo[kc] < 125;
        if (agua) {
          img.data[k] = 70; img.data[k + 1] = 150; img.data[k + 2] = 235;
        } else {
          img.data[k] = cor[k] * 0.85; img.data[k + 1] = cor[k + 1] * 0.85; img.data[k + 2] = cor[k + 2] * 0.85;
        }
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    this.base = c;
    this.dados = dados;
  }

  /** Mini-mapa: norte para cima, janela de ~1,4 km em volta do barco. */
  desenharMini(b, pontos) {
    const D = this.dados;
    if (!this.base || !D) return;
    const cv = this.mini, g = cv.getContext("2d");
    const S = cv.width;
    const janela = 1400; // m
    const px = (b.x - D.gx0) / 10, pz = (b.z - D.gz0) / 10;
    const lado = janela / 10;
    g.fillStyle = "#123018";
    g.fillRect(0, 0, S, S);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.base, px - lado / 2, pz - lado / 2, lado, lado, 0, 0, S, S);
    const esc = S / lado;
    // pontos de interesse
    for (const p of pontos) {
      const x = ((p.xz[0] - D.gx0) / 10 - px) * esc + S / 2, y = ((p.xz[1] - D.gz0) / 10 - pz) * esc + S / 2;
      if (x < -20 || y < -20 || x > S + 20 || y > S + 20) {
        // fora da janela: seta na borda apontando para o Pindó
        if (p.tipo === "pindo") {
          const a = Math.atan2(y - S / 2, x - S / 2);
          const ex = S / 2 + Math.cos(a) * (S / 2 - 18), ey = S / 2 + Math.sin(a) * (S / 2 - 18);
          g.fillStyle = "#ff4d4d";
          g.beginPath();
          g.arc(ex, ey, 9, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#fff";
          g.font = "bold 14px Outfit, sans-serif";
          g.textAlign = "center";
          g.fillText("P", ex, ey + 5);
        }
        continue;
      }
      marcador(g, x, y, p);
    }
    // barco
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(b.psi);
    g.fillStyle = "#ffd34d";
    g.strokeStyle = "#000";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -16);
    g.lineTo(10, 12);
    g.lineTo(0, 6);
    g.lineTo(-10, 12);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    // norte
    g.fillStyle = "rgba(0,0,0,.5)";
    g.fillRect(S - 34, 6, 28, 28);
    g.fillStyle = "#fff";
    g.font = "bold 18px Outfit, sans-serif";
    g.textAlign = "center";
    g.fillText("N", S - 20, 27);
  }
}

function marcador(g, x, y, p, escala = 1) {
  const pindo = p.tipo === "pindo";
  const cidade = p.tipo === "cidade";
  g.save();
  g.translate(x, y);
  g.scale(escala, escala);
  if (pindo) {
    g.strokeStyle = "#fff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -30);
    g.stroke();
    g.fillStyle = "#ff3b3b";
    g.beginPath();
    g.moveTo(0, -30);
    g.lineTo(22, -23);
    g.lineTo(0, -16);
    g.closePath();
    g.fill();
    g.fillStyle = "#ff3b3b";
    g.beginPath();
    g.arc(0, 0, 6, 0, Math.PI * 2);
    g.fill();
    g.font = "bold 20px Outfit, sans-serif";
    g.textAlign = "left";
    g.lineWidth = 4;
    g.strokeStyle = "rgba(0,0,0,.8)";
    g.strokeText("Pindó", 8, -34);
    g.fillStyle = "#fff";
    g.fillText("Pindó", 8, -34);
  } else {
    g.fillStyle = cidade ? "#ffffff" : "#ffd34d";
    g.beginPath();
    g.arc(0, 0, cidade ? 7 : 5, 0, Math.PI * 2);
    g.fill();
    if (cidade || p.label) {
      g.font = "bold 16px Outfit, sans-serif";
      g.textAlign = "left";
      g.lineWidth = 4;
      g.strokeStyle = "rgba(0,0,0,.8)";
      g.strokeText(p.nome, 10, 5);
      g.fillStyle = "#fff";
      g.fillText(p.nome, 10, 5);
    }
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// mapa grande do trecho
// ---------------------------------------------------------------------------

export class MapaGrande {
  constructor(cb) {
    this.cb = cb;
    const r = document.createElement("div");
    r.id = "livre-mapa";
    r.className = "screen hidden";
    r.innerHTML = `<div class="panel">
      <div class="panel-head"><h2 class="panel-title">Rio Aquidauana: o trecho</h2>
        <button class="btn" data-a="pesqueiros">Pesqueiros (sair do rio)</button>
        <button class="btn btn-close" data-a="fechar">Voltar ao barco</button></div>
      <div class="lv-mapa-corpo"><canvas></canvas><div class="lv-mapa-lado"></div></div></div>`;
    document.getElementById("app").appendChild(r);
    this.root = r;
    this.cv = $("canvas", r);
    this.lado = $(".lv-mapa-lado", r);
    r.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "fechar") cb.fechar();
      if (a === "pesqueiros") cb.pesqueiros();
      const ir = e.target.closest("[data-ir]");
      if (ir) cb.irPara(+ir.dataset.ir);
    });
    this.cv.addEventListener("click", (e) => {
      const p = this._paraRio(e);
      if (p) cb.levarPara(p.x, p.z);
    });
    this.cv.addEventListener("pointermove", (e) => {
      const p = this._paraRio(e);
      this.cursor = p;
      if (p && this.dados) {
        const ll = this.dados.lonLat(p.x, p.z);
        this.cv.title = `${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)} · clique para levar o barco até o rio mais perto`;
      }
    });
  }

  get aberto() {
    return !this.root.classList.contains("hidden");
  }

  abrir(dados, base, barco, pontos, info) {
    this.dados = dados;
    this.base = base;
    this.root.classList.remove("hidden");
    const alt = Math.min(this.cv.parentElement.clientHeight || 600, 1400);
    this.esc = alt / base.height;
    this.cv.height = alt * 2;
    this.cv.width = Math.round(base.width * this.esc * 2);
    this.cv.style.height = alt + "px";
    this.cv.style.width = Math.round(base.width * this.esc) + "px";
    this.desenhar(barco, pontos);
    this.lado.innerHTML = info +
      `<p style="margin-top:10px"><b>Ir direto para:</b></p>` +
      pontos.filter((p) => p.tipo === "pindo" || p.tipo === "cidade" || p.dist_rio < 400).map((p) =>
        `<button class="btn lv-poi" data-ir="${p.s}">${p.tipo === "pindo" ? "🚩 " : ""}${p.nome} · km ${(p.s / 1000).toFixed(1)}</button>`).join("") +
      `<p style="margin-top:10px">Clique no mapa para levar o barco até o ponto do rio mais perto.</p>`;
  }

  fechar() {
    this.root.classList.add("hidden");
  }

  _paraRio(e) {
    if (!this.dados) return null;
    const r = this.cv.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fz = (e.clientY - r.top) / r.height;
    const D = this.dados;
    return { x: D.gx0 + fx * this.base.width * 10, z: D.gz0 + fz * this.base.height * 10 };
  }

  desenhar(barco, pontos) {
    const g = this.cv.getContext("2d");
    const k = this.cv.width / this.base.width;
    const D = this.dados;
    g.drawImage(this.base, 0, 0, this.cv.width, this.cv.height);
    // linha do trecho navegável
    g.strokeStyle = "rgba(255,255,255,.55)";
    g.lineWidth = 2;
    g.setLineDash([6, 6]);
    g.beginPath();
    for (let i = 0; i < D.lx.length; i += 3) {
      const x = ((D.lx[i] - D.gx0) / 10) * k, y = ((D.lz[i] - D.gz0) / 10) * k;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.setLineDash([]);
    for (const p of pontos) {
      const x = ((p.xz[0] - D.gx0) / 10) * k, y = ((p.xz[1] - D.gz0) / 10) * k;
      marcador(g, x, y, { ...p, label: p.tipo === "cidade" }, 1.3);
    }
    const bx = ((barco.x - D.gx0) / 10) * k, by = ((barco.z - D.gz0) / 10) * k;
    g.save();
    g.translate(bx, by);
    g.rotate(barco.psi);
    g.fillStyle = "#ffd34d";
    g.strokeStyle = "#000";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -22);
    g.lineTo(14, 16);
    g.lineTo(0, 8);
    g.lineTo(-14, 16);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// carregando
// ---------------------------------------------------------------------------

export function mostrarCarregando(texto) {
  let el = document.getElementById("livre-carregando");
  if (!texto) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "livre-carregando";
    el.innerHTML = `<div class="lv-box"><div class="boot-spin"></div><div class="boot-text"></div></div>`;
    document.getElementById("app").appendChild(el);
  }
  el.querySelector(".boot-text").textContent = texto;
}
