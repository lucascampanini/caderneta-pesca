// Regras da Caderneta aplicadas ao jogo: o conjunto montado (vara, molinete, linha, anzol, isca)
// é comparado com o que cada peixe pede (data/caderneta.js, gerado dos dados do site).
// Daqui saem a chance de cada espécie morder, a força da linha na briga e as explicações quando algo dá errado.

import { REGRAS } from "../data/caderneta.js";
import { FISH_BY_ID, FISH_SPECIES } from "../data/fishData.js";
import { hookTxt } from "../data/gearData.js";
import { clamp, lerp } from "../utils/utils.js";
import { CONFIG } from "../data/config.js";

const nomeDe = (id) => FISH_BY_ID[id]?.name ?? id;

/** Vara e molinete combinam? Devolve null se sim, ou o motivo. */
export function compat(eq) {
  const v = eq.rod.tipo, m = eq.reel.tipo;
  if (v === "canico" && m !== "nenhum") return "Caniço não leva molinete. Na Loja, use \"Sem molinete\" ou troque de vara.";
  if (v === "molinete" && m !== "molinete") return m === "nenhum" ? "Vara de molinete precisa de um molinete. Escolha um na Loja." : "Vara de molinete pede molinete: o passador grande fica embaixo. Carretilha vai em vara de carretilha.";
  if (v === "carretilha" && m !== "carretilha") return m === "nenhum" ? "Vara de carretilha precisa de uma carretilha. Escolha uma na Loja." : "Vara de carretilha pede carretilha: os passadores ficam em cima. Molinete vai em vara de molinete.";
  return null;
}

/** 0 a 3: quanto a espécie gosta da isca (mesma nota da Caderneta). */
export function baitScore(speciesId, bait) {
  const r = REGRAS[speciesId];
  if (!r) return 1;
  return Math.max(0, ...bait.keys.map((k) => r.iscas[k] || 0));
}

// em que altura da água cada isca artificial trabalha
const COLUNA_ART = { zara: "sup", helice: "sup", popper: "sup", sapo: "sup", meia: "meia", colher: "meia", spinner: "meia", jig: "fundo", shad: "fundo", crank: "fundo" };

/** Como se pesca com o conjunto: "boia", "fundo" ou "artificial" (isca artificial dispensa boia e chumbada). */
export function modoPesca(eq) {
  if (eq.bait.art) return "artificial";
  return eq.rig?.tipo === "fundo" ? "fundo" : "boia";
}

/** Alturas da água em que a isca fica com esse conjunto. */
export function colunaDoConjunto(eq) {
  if (eq.bait.art) return [...new Set(eq.bait.keys.map((k) => COLUNA_ART[k]).filter(Boolean))];
  return eq.rig?.coluna || ["meia", "sup"];
}

/** A isca está na altura em que a espécie come? (1 sim, 0,2 quase nunca) */
export function colunaMult(speciesId, eq) {
  const r = REGRAS[speciesId];
  if (!r || !eq) return 1;
  const cols = eq.bait.art ? r.colunasArt : r.colunas;
  // peixe que não ataca isca artificial nenhuma (piauçu, curimbatá, bagres de fundo...) não pega artificial
  if (!cols || !cols.length) return eq.bait.art ? 0 : 1;
  return colunaDoConjunto(eq).some((c) => cols.includes(c)) ? 1 : eq.bait.art ? 0.08 : 0.2;
}

/** Peso da espécie no sorteio de mordida, conforme a isca e a altura em que ela está. */
export const baitMult = (speciesId, bait, eq = null) => {
  const p = baitScore(speciesId, bait);
  return (p > 0 ? 0.3 + 0.6 * p : bait.art ? 0.005 : 0.05) * colunaMult(speciesId, eq);
};

/** Alcance do arremesso em metros com a vara e a linha atuais. */
export function maxCast(eq) {
  const k = eq.line.tipo === "multi" ? 1.08 : eq.line.lb >= 40 ? 0.94 : 1;
  return eq.rod.tipo === "canico" ? eq.rod.maxDist : eq.rod.maxDist * k;
}

/** A vara alcança a zona onde a espécie vive? */
export function alcanca(speciesId, eq) {
  // a boia cai uns 3 m além do alcance da linha, por causa da ponta da vara à frente do pescador
  const d = maxCast(eq) + 3, z = FISH_BY_ID[speciesId].zones;
  return z.includes("shallow") || (z.includes("mid") && d > CONFIG.zones.shallowMax) || (z.includes("deep") && d > CONFIG.zones.midMax);
}

/**
 * Compara o conjunto com o que o peixe pede.
 * sizeNorm: 0 = menor tamanho da espécie, 1 = maior.
 */
export function avaliar(speciesId, eq, sizeNorm = 0.5) {
  const r = REGRAS[speciesId];
  const nome = nomeDe(speciesId);
  const art = !!eq.bait.art;
  const out = { speciesId, nome, problemas: [], ratio: 1, lineStrength: 1, control: 1, hookWindowMult: 1, dentes: false, anzolPequeno: false, anzolGrande: false, fraco: null };
  if (!r) return out;

  // elo mais fraco: linha, vara (aguenta ~30% acima da libragem) ou freio do molinete (~1/3 da linha que ele segura)
  // o mínimo da faixa da Caderneta serve para o peixe pequeno; o meio da faixa já segura o troféu
  const need = lerp(r.linha[0], (r.linha[0] + r.linha[1]) / 2, clamp(sizeNorm, 0, 1));
  const caps = [
    ["linha", eq.line.lb],
    ["vara", eq.rod.lb[1] * 1.3],
    ["molinete", eq.reel.drag * 7],
  ];
  caps.sort((a, b) => a[1] - b[1]);
  const [fraco, cap] = caps[0];
  out.ratio = cap / need;
  out.lineStrength = clamp(0.3 + 0.85 * out.ratio, 0.45, 2.4);
  const varaPede = r.vara ? r.vara[1] : need;
  out.control = clamp(0.75 + 0.45 * Math.min(eq.rod.lb[1] / varaPede, 1.8), 0.85, 1.6) * (eq.line.tipo === "mono" ? 1.08 : 1);
  // vara pesada demais tira a sensibilidade da beliscada; multifilamento, por não esticar, aumenta
  if (eq.rod.lb[0] > varaPede * 1.2) out.hookWindowMult *= 0.75;
  if (eq.line.tipo === "multi") out.hookWindowMult *= 1.15;

  if (out.ratio < 0.9) {
    out.fraco = fraco;
    const txt = {
      linha: `Linha de ${eq.line.lb} lb fraca para ${nome} desse tamanho: a Caderneta pede ${r.linha[0]}–${r.linha[1]} lb.`,
      vara: `Vara de ${eq.rod.lb[0]}–${eq.rod.lb[1]} lb leve demais para ${nome}${r.vara ? ` (o indicado é ${r.vara[0]}–${r.vara[1]} lb)` : ""}.`,
      molinete: eq.reel.tipo === "nenhum" ? `Sem molinete não dá para dar linha: ${nome} grande arrasta você. Monte vara com molinete.` : `O freio (drag ${eq.reel.drag} kg) não segura ${nome} desse porte. Use molinete ou carretilha maior.`,
    }[fraco];
    out.problemas.push(txt);
  }
  if (r.aco && !eq.term.aco) {
    out.dentes = true;
    out.problemas.push(`${nome} tem dentes: sem empate de aço ele corta a linha.`);
  }
  if (!art && r.anzol) {
    if (eq.term.hook < r.anzol[0] - 2) {
      out.anzolPequeno = true;
      out.problemas.push(`Anzol ${hookTxt(eq.term.hook)} pequeno para ${nome}: abre na briga. ${r.anzolTxt}.`);
    } else if (eq.term.hook > r.anzol[1] + 2) {
      out.anzolGrande = true;
      out.problemas.push(`Anzol ${hookTxt(eq.term.hook)} grande demais para a boca do ${nome}: ele rouba a isca. ${r.anzolTxt}.`);
    }
  }
  if (eq.rig && colunaMult(speciesId, eq) < 1) {
    const cols = (art ? r.colunasArt : r.colunas) || [];
    const ondeCome = cols.includes("fundo") && cols.length === 1 ? "no fundo" : cols.includes("fundo") ? "no fundo e a meia-água" : "a meia-água e na superfície";
    out.problemas.push(art
      ? `${nome} ataca ${ondeCome}: essa isca trabalha em outra altura da água.`
      : `${nome} come ${ondeCome}: ${cols.includes("fundo") ? "troque a boia por chumbada corrida" : "use boia, não chumbada no fundo"}.`);
    out.coluna = true;
  }
  if (!art && r.rig === "fundo-pesado" && eq.rig?.tipo === "fundo" && !eq.rig.pesada) out.problemas.push(`Na correnteza do poço do ${nome.toLowerCase()}, chumbada leve rola: use a chumbada chata.`);
  if (baitScore(speciesId, eq.bait) === 0) out.problemas.push(`${nome} quase não pega ${eq.bait.name.toLowerCase()}. Melhores iscas: ${r.melhores.join(", ").toLowerCase()}.`);
  return out;
}

/** Dica curta da Caderneta para o peixe (usada quando ele escapa). */
export function dicaConjunto(speciesId) {
  const r = REGRAS[speciesId];
  if (!r) return "";
  return `${nomeDe(speciesId)}: linha ${r.linha[0]}–${r.linha[1]} lb${r.anzol ? `, anzol ${hookTxt(r.anzol[0])} a ${hookTxt(r.anzol[1])}` : ""}${r.aco ? ", empate de aço" : ""}; iscas: ${r.melhores.join(", ").toLowerCase()}.`;
}

/** Espécies do pesqueiro que o conjunto atual pega bem. */
export function bomPara(eq, location) {
  if (compat(eq)) return [];
  return location.fishTable
    .map(([id]) => id)
    .filter((id) => {
      if (FISH_BY_ID[id].solta) return false;
      if (baitScore(id, eq.bait) < 1.5 || !alcanca(id, eq) || colunaMult(id, eq) < 1) return false;
      const a = avaliar(id, eq, 0.5);
      return a.ratio >= 0.9 && !a.dentes && !a.anzolPequeno && !a.anzolGrande;
    })
    .map(nomeDe);
}

/** Para a Loja: espécies em que o item é o indicado pela Caderneta. */
export function indicadoPara(catKey, item) {
  const ids = FISH_SPECIES.map((s) => s.id).filter((id) => {
    const r = REGRAS[id];
    if (!r) return false;
    switch (catKey) {
      case "rods": return item.tipo !== "canico" ? r.vara && item.lb[1] >= r.vara[0] && item.lb[1] <= r.vara[1] * 1.25 && item.lb[0] <= r.vara[1] : r.linha[1] <= 16;
      case "reels": return item.tipo !== "nenhum" && item.drag * 7 >= r.linha[0] && item.drag * 7 <= r.linha[1] * 2.2;
      case "lines": return item.lb >= r.linha[0] && item.lb <= r.linha[1] * 1.3;
      case "terminals": return r.anzol && item.hook >= r.anzol[0] - 1 && item.hook <= r.anzol[1] + 1 && (!r.aco || item.aco);
      case "baits": return baitScore(id, item) >= 2;
      case "rigs": return (r.colunas || []).some((c) => item.coluna.includes(c)) && (item.pesada ? r.rig === "fundo-pesado" : r.rig !== "fundo-pesado") && (item.tipo === "fundo" ? r.colunas.includes("fundo") : true);
      default: return false;
    }
  });
  return ids.map(nomeDe);
}
