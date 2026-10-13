// Espécies do Pantanal (adaptado do TIDELINE, MIT). Cada espécie define onde e quando morde,
// tamanho e valor, quanto briga, e como a malha procedural deve parecer.
// Tamanhos, horários e locais seguem os dados da Caderneta Pantaneira.
//
// look.shape: 'standard' | 'slim' | 'long' | 'flat' | 'billed'
// look flags: whiskers (barbilhões), tallDorsal, glow (brilho leve)
// solta: espécie que deve ser devolvida (moratória ou fora da cota) — rende XP, não vende.

export const RARITIES = {
  common: { id: "common", label: "Comum", color: "#aebdca", xp: 12, order: 0, stars: 1, hookMult: 1.15 },
  uncommon: { id: "uncommon", label: "Incomum", color: "#62d98b", xp: 22, order: 1, stars: 2, hookMult: 1.05 },
  rare: { id: "rare", label: "Rara", color: "#58a6ff", xp: 40, order: 2, stars: 3, hookMult: 0.95 },
  epic: { id: "epic", label: "Épica", color: "#c08bff", xp: 72, order: 3, stars: 4, hookMult: 0.85 },
  legendary: { id: "legendary", label: "Lendária", color: "#ffb13d", xp: 130, order: 4, stars: 5, hookMult: 0.78 },
};

export const TIME_SEGMENTS = ["dawn", "day", "dusk", "night"];

export function getTimeSegment(hours) {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

const C = (hex) => parseInt(hex.replace("#", ""), 16);
const F = (strength, surgeEvery, heft, stamina) => ({ strength, surgeEvery, heft, stamina });

export const FISH_SPECIES = [
  // ---------------- Comuns ----------------
  { id: "piranha", name: "Piranha", rarity: "common", locations: ["lake", "pier", "ocean"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [14, 32], weightMidKg: 0.5, baseValue: 6, fight: F(0.7, [4, 6.5], 0.75, 8),
    look: { shape: "standard", colorA: C("#6d7680"), colorB: C("#d0472c"), finColor: C("#4a525a") },
    desc: "Onde tem uma, tem cardume. Cuidado ao desanzolar: use alicate." },
  { id: "mandi", name: "Mandi-amarelo", rarity: "common", locations: ["pier", "lake"], zones: ["mid", "deep"], time: ["dusk", "night", "dawn"],
    sizeCm: [18, 40], weightMidKg: 0.45, baseValue: 6, fight: F(0.65, [4.5, 7], 0.8, 8),
    look: { shape: "standard", colorA: C("#9a8a4a"), colorB: C("#efe2b0"), finColor: C("#c9a640"), whiskers: true },
    desc: "O bagre do barranco. Os ferrões dão ferroada: segure por trás das nadadeiras." },
  { id: "trespintas", name: "Piau-três-pintas", rarity: "common", locations: ["river", "lake"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [20, 40], weightMidKg: 0.7, baseValue: 8, fight: F(0.75, [4, 6.5], 0.8, 9),
    look: { shape: "standard", colorA: C("#7a6a3c"), colorB: C("#efe6c8"), finColor: C("#c9a24a") },
    desc: "Belisca a isca e pede fisgada curta. Três manchas escuras na lateral." },
  { id: "pacupeva", name: "Pacu-peva", rarity: "common", locations: ["lake", "river"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [14, 28], weightMidKg: 0.45, baseValue: 7, fight: F(0.7, [4, 6.5], 0.75, 8),
    look: { shape: "flat", colorA: C("#9fb0b0"), colorB: C("#e9e6d8"), finColor: C("#c97a4a") },
    desc: "Pacu pequeno e redondo de cardume. Diversão com equipamento leve." },
  { id: "curimbata", name: "Curimbatá", rarity: "common", locations: ["river", "lake"], zones: ["mid", "deep"], time: ["dawn", "day"],
    sizeCm: [30, 60], weightMidKg: 1.6, baseValue: 10, fight: F(0.85, [4, 6.5], 1.0, 10),
    look: { shape: "standard", colorA: C("#8a99a8"), colorB: C("#dfe4e8"), finColor: C("#5f6f80") },
    desc: "Come lodo no fundo e sobe a corredeira na piracema." },
  { id: "traira", name: "Traíra", rarity: "common", locations: ["lake"], zones: ["shallow"], time: ["dusk", "night", "dawn"],
    sizeCm: [25, 55], weightMidKg: 1.2, baseValue: 9, fight: F(0.9, [3.8, 6], 0.95, 9),
    look: { shape: "slim", colorA: C("#5a4a2e"), colorB: C("#b8a77a"), finColor: C("#4a3f2a") },
    desc: "Emboscada na água rasa e parada. Ataca a superfície com violência." },
  { id: "tilapia", name: "Tilápia", rarity: "common", locations: ["lake"], zones: ["shallow", "mid"], time: ["day", "dusk"],
    sizeCm: [15, 40], weightMidKg: 0.8, baseValue: 6, fight: F(0.72, [4.2, 6.8], 0.8, 9),
    look: { shape: "standard", colorA: C("#6f8a6a"), colorB: C("#d9dccf"), finColor: C("#5a6a58") },
    desc: "Exótica em MS. Ótima para treinar ceva e boia." },
  // ---------------- Incomuns ----------------
  { id: "piavucu", name: "Piauçu", rarity: "uncommon", locations: ["lake", "pier", "river"], zones: ["mid", "deep"], time: ["dawn", "day", "dusk"],
    sizeCm: [30, 60], weightMidKg: 2.2, baseValue: 22, fight: F(1.0, [4, 6.2], 1.05, 11),
    look: { shape: "standard", colorA: C("#5f6e58"), colorB: C("#ece8d6"), finColor: C("#a8916a") },
    desc: "O peixe mais pescado do Pantanal de MS. Tira a isca com delicadeza." },
  { id: "piraputanga", name: "Piraputanga", rarity: "uncommon", locations: ["river"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [25, 50], weightMidKg: 1.4, baseValue: 20, fight: F(1.0, [3.6, 5.8], 0.9, 10),
    look: { shape: "slim", colorA: C("#9aa8b0"), colorB: C("#e6e2d4"), finColor: C("#d4553a") },
    desc: "Ágil e arisca nos rios de água clara. Adora frutinha caindo da árvore." },
  { id: "armado", name: "Armado", rarity: "uncommon", locations: ["pier", "ocean"], zones: ["deep"], time: ["dusk", "night"],
    sizeCm: [30, 70], weightMidKg: 2.5, baseValue: 20, fight: F(1.05, [4.2, 6.6], 1.3, 12),
    look: { shape: "standard", colorA: C("#6b5a48"), colorB: C("#cdbfa8"), finColor: C("#6f5d48"), whiskers: true },
    desc: "Placas com espinhos na lateral. Briga no fundo, encostado no barranco." },
  { id: "palmito", name: "Palmito", rarity: "uncommon", locations: ["pier", "ocean"], zones: ["mid", "deep"], time: ["dusk", "night"],
    sizeCm: [30, 60], weightMidKg: 1.8, baseValue: 22, fight: F(1.0, [4, 6.2], 1.0, 11),
    look: { shape: "standard", colorA: C("#8a8f96"), colorB: C("#ebecee"), finColor: C("#9aa0a6") },
    desc: "Bagre prateado de boca grande. Carne muito saborosa." },
  { id: "jurupensem", name: "Jurupensém", rarity: "uncommon", locations: ["pier", "ocean"], zones: ["mid", "deep"], time: ["dusk", "night"],
    sizeCm: [30, 55], weightMidKg: 1.2, baseValue: 20, fight: F(0.95, [4, 6.4], 0.95, 10),
    look: { shape: "long", colorA: C("#8a8a7a"), colorB: C("#e8e4d8"), finColor: C("#7a7a6a"), whiskers: true },
    desc: "Bico de pato e faixa escura do focinho à cauda." },
  { id: "corvina", name: "Corvina", rarity: "uncommon", locations: ["pier", "lake"], zones: ["deep"], time: ["dusk", "night"],
    sizeCm: [30, 60], weightMidKg: 1.8, baseValue: 20, fight: F(0.95, [4, 6.4], 1.0, 10),
    look: { shape: "standard", colorA: C("#8796a4"), colorB: C("#dfe4e8"), finColor: C("#a8b2bb") },
    desc: "Cardume de fundo em represas e rios grandes. Caça ao entardecer." },
  { id: "tucunare", name: "Tucunaré", rarity: "uncommon", locations: ["lake"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [30, 65], weightMidKg: 2.5, baseValue: 24, fight: F(1.15, [3.5, 5.6], 1.0, 11),
    look: { shape: "standard", colorA: C("#8a9a3a"), colorB: C("#e8d070"), finColor: C("#3a6a5a") },
    desc: "Exótico em MS. Ataca por reação e pula muito." },
  // ---------------- Raras ----------------
  { id: "pacu", name: "Pacu", rarity: "rare", locations: ["lake", "river", "pier"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [40, 70], weightMidKg: 5.5, baseValue: 55, fight: F(1.3, [3.5, 5.5], 1.35, 13),
    look: { shape: "flat", colorA: C("#8a8a5a"), colorB: C("#e8d68a"), finColor: C("#c9a24a") },
    desc: "Come frutas e caranguejo. Briga forte e corta linha com os dentes." },
  { id: "barbado", name: "Barbado", rarity: "rare", locations: ["pier", "ocean"], zones: ["deep"], time: ["day", "dusk", "night"],
    sizeCm: [50, 90], weightMidKg: 6, baseValue: 50, fight: F(1.3, [3.8, 6], 1.45, 14),
    look: { shape: "standard", colorA: C("#9aa2aa"), colorB: C("#e6e8ea"), finColor: C("#7a828a"), whiskers: true },
    desc: "Bagre prateado de barbilhões chatos. Anda em cardume no canal." },
  { id: "jurupoca", name: "Jurupoca", rarity: "rare", locations: ["pier", "ocean"], zones: ["mid", "deep"], time: ["night", "dusk"],
    sizeCm: [35, 55], weightMidKg: 2, baseValue: 45, fight: F(1.15, [4, 6.2], 1.1, 12),
    look: { shape: "long", colorA: C("#a08a52"), colorB: C("#f1ead4"), finColor: C("#9b8857"), whiskers: true },
    desc: "Bico achatado e manchas escuras. Uma das carnes mais apreciadas." },
  { id: "cachorra", name: "Cachorra", rarity: "rare", locations: ["river", "ocean"], zones: ["mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [35, 70], weightMidKg: 2.5, baseValue: 45, fight: F(1.25, [3.2, 5.2], 1.0, 12),
    look: { shape: "slim", colorA: C("#8a96a0"), colorB: C("#e8ecee"), finColor: C("#b04a3a") },
    desc: "Presas enormes. Use empate de aço ou ela corta a linha." },
  { id: "piapara", name: "Piapara", rarity: "rare", locations: ["river", "pier"], zones: ["mid", "deep"], time: ["dawn", "day", "dusk"],
    sizeCm: [35, 70], weightMidKg: 3, baseValue: 45, fight: F(1.2, [3.6, 5.8], 1.15, 12),
    look: { shape: "standard", colorA: C("#7d8b78"), colorB: C("#f0efe6"), finColor: C("#d8b04a") },
    desc: "Piau grande e desconfiado. Briga forte em linha fina." },
  // ---------------- Épicas ----------------
  { id: "cachara", name: "Cachara", rarity: "epic", locations: ["ocean", "pier"], zones: ["deep"], time: ["dusk", "night", "dawn"],
    sizeCm: [70, 120], weightMidKg: 14, baseValue: 120, fight: F(1.55, [3.2, 5.2], 1.6, 16),
    look: { shape: "long", colorA: C("#8a7a5a"), colorB: C("#e8e2d0"), finColor: C("#6a5a3a"), whiskers: true },
    desc: "Listras verticais escuras. Mais agressiva em isca artificial no entardecer." },
  { id: "pintado", name: "Pintado", rarity: "epic", locations: ["ocean", "pier"], zones: ["deep"], time: ["dusk", "night"],
    sizeCm: [75, 125], weightMidKg: 18, baseValue: 140, fight: F(1.6, [3.2, 5], 1.7, 17),
    look: { shape: "long", colorA: C("#7a8288"), colorB: C("#eceae2"), finColor: C("#5a6268"), whiskers: true },
    desc: "O bagre mais procurado do Pantanal. Caça à noite, atrás de tuvira." },
  { id: "pati", name: "Pati", rarity: "epic", locations: ["ocean"], zones: ["deep"], time: ["night"],
    sizeCm: [50, 70], weightMidKg: 4, baseValue: 110, fight: F(1.4, [3.6, 5.6], 1.3, 14),
    look: { shape: "slim", colorA: C("#8a8f96"), colorB: C("#ebecee"), finColor: C("#9aa0a6"), whiskers: true },
    desc: "Bagre prateado de barbilhões longos. Medida mínima alta: 65 cm." },
  // ---------------- Lendárias ----------------
  { id: "jau", name: "Jaú", rarity: "legendary", locations: ["ocean"], zones: ["deep"], time: ["night", "dusk"],
    sizeCm: [90, 140], weightMidKg: 45, baseValue: 380, fight: F(1.9, [2.8, 4.6], 2.1, 22),
    look: { shape: "standard", colorA: C("#8a7a4a"), colorB: C("#d8cfa8"), finColor: C("#6a5a3a"), whiskers: true },
    desc: "Gigante de poço fundo e pé de cachoeira. Briga entocando na pedra." },
  { id: "dourado", name: "Dourado", rarity: "legendary", locations: ["river", "ocean"], zones: ["shallow", "mid"], time: ["dawn", "day", "dusk"],
    sizeCm: [50, 100], weightMidKg: 8, baseValue: 0, solta: true, fight: F(1.75, [2.6, 4.4], 1.4, 18),
    look: { shape: "slim", colorA: C("#d8a531"), colorB: C("#f2d77a"), finColor: C("#e06a2a"), glow: true },
    desc: "O rei do rio. Captura proibida em MS até 2027: foto e solte!" },
];

export const FISH_BY_ID = Object.fromEntries(FISH_SPECIES.map((f) => [f.id, f]));

export const sizeMid = (sp) => (sp.sizeCm[0] + sp.sizeCm[1]) / 2;
