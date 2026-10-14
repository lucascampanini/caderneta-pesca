// Guia do pescador: controles, como montar o conjunto, a tabela de cada peixe (dos dados da Caderneta)
// e os pesqueiros. Abre pelo menu e pelo Pausar.

import { REGRAS } from "../data/caderneta.js";
import { FISH_SPECIES, RARITIES } from "../data/fishData.js";
import { LOCATIONS } from "../data/locationData.js";
import { hookTxt } from "../data/gearData.js";
import { formatMoney } from "../utils/utils.js";
import { GEAR, GEAR_CATS, gearStatLines } from "../data/gearData.js";
import { indicadoPara } from "../gameplay/rules.js";
import { fotoItem } from "./vitrine.js";

const ABAS = [
  ["controles", "Como jogar"],
  ["equip", "Montar o conjunto"],
  ["equipamentos", "Equipamentos"],
  ["peixes", "Peixes e iscas"],
  ["lugares", "Pesqueiros"],
];

const HORA = { dawn: "amanhecer", day: "dia", dusk: "entardecer", night: "noite" };
const ZONA = { shallow: "rasa", mid: "média", deep: "funda" };

function controles() {
  return `<ol class="guia-passos">
    <li><b>Mirar.</b> Mova o mouse (ou arraste o dedo) para os lados. Os pontinhos mostram onde a boia cai.</li>
    <li><b>Arremessar.</b> Segure o clique, a barra de espaço ou o dedo na tela. A barra de força enche e esvazia: solte com ela cheia para ir longe. Perto da margem a água é rasa; longe, é funda, onde vivem os bagres grandes.</li>
    <li><b>Esperar.</b> Tremidinha na boia é beliscada: não puxe. Quando ela afundar e aparecer o <span class="excl">!</span>, fisgue.</li>
    <li><b>Fisgar.</b> Clique (ou toque) na hora do <span class="excl">!</span>. Peixe raro dá menos tempo.</li>
    <li><b>Brigar.</b> Segure para puxar: a barra <b>Captura</b> enche e a <b>Tensão</b> sobe. Solte para aliviar. Em <b style="color:var(--danger)">Arrancada</b>, solte e deixe o peixe correr. Se a tensão chegar ao fim, a linha arrebenta; se você ficar muito tempo sem puxar, ele se solta.</li>
    <li><b>Recolher sem peixe.</b> Segure o clique enquanto espera, ou aperte <kbd>R</kbd>.</li>
    <li><b>Vender e evoluir.</b> Venda na Loja (<kbd>B</kbd>), compre equipamento, libere pesqueiros no Mapa (<kbd>M</kbd>) e complete o Diário (<kbd>J</kbd>). Horário, tempo e lugar mudam o que morde; tempo nublado ajuda.</li>
    <li><b>Dourado</b> tem captura proibida em MS até 2027: no jogo ele rende XP e é solto.</li>
  </ol>
  <div class="guia-row"><button class="btn" data-tutorial>Refazer o tutorial</button></div>`;
}

function equip() {
  return `<p class="guia-intro">O jogo segue as mesmas regras da Caderneta Pantaneira. Cada peixe pede um conjunto; o cartão <b>Meu conjunto</b>, embaixo à esquerda, mostra quais peixes do pesqueiro o seu conjunto pega bem.</p>
  <div class="guia-cards">
    <div class="guia-card"><h4>Vara e molinete combinam</h4><p>Vara de molinete leva molinete; vara de carretilha leva carretilha. O caniço não usa nenhum dos dois e só alcança a água rasa.</p></div>
    <div class="guia-card"><h4>O elo mais fraco arrebenta</h4><p>Linha (lb), vara (libragem) e freio do molinete (drag) precisam aguentar o peixe. O mais fraco dos três decide. Peixe maior que o conjunto: a tensão sobe rápido e a linha estoura.</p></div>
    <div class="guia-card"><h4>Anzol do tamanho da boca</h4><p>Anzol grande demais: o peixe belisca e rouba a isca. Pequeno demais: abre na briga. Em isca artificial vale a garatéia da própria isca.</p></div>
    <div class="guia-card"><h4>Dente pede aço</h4><p>Piranha, traíra, cachorra, dourado e jaú cortam a linha. Use anzol com empate de aço.</p></div>
    <div class="guia-card"><h4>Cada peixe tem a sua isca</h4><p>Com a isca errada, quase nada morde. A isca certa atrai a espécie e faz a mordida vir mais rápido.</p></div>
    <div class="guia-card"><h4>Mono ou multi</h4><p>Multifilamento não estica: arremessa mais longe e dá mais tempo para fisgar. Monofilamento estica e perdoa os trancos da briga.</p></div>
  </div>`;
}

function equipamentos() {
  return `<p class="guia-intro">Todos os equipamentos do jogo, com especificação e os peixes em que cada um é o indicado pela Caderneta.</p>
  ${GEAR_CATS.map((c) => `<h3 class="guia-h3">${c.label}</h3><div class="guia-equip">${GEAR[c.key].map((it) => {
    const ind = indicadoPara(c.key, it);
    return `<div class="guia-item"><img class="shop-thumb-${c.key}" src="${fotoItem(c.key, it)}" alt="">
      <div><div class="gi-nome">${it.name}</div>
      <div class="gp-l">${gearStatLines(c.key, it).join(" · ")} · ${it.price ? `${formatMoney(it.price)} · nível ${it.level}` : "inicial"}</div>
      <div class="gp-l">${it.blurb}</div>
      ${ind.length ? `<div class="gp-l gi-ind"><b>Indicado para:</b> ${ind.join(", ")}</div>` : ""}</div></div>`;
  }).join("")}</div>`).join("")}`;
}

function peixes() {
  const ordem = [...FISH_SPECIES].sort((a, b) => RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.name.localeCompare(b.name));
  const lugares = (sp) => LOCATIONS.filter((l) => l.fishTable.some(([id]) => id === sp.id)).map((l) => l.name.replace(/ \(.*\)/, "")).join(", ");
  return `<p class="guia-intro">Do mesmo banco de dados do site. Linha em libras (lb); anzol no padrão 2/0, 1/0, nº 2.</p>
  <div class="guia-tabela">${ordem.map((sp) => {
    const r = REGRAS[sp.id];
    if (!r) return "";
    return `<div class="guia-peixe">
      <img src="../fotos/${sp.id}-card.webp" alt="" loading="lazy" onerror="this.remove()">
      <div><div class="gp-nome" style="color:${RARITIES[sp.rarity].color}">${sp.name} <span>${RARITIES[sp.rarity].label}</span></div>
      <div class="gp-l"><b>Iscas:</b> ${r.melhores.join(", ")}</div>
      <div class="gp-l"><b>Conjunto:</b> linha ${r.linha[0]}–${r.linha[1]} lb${r.anzol ? ` · anzol ${hookTxt(r.anzol[0])} a ${hookTxt(r.anzol[1])}` : ""}${r.aco ? " · <b class=\"gp-aco\">empate de aço</b>" : ""}</div>
      <div class="gp-l"><b>Onde e quando:</b> ${lugares(sp)} · água ${sp.zones.map((z) => ZONA[z]).join("/")} · ${sp.time.map((t) => HORA[t]).join(", ")}</div>
      ${sp.solta ? '<div class="gp-l gp-aco">Pesque e solte: captura proibida em MS.</div>' : ""}</div></div>`;
  }).join("")}</div>`;
}

function lugares() {
  return `<div class="guia-cards">${LOCATIONS.map((l) => `<div class="guia-card"><h4>${l.name}</h4><p>${l.blurb}</p>
    <p class="gp-l">${l.unlock.cost ? `Libera no nível ${l.unlock.level} por ${formatMoney(l.unlock.cost)}` : "Liberado desde o começo"}</p></div>`).join("")}</div>`;
}

export function renderGuia(tabsEl, contentEl, aba, onAba) {
  tabsEl.innerHTML = ABAS.map(([k, t]) => `<button class="tab-btn${k === aba ? " active" : ""}" data-aba="${k}">${t}</button>`).join("");
  tabsEl.onclick = (e) => { const b = e.target.closest("[data-aba]"); if (b) onAba(b.dataset.aba); };
  contentEl.innerHTML = { controles, equip, equipamentos, peixes, lugares }[aba]();
  contentEl.scrollTop = 0;
}
