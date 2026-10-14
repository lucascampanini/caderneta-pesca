// Tutorial guiado da primeira partida: um cartão no alto da tela que acompanha cada etapa
// (mirar, arremessar, esperar, fisgar, brigar, vender, montar o conjunto) e avança sozinho
// conforme os eventos do jogo. Enquanto ele dura, o primeiro peixe é um comum e mais fácil.

import { S, events, Phase } from "../state/gameState.js";
import { saveGame } from "../state/saveLoad.js";
import { audio } from "../audio/audioManager.js";

const toque = () => window.matchMedia("(pointer: coarse)").matches;

const PASSOS = [
  { t: "Bem-vindo à Baía Pantaneira!", x: () => `Em um minuto eu te mostro o básico. Sua traia agora é o kit de quem começa na beira: <b>caniço de bambu</b>, linha 0,30, anzol nº 2 e <b>minhoca</b>.`, botao: "Vamos lá" },
  { t: "1. Mirar", x: () => toque() ? "Arraste o dedo para os lados. Os pontinhos na água mostram onde a boia vai cair." : "Mova o mouse para os lados. Os pontinhos na água mostram onde a boia vai cair.", ate: "mirou", botao: "Entendi" },
  { t: "2. Arremessar", x: () => `${toque() ? "Encoste o dedo na tela e segure" : "Segure o clique (ou a barra de espaço)"}: a barra de <b>FORÇA</b> enche e esvazia. Solte com ela cheia para ir mais longe. Com caniço, a boia só alcança a beira: é ali que ficam os peixes miúdos.`, ate: "bobber:landed" },
  { t: "3. Esperar a mordida", x: () => "Olhe a boia. Tremidinha é o peixe beliscando: <b>não puxe ainda</b>. Quando ela afundar e aparecer o <b class=\"excl\">!</b> vermelho, é a hora.", ate: "bite:start" },
  { t: "4. FISGA!", x: () => `${toque() ? "Toque na tela" : "Clique"} <b>agora</b> para cravar o anzol!`, ate: "bite:hooked", urgente: true },
  { t: "5. A briga", x: () => `${toque() ? "Segure o dedo" : "Segure o clique"} para puxar: a barra <b>CAPTURA</b> enche. Puxar sobe a <b>TENSÃO</b>; se ela chegar ao fim, a linha arrebenta. Quando aparecer <b style="color:var(--danger)">ARRANCADA</b>, solte e deixe o peixe correr.`, ate: "fight:landed" },
  { t: "Pegou!", x: () => "O peixe foi para o samburá. Abra a <b>Loja</b> (botão no alto ou tecla <kbd>B</kbd>) para vender.", ate: "loja" },
  { t: "6. Equipamento de verdade", x: () => "Venda o peixe na aba <b>Vender</b>. Depois olhe as abas: cada peixe pede um conjunto, igual na Caderneta (vara, molinete, linha, anzol e isca). Em cada item, <b>Indicado para</b> mostra os peixes certos. Dica: a <b>massa com ceva</b> é barata e piau e pacu-peva adoram.", botao: "Entendi" },
  { t: "Pronto para pescar!", x: () => "Embaixo, à esquerda, fica o seu conjunto e os peixes que ele pega bem neste pesqueiro. Quando um peixe escapar, eu explico o motivo. O <b>Guia</b> (no menu Pausar) tem tudo explicado.", botao: "Pescar" },
];

export class Tutorial {
  constructor() {
    this.el = document.createElement("div");
    this.el.id = "coach";
    this.el.className = "coach hidden";
    this.el.setAttribute("role", "status");
    document.getElementById("app").appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      audio.play("click");
      if (b.dataset.pular !== undefined) this.terminar();
      else this.avancar();
    });
    this.mov = 0;
    this.ultimoX = null;
    window.addEventListener("pointermove", (e) => {
      if (!this.ativo() || S.tutorial.step !== 1) return;
      if (this.ultimoX !== null) this.mov += Math.abs(e.clientX - this.ultimoX);
      this.ultimoX = e.clientX;
      if (this.mov > window.innerWidth * 0.35) this.chegou("mirou");
    });
    const on = (ev, fn) => events.on(ev, (d) => { if (this.ativo()) fn(d); });
    for (const ev of ["bobber:landed", "bite:start", "bite:hooked", "fight:landed"]) on(ev, () => this.chegou(ev));
    on("bite:missed", () => this.mostrar(3, "Passou do tempo, sem problema: o peixe volta. Fique de olho e reaja assim que aparecer o <b class=\"excl\">!</b>."));
    on("fight:snap", () => this.mostrar(2, "A linha arrebentou: a tensão chegou ao fim. Faz parte! Arremesse de novo e solte quando a barra ficar vermelha."));
    on("fight:escape", () => this.mostrar(2, "Escapou! Se você para de puxar por muito tempo, ele se solta. Arremesse de novo."));
    on("phase", ({ to }) => {
      if (to === Phase.SHOP) this.chegou("loja");
      if (to === Phase.MENU || to === Phase.CATCH) this.el.classList.add("hidden");
      else if (to === Phase.IDLE && this.el.classList.contains("hidden")) this.mostrar(S.tutorial.step);
    });
  }

  ativo() {
    return !!S.tutorial && !S.tutorial.done;
  }

  /** O primeiro peixe ainda é o "de treino" (comum e mais fácil)? */
  treino() {
    return this.ativo() && S.tutorial.step <= 5;
  }

  comecar() {
    S.tutorial = { step: 0, done: false };
    this.mov = 0;
    this.mostrar(0);
  }

  chegou(ev) {
    const p = PASSOS[S.tutorial.step];
    if (p && p.ate === ev) this.avancar();
  }

  avancar() {
    S.tutorial.step += 1;
    if (S.tutorial.step >= PASSOS.length) return this.terminar();
    saveGame();
    this.mostrar(S.tutorial.step);
  }

  terminar() {
    S.tutorial = { step: PASSOS.length, done: true };
    saveGame();
    this.el.classList.add("hidden");
  }

  mostrar(i, aviso = "") {
    if (!this.ativo()) return;
    S.tutorial.step = i;
    const p = PASSOS[i];
    this.el.className = `coach${p.urgente ? " urgente" : ""}`;
    this.el.innerHTML = `<div class="coach-head"><span class="coach-n">${i === 0 || i >= 6 ? "" : `${i} de 5`}</span><button class="coach-skip" data-pular>Pular tutorial</button></div>
      <div class="coach-t">${p.t}</div>
      ${aviso ? `<div class="coach-aviso">${aviso}</div>` : ""}
      <div class="coach-x">${p.x()}</div>
      ${p.botao ? `<div class="coach-row"><button class="btn btn-primary">${p.botao}</button></div>` : ""}`;
  }
}
