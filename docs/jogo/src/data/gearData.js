// Gear catalog. Four categories, four tiers each. Tier 0 is starting gear.
//
// rods:  castMult  -> multiplies max cast distance
//        control   -> tames surge tension spikes during the fight
// reels: speed     -> multiplies reel-in (catch progress) rate
// lines: strength  -> divides tension gain (effectively a higher snap threshold)
// baits: biteSpeed -> multiplies bite wait time (lower = faster bites)
//        bias      -> per-rarity spawn weight multipliers

export const GEAR = {
  rods: [
    { id: "rod_0", name: "Caniço de bambu", tier: 1, price: 0, level: 1, castMult: 1.0, control: 1.0, blurb: "Herança do avô. Funciona. Quase sempre." },
    { id: "rod_1", name: "Vara de fibra", tier: 2, price: 180, level: 2, castMult: 1.25, control: 1.15, blurb: "Flexível e perdoa erro: arremessa um terço mais longe." },
    { id: "rod_2", name: "Vara de carbono", tier: 3, price: 950, level: 5, castMult: 1.55, control: 1.35, blurb: "Leve e sensível. O fundo do canal fica ao seu alcance." },
    { id: "rod_3", name: "Vara de pintado 30 lb", tier: 4, price: 4200, level: 9, castMult: 1.9, control: 1.6, blurb: "Equipamento de bagre grande. As arrancadas viram marola." },
  ],
  reels: [
    { id: "reel_0", name: "Molinete enferrujado", tier: 1, price: 0, level: 1, speed: 1.0, blurb: "Range a cada volta. Tem personalidade." },
    { id: "reel_1", name: "Molinete 3000", tier: 2, price: 150, level: 2, speed: 1.25, blurb: "Rolamentos lisos, engrenagem honesta." },
    { id: "reel_2", name: "Carretilha perfil baixo", tier: 3, price: 800, level: 4, speed: 1.55, blurb: "Freio macio e recolhimento bem mais rápido." },
    { id: "reel_3", name: "Carretilha redonda 400", tier: 4, price: 3600, level: 8, speed: 1.95, blurb: "Força bruta para jaú. A linha volta rápido." },
  ],
  lines: [
    { id: "line_0", name: "Linha velha", tier: 1, price: 0, level: 1, strength: 1.0, blurb: "Arrebenta se o peixe espirrar. Troque logo." },
    { id: "line_1", name: "Monofilamento 0,40", tier: 2, price: 120, level: 2, strength: 1.3, blurb: "Mono de verdade, com elasticidade." },
    { id: "line_2", name: "Multifilamento 40 lb", tier: 3, price: 700, level: 4, strength: 1.65, blurb: "Fios trançados aguentam muita tensão." },
    { id: "line_3", name: "Multi 80 lb com empate de aço", tier: 4, price: 3200, level: 8, strength: 2.1, blurb: "Praticamente um cabo. Feito para lendas." },
  ],
  baits: [
    {
      id: "bait_0", name: "Minhoca", tier: 1, price: 0, level: 1, biteSpeed: 1.0,
      bias: { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1 },
      blurb: "De graça, mexe muito e todo peixe gosta.",
    },
    {
      id: "bait_1", name: "Massa com ceva", tier: 2, price: 200, level: 3, biteSpeed: 0.88,
      bias: { common: 1, uncommon: 1.5, rare: 1.25, epic: 1, legendary: 1 },
      blurb: "Os peixes exigentes notam. Mordidas um pouco mais rápidas.",
    },
    {
      id: "bait_2", name: "Tuvira viva", tier: 3, price: 900, level: 6, biteSpeed: 0.8,
      bias: { common: 0.9, uncommon: 1.1, rare: 1.8, epic: 1.5, legendary: 1.2 },
      blurb: "A isca que os predadores raros não resistem.",
    },
    {
      id: "bait_3", name: "Posta de peixe no fundo", tier: 4, price: 3800, level: 9, biteSpeed: 0.72,
      bias: { common: 0.75, uncommon: 1, rare: 1.5, epic: 2.1, legendary: 2.6 },
      blurb: "Cheiro forte no poço fundo: chamariz de gigante.",
    },
  ],
};

export const GEAR_CATS = [
  { key: "rods", label: "Varas", equipKey: "rods" },
  { key: "reels", label: "Molinetes", equipKey: "reels" },
  { key: "lines", label: "Linhas", equipKey: "lines" },
  { key: "baits", label: "Iscas", equipKey: "baits" },
];

export function gearStatLines(catKey, item) {
  switch (catKey) {
    case "rods":
      return [`Arremesso ×${item.castMult.toFixed(2)}`, `Controle na briga ×${item.control.toFixed(2)}`];
    case "reels":
      return [`Recolhimento ×${item.speed.toFixed(2)}`];
    case "lines":
      return [`Resistência ×${item.strength.toFixed(2)}`];
    case "baits": {
      const biasBits = Object.entries(item.bias)
        .filter(([, v]) => v !== 1)
        .map(([k, v]) => `${({ common: "Comum", uncommon: "Incomum", rare: "Rara", epic: "Épica", legendary: "Lendária" })[k]} ×${v}`);
      return [
        `Mordida ${item.biteSpeed === 1 ? "normal" : `+${Math.round((1 - item.biteSpeed) * 100)}%`}`,
        biasBits.length ? biasBits.join(", ") : "Sem preferência de raridade",
      ];
    }
    default:
      return [];
  }
}
