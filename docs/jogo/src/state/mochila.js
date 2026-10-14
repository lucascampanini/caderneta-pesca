// Liga o jogo à "Minha mochila" da Caderneta: cada equipamento cadastrado no site vira o item
// equivalente do jogo, já liberado (sem comprar e sem esperar nível).

import { GEAR } from "../data/gearData.js";
import { S, events } from "./gameState.js";

// mesmas conversões da Caderneta (engine.js)
const MONO_TAB = [[0.2, 8], [0.25, 11], [0.28, 13], [0.3, 15], [0.35, 20], [0.4, 25], [0.45, 30], [0.5, 36], [0.6, 48], [0.7, 62], [0.8, 78], [0.9, 95], [1.0, 115], [1.2, 150]];
function monoToLb(mm) {
  mm = +mm;
  if (!mm) return 0;
  if (mm <= MONO_TAB[0][0]) return Math.round((MONO_TAB[0][1] * mm) / MONO_TAB[0][0]);
  for (let i = 1; i < MONO_TAB.length; i++) {
    const [a, la] = MONO_TAB[i - 1], [b, lb] = MONO_TAB[i];
    if (mm <= b) return Math.round(la + ((lb - la) * (mm - a)) / (b - a));
  }
  return Math.round((MONO_TAB[MONO_TAB.length - 1][1] * mm) / 1.2);
}
function hookNum(s) {
  if (s === undefined || s === null || s === "") return null;
  s = String(s).trim().toLowerCase().replace("nº", "").replace("n°", "").trim();
  const m = s.match(/^(\d+)\s*\/\s*0$/);
  if (m) return +m[1];
  const n = parseFloat(s);
  return isNaN(n) ? null : 1 - n;
}

const maisPerto = (lista, valor, f) => lista.reduce((best, it) => (Math.abs(f(it) - valor) < Math.abs(f(best) - valor) ? it : best));
const idx = (cat, item) => GEAR[cat].indexOf(item);

const ART = { zara: "superficie", helice: "superficie", popper: "superficie", meia: "meia", crank: "jig", jig: "jig", shad: "jig", colher: "colher", spinner: "colher", sapo: "sapo" };

/** Converte os itens da mochila do site em índices de equipamento do jogo. */
export function gearDaMochila(itens) {
  const out = { rods: new Set(), reels: new Set(), lines: new Set(), terminals: new Set(), baits: new Set() };
  if (!Array.isArray(itens)) return out;
  const temAco = itens.some((i) => i.cat === "empate");
  for (const it of itens) {
    if (it.exemplo) continue;
    switch (it.cat) {
      case "vara": {
        if (it.tipo === "canico") { out.rods.add(0); break; }
        const tipo = it.tipo === "molinete" ? "molinete" : "carretilha";
        const lb = +it.lbMax || +it.lbMin;
        const cands = GEAR.rods.filter((r) => r.tipo === tipo);
        // a menor vara do jogo que aguenta a libragem máxima da vara real (ou a mais forte, se nenhuma aguentar)
        if (lb) out.rods.add(idx("rods", cands.find((r) => r.lb[1] >= lb) || cands[cands.length - 1]));
        break;
      }
      case "molinete": {
        const t = +it.tam || 3000;
        out.reels.add(idx("reels", GEAR.reels.find((r) => r.id === (t <= 1500 ? "mol1000" : t <= 3500 ? "mol3000" : "mol5000"))));
        break;
      }
      case "carretilha": {
        const t = +it.tam || 150;
        const id = it.perfil === "redonda" && t >= 300 ? "red400" : t <= 150 ? "pb150" : "pb200";
        out.reels.add(idx("reels", GEAR.reels.find((r) => r.id === id)));
        break;
      }
      case "linha": {
        const lb = it.unid === "mm" ? monoToLb(it.res) : +it.res;
        if (!lb) break;
        const tipo = it.tipo === "multi" ? "multi" : "mono";
        out.lines.add(idx("lines", maisPerto(GEAR.lines.filter((l) => l.tipo === tipo), lb, (l) => l.lb)));
        break;
      }
      case "anzol": {
        const h = hookNum(it.max) ?? hookNum(it.min);
        if (h === null) break;
        out.terminals.add(idx("terminals", maisPerto(GEAR.terminals.filter((t) => !t.aco), h, (t) => t.hook)));
        if (temAco) out.terminals.add(idx("terminals", maisPerto(GEAR.terminals.filter((t) => t.aco), h, (t) => t.hook)));
        break;
      }
      case "empate":
        out.terminals.add(idx("terminals", GEAR.terminals.find((t) => t.id === "haste2aco")));
        break;
      case "isca": {
        const id = ART[it.art];
        if (id) out.baits.add(idx("baits", GEAR.baits.find((b) => b.id === id)));
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Libera no jogo o que a pessoa tem na mochila. Devolve quantos itens novos entraram. */
export function aplicarMochila(itens) {
  const g = gearDaMochila(itens);
  let novos = 0;
  S.gear.daMochila = {};
  for (const [cat, set] of Object.entries(g)) {
    S.gear.daMochila[cat] = [...set].filter((i) => i >= 0);
    for (const i of S.gear.daMochila[cat]) {
      if (!S.gear.owned[cat].includes(i)) {
        S.gear.owned[cat].push(i);
        novos++;
      }
    }
  }
  if (novos) events.emit("gear");
  return novos;
}
