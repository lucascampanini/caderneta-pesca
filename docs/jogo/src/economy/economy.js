import { FISH_BY_ID } from "../data/fishData.js";
// Money, XP/levels, inventory, journal records, gear purchases and location
// unlocks. Operates on the central state S and emits UI events.

import { CONFIG } from "../data/config.js";
import { S, events } from "../state/gameState.js";
import { GEAR } from "../data/gearData.js";
import { LOCATIONS } from "../data/locationData.js";
import { saveGame } from "../state/saveLoad.js";
import { maxCast } from "../gameplay/rules.js";

/** Modo dono: na conta de administrador da Caderneta, dinheiro ilimitado, sem trava de nível e pesqueiros abertos. */
export function modoDono() {
  try {
    const C = window.parent && window.parent !== window ? window.parent.Conta : null;
    return !!(C && C.admin && C.admin());
  } catch {
    return false;
  }
}
const nivelOk = (lvl) => modoDono() || S.profile.level >= lvl;
const dinheiroOk = (v) => modoDono() || S.profile.money >= v;
export { nivelOk, dinheiroOk };

export const xpToNext = (level) => Math.round(CONFIG.economy.xpBase * Math.pow(level, CONFIG.economy.xpPow));

export function getEquipped() {
  return {
    rod: GEAR.rods[S.gear.equipped.rods],
    reel: GEAR.reels[S.gear.equipped.reels],
    line: GEAR.lines[S.gear.equipped.lines],
    term: GEAR.terminals[S.gear.equipped.terminals],
    bait: GEAR.baits[S.gear.equipped.baits],
  };
}

/** Flattened gameplay modifiers from the currently equipped gear. */
export function getStats() {
  const eq = getEquipped();
  return {
    castMult: maxCast(eq) / CONFIG.cast.baseMaxDist,
    reelSpeed: eq.reel.speed,
    bait: eq.bait,
    eq,
  };
}

function emitMoney(delta) {
  events.emit("money", { money: S.profile.money, delta });
}

function emitXp(gained = 0) {
  events.emit("xp", {
    xp: S.profile.xp,
    level: S.profile.level,
    next: xpToNext(S.profile.level),
    gained,
  });
}

/** Adds XP, processes any level-ups and announces newly available unlocks. */
export function addXp(amount) {
  S.profile.xp += amount;
  let levels = 0;
  while (S.profile.xp >= xpToNext(S.profile.level)) {
    S.profile.xp -= xpToNext(S.profile.level);
    S.profile.level += 1;
    levels += 1;

    const unlocks = [];
    for (const [cat, items] of Object.entries(GEAR)) {
      for (const item of items) {
        if (item.level === S.profile.level && item.price > 0) {
          unlocks.push(`Novo na Loja: ${item.name}`);
        }
      }
      void cat;
    }
    for (const loc of LOCATIONS) {
      if (loc.unlock.level === S.profile.level && !S.world.unlocked.includes(loc.id)) {
        unlocks.push(`Já dá para liberar no Mapa: ${loc.name}`);
      }
    }
    events.emit("levelup", { level: S.profile.level, unlocks });
  }
  emitXp(amount);
  return levels;
}

/** Registers a landed fish: inventory, journal, records, XP. */
export function registerCatch(fish) {
  // espécies protegidas (dourado, moratória em MS) são soltas: contam no diário e no XP, não vão para o samburá
  if (!FISH_BY_ID[fish.speciesId].solta) S.inventory.push({
    speciesId: fish.speciesId,
    sizeCm: fish.sizeCm,
    weightKg: fish.weightKg,
    value: fish.value,
  });

  const entry = S.journal[fish.speciesId];
  const isNew = !entry;
  let isRecord = false;
  if (isNew) {
    S.journal[fish.speciesId] = {
      count: 1,
      bestSize: fish.sizeCm,
      bestWeight: fish.weightKg,
      first: Date.now(),
    };
    events.emit("journal:new", { speciesId: fish.speciesId });
  } else {
    entry.count += 1;
    if (fish.sizeCm > entry.bestSize) {
      entry.bestSize = fish.sizeCm;
      entry.bestWeight = Math.max(entry.bestWeight, fish.weightKg);
      isRecord = true;
    }
  }

  S.stats.catches += 1;
  if (fish.sizeCm > S.stats.bestSize) {
    S.stats.bestSize = fish.sizeCm;
    S.stats.bestSpecies = fish.speciesId;
  }

  const xpGained = Math.round(fish.xp * (isNew ? CONFIG.economy.newSpeciesXpMult : 1));
  const levels = addXp(xpGained);

  events.emit("inventory");
  saveGame();
  return { isNew, isRecord, xpGained, levels };
}

export const inventoryValue = () => S.inventory.reduce((sum, f) => sum + f.value, 0);

export function sellFishAt(index) {
  const fish = S.inventory[index];
  if (!fish) return 0;
  S.inventory.splice(index, 1);
  S.profile.money += fish.value;
  S.stats.earned += fish.value;
  emitMoney(fish.value);
  events.emit("inventory");
  saveGame();
  return fish.value;
}

export function sellAll() {
  const total = inventoryValue();
  if (total <= 0) return 0;
  S.inventory.length = 0;
  S.profile.money += total;
  S.stats.earned += total;
  emitMoney(total);
  events.emit("inventory");
  saveGame();
  return total;
}

export function buyGear(catKey, index) {
  const item = GEAR[catKey]?.[index];
  if (!item) return { ok: false, reason: "Item desconhecido" };
  if (S.gear.owned[catKey].includes(index)) return { ok: false, reason: "Você já tem" };
  if (!nivelOk(item.level)) return { ok: false, reason: `Precisa do nível ${item.level}` };
  if (!dinheiroOk(item.price)) return { ok: false, reason: "Dinheiro insuficiente" };
  if (!modoDono()) S.profile.money -= item.price;
  S.gear.owned[catKey].push(index);
  S.gear.equipped[catKey] = index; // auto-equip new purchases
  emitMoney(-item.price);
  events.emit("gear");
  saveGame();
  return { ok: true, item };
}

export function equipGear(catKey, index) {
  if (!S.gear.owned[catKey]?.includes(index)) return false;
  S.gear.equipped[catKey] = index;
  events.emit("gear");
  saveGame();
  return true;
}

export function canUnlockLocation(loc) {
  if (S.world.unlocked.includes(loc.id)) return { ok: false, reason: "Já liberado" };
  if (!nivelOk(loc.unlock.level)) return { ok: false, reason: `Precisa do nível ${loc.unlock.level}` };
  if (!dinheiroOk(loc.unlock.cost)) return { ok: false, reason: "Dinheiro insuficiente" };
  return { ok: true };
}

export function unlockLocation(loc) {
  const check = canUnlockLocation(loc);
  if (!check.ok) return check;
  if (!modoDono()) S.profile.money -= loc.unlock.cost;
  S.world.unlocked.push(loc.id);
  emitMoney(-loc.unlock.cost);
  events.emit("toast", { msg: `${loc.name} liberado!`, kind: "gold" });
  saveGame();
  return { ok: true };
}
