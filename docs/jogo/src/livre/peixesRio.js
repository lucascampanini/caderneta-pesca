// [livre] Peixes do Rio Aquidauana e regras de pesca do modo livre.
//
// A tabela base é a do rio (espécies de data/fishData.js que ocorrem no Aquidauana). O peso de cada uma
// muda com o clima ao vivo, a fase do nível do rio e a cor da água, pelos mesmos fatores −2..+2 da
// Caderneta (fatoresCaderneta.js, gerado de src/data.js), e a hora do dia entra pelo sistema de mordida.
//
// Regras (decisão documentada em assets/rios/CREDITOS.md):
//  - Piracema em MS (5/nov a 28/fev): a pesca nos rios fica só no PESQUE E SOLTE — o peixe conta no
//    diário e no XP, mas não vai para o samburá nem rende dinheiro.
//  - Dourado: captura proibida em MS (moratória até 2027): sempre solto (já marcado em fishData.js).
//  - Medidas mínimas de referência em MS: peixe abaixo da medida volta para a água.
//    São valores de referência para o jogo; a pessoa deve conferir a legislação vigente do IMASUL.

import { FISH_BY_ID } from "../data/fishData.js";
import { FATORES } from "./fatoresCaderneta.js";

export const TABELA_AQUIDAUANA = [
  ["piranha", 16], ["mandi", 14], ["piavucu", 12], ["curimbata", 10], ["armado", 9], ["pacupeva", 8],
  ["trespintas", 8], ["barbado", 6], ["palmito", 6], ["piraputanga", 6], ["jurupensem", 5], ["pacu", 5],
  ["corvina", 4], ["jurupoca", 4], ["piapara", 4], ["cachorra", 3], ["traira", 3], ["cachara", 3],
  ["pintado", 2.5], ["dourado", 1.2], ["jau", 0.8],
].filter(([id]) => FISH_BY_ID[id]);

/** Medida mínima de referência (cm) em MS. */
export const MEDIDA_MINIMA = {
  pintado: 80, cachara: 80, pacu: 45, piavucu: 38, piraputanga: 30, curimbata: 38, jau: 95, barbado: 60,
};

/** Piracema em MS: de 5 de novembro a 28 (29) de fevereiro. */
export function emPiracema({ mes, dia }) {
  return (mes === 11 && dia >= 5) || mes === 12 || mes === 1 || mes === 2;
}

/** Cor da água pela razão vermelho/azul do satélite no meio do canal. */
export function corDaAgua(meta) {
  const r = meta?.satelite?.razao_vermelho_azul ?? 1.8;
  return r > 1.45 ? "barrenta" : r > 1.12 ? "verde" : "clara";
}

const pesoFator = (soma) => Math.pow(1.38, Math.max(-4, Math.min(4, soma)));

/**
 * Tabela de peixes e multiplicador de mordida para o momento.
 * @param {{condicao:string, temp:number}} clima
 * @param {string} fase   subindo | cheio | baixando | seco
 * @param {string} agua   clara | verde | barrenta
 * @param {number} hora   0..24
 */
export function tabelaDoMomento(clima, fase, agua, hora) {
  const linhas = [];
  let soma = 0, somaBase = 0;
  for (const [id, base] of TABELA_AQUIDAUANA) {
    const f = FATORES[id];
    const s = f ? (f.c?.[clima.condicao] ?? 0) + (f.n?.[fase] ?? 0) + (f.a?.[agua] ?? 0) : 0;
    const w = base * pesoFator(s);
    linhas.push([id, Math.round(w * 100) / 100]);
    soma += w;
    somaBase += base;
  }
  // mordida: quanto os peixes daqui estão "a fim" agora (média dos fatores), madrugada e fim de tarde
  // melhores, frio e calor forte atrapalham
  let mult = Math.min(1.7, Math.max(0.55, soma / somaBase));
  const h = ((hora % 24) + 24) % 24;
  if ((h >= 5 && h < 8.5) || (h >= 16.5 && h < 19.5)) mult *= 1.18;
  else if (h >= 11 && h < 15) mult *= 0.88;
  if (clima.temp < 18) mult *= 0.75;
  else if (clima.temp > 35) mult *= 0.85;
  return { fishTable: linhas, biteMult: Math.round(mult * 100) / 100 };
}

/** Dica da Caderneta de onde procurar, para a espécie e a fase do rio. */
export function dicaOnde(id, fase) {
  return FATORES[id]?.onde?.[fase] || "";
}

/**
 * Precisa soltar este peixe? Devolve o motivo ou null.
 * @param {object} fish  instância rolada (speciesId, sizeCm)
 */
export function motivoSoltar(fish, data) {
  const sp = FISH_BY_ID[fish.speciesId];
  if (sp?.solta) return "Espécie protegida em MS: foto e solte!";
  if (emPiracema(data)) return "Piracema (5/nov a 28/fev): só pesque e solte nos rios de MS.";
  const min = MEDIDA_MINIMA[fish.speciesId];
  if (min && fish.sizeCm < min) return `Abaixo da medida mínima (${min} cm): devolva para crescer.`;
  return null;
}
