// Salvamento: localStorage no aparelho e, quando o jogo roda dentro da Caderneta com login,
// também na conta da pessoa (Firestore, campo "jogo" do documento do usuário).
// Adaptado do TIDELINE (MIT).

import { CONFIG } from "../data/config.js";
import { S, createDefaultState, assignState, events } from "./gameState.js";
import { deepMerge } from "../utils/utils.js";

let storageOk = true;
try {
  const probe = "__pesca_probe__";
  localStorage.setItem(probe, "1");
  localStorage.removeItem(probe);
} catch {
  storageOk = false;
}

/** Conta da página da Caderneta (mesmo domínio), se o jogo estiver dentro dela e houver login. */
function conta() {
  try {
    const C = window.parent && window.parent !== window ? window.parent.Conta : null;
    return C && C.usuario && C.usuario() ? C : null;
  } catch {
    return null;
  }
}

let nuvemTimer = null;
function enviaNuvem() {
  const C = conta();
  if (!C) return;
  clearTimeout(nuvemTimer);
  nuvemTimer = setTimeout(() => {
    const dados = JSON.stringify(Object.assign({}, S, { salvoEm: Date.now() }));
    C.salvar({ jogo: dados }).catch(() => { /* sem conexão: fica a cópia do aparelho */ });
  }, 1500);
}

/** Antes de carregar: traz o progresso da conta, se for mais novo que o do aparelho. */
export async function syncFromCloud() {
  const C = conta();
  if (!C || !storageOk) return false;
  try {
    const d = await Promise.race([C.lerUsuario(), new Promise((r) => setTimeout(() => r(null), 4000))]);
    if (!d || !d.jogo) return false;
    const nuvem = JSON.parse(d.jogo);
    const localRaw = localStorage.getItem(CONFIG.saveKey);
    const local = localRaw ? JSON.parse(localRaw) : null;
    if (!local || (nuvem.salvoEm || 0) > (local.salvoEm || 0)) {
      localStorage.setItem(CONFIG.saveKey, JSON.stringify(nuvem));
      return true;
    }
  } catch {
    /* sem conexão ou dado inválido: segue com o aparelho */
  }
  return false;
}

export function hasSave() {
  if (!storageOk) return false;
  try {
    return localStorage.getItem(CONFIG.saveKey) !== null;
  } catch {
    return false;
  }
}

export function saveGame() {
  if (!storageOk) return false;
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(Object.assign({}, S, { salvoEm: Date.now() })));
    events.emit("save:done");
    enviaNuvem();
    return true;
  } catch {
    return false;
  }
}

/** Loads the save (if any) into S, merged over defaults. Returns true if loaded. */
export function loadGame() {
  if (!storageOk) return false;
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    delete parsed.salvoEm;
    // versão 1 tinha outro catálogo de equipamento: devolve o kit inicial e reembolsa o que foi comprado
    if (!parsed.version || parsed.version < 2) {
      const precos = { rods: [0, 180, 950, 4200], reels: [0, 150, 800, 3600], lines: [0, 120, 700, 3200], baits: [0, 200, 900, 3800] };
      let reembolso = 0;
      for (const [k, lista] of Object.entries((parsed.gear && parsed.gear.owned) || {})) for (const i of lista) reembolso += (precos[k] && precos[k][i]) || 0;
      delete parsed.gear;
      parsed.version = 2;
      if (parsed.profile) parsed.profile.money = (parsed.profile.money || 0) + reembolso;
      parsed.tutorial = { step: 0, done: (parsed.stats && parsed.stats.catches > 0) || false };
    }
    assignState(deepMerge(createDefaultState(), parsed));
    return true;
  } catch {
    return false;
  }
}

export function resetSave() {
  if (storageOk) {
    try {
      localStorage.removeItem(CONFIG.saveKey);
    } catch {
      /* storage may be blocked; in-memory reset still proceeds */
    }
  }
  assignState(createDefaultState());
  const C = conta();
  if (C) C.salvar({ jogo: null }).catch(() => {});
}
