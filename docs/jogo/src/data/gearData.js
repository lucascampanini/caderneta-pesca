// Equipamento do jogo com especificação real, nas mesmas unidades da Caderneta Pantaneira.
// O que cada peixe pede (linha, vara, anzol, empate, isca) vem de data/caderneta.js, gerado dos dados do site.
//
// varas:     tipo (caniço / molinete / carretilha), libragem [mín, máx], alcance máximo do arremesso (m)
// molinetes: tipo (nenhum / molinete / carretilha), drag máximo (kg), velocidade de recolhimento
// linhas:    tipo (mono / multi), resistência (lb)
// anzóis:    tamanho no padrão da Caderneta (2/0 = 2, 1/0 = 1, nº 1 = 0, nº 2 = -1...), empate de aço
// iscas:     chaves iguais às da Caderneta (ic das naturais, art das artificiais)

export const GEAR = {
  rods: [
    { id: "canico", name: "Caniço de bambu 3 m", tipo: "canico", lb: [4, 12], maxDist: 10, price: 0, level: 1,
      blurb: "Linha amarrada na ponta, sem molinete. Só alcança a beira (água rasa)." },
    { id: "mol165", name: "Vara de molinete 1,65 m · 6–14 lb", tipo: "molinete", lb: [6, 14], maxDist: 30, price: 60, level: 1,
      blurb: "Fibra de vidro, leve. Para piau, pacu-peva, tilápia e mandi." },
    { id: "mol180", name: "Vara de molinete 1,80 m · 10–20 lb", tipo: "molinete", lb: [10, 20], maxDist: 35, price: 160, level: 2,
      blurb: "A vara que mais se vê no barranco: piauçu, piapara, piranha." },
    { id: "car168", name: "Vara de carretilha 1,68 m · 12–25 lb", tipo: "carretilha", lb: [12, 25], maxDist: 38, price: 380, level: 3,
      blurb: "Carbono, ação rápida. Isca artificial: tucunaré, traíra, piraputanga." },
    { id: "car183", name: "Vara de carretilha 1,83 m · 15–30 lb", tipo: "carretilha", lb: [15, 30], maxDist: 41, price: 750, level: 5,
      blurb: "Ação moderada. Pacu, cachorra, bagres médios e o dourado (para soltar)." },
    { id: "fundo210", name: "Vara de fundo 2,10 m · 20–50 lb", tipo: "carretilha", lb: [20, 50], maxDist: 44, price: 1600, level: 7,
      blurb: "Pesca de fundo no canal: pintado e cachara." },
    { id: "jau210", name: "Vara de jaú 2,10 m · 40–80 lb", tipo: "carretilha", lb: [40, 80], maxDist: 40, price: 3800, level: 10,
      blurb: "Blank grosso para tirar o jaú da toca no poço fundo." },
  ],
  reels: [
    { id: "nenhum", name: "Sem molinete (linha na ponta)", tipo: "nenhum", drag: 2, speed: 0.75, price: 0, level: 1,
      blurb: "É o caniço: você puxa o peixe com o braço." },
    { id: "mol1000", name: "Molinete 1000 · drag 3 kg", tipo: "molinete", drag: 3, speed: 1.0, price: 70, level: 1,
      blurb: "Pequeno, para linha fina e peixe de escama miúdo." },
    { id: "mol3000", name: "Molinete 3000 · drag 7 kg", tipo: "molinete", drag: 7, speed: 1.15, price: 240, level: 2,
      blurb: "O tamanho coringa do Pantanal." },
    { id: "mol5000", name: "Molinete 5000 · drag 10 kg", tipo: "molinete", drag: 10, speed: 1.25, price: 650, level: 5,
      blurb: "Leva bastante linha grossa: pacu grande e bagre no fundo." },
    { id: "pb150", name: "Carretilha perfil baixo 150 · drag 6 kg", tipo: "carretilha", drag: 6, speed: 1.35, price: 420, level: 3,
      blurb: "Precisa de vara de carretilha. Arremesso preciso de isca artificial." },
    { id: "pb200", name: "Carretilha perfil baixo 200 · drag 8 kg", tipo: "carretilha", drag: 8, speed: 1.45, price: 900, level: 5,
      blurb: "Mais linha e mais freio: pacu, cachorra, cachara." },
    { id: "red400", name: "Carretilha redonda 400 · drag 14 kg", tipo: "carretilha", drag: 14, speed: 1.55, price: 3200, level: 9,
      blurb: "Força bruta para pintado grande e jaú." },
  ],
  lines: [
    { id: "mono30", name: "Monofilamento 0,30 mm (15 lb)", tipo: "mono", lb: 15, price: 0, level: 1,
      blurb: "Estica e perdoa tranco. Boa para começar." },
    { id: "mono40", name: "Monofilamento 0,40 mm (25 lb)", tipo: "mono", lb: 25, price: 45, level: 1,
      blurb: "Aguenta piauçu, piranha e pacu médio." },
    { id: "multi20", name: "Multifilamento 20 lb", tipo: "multi", lb: 20, price: 120, level: 2,
      blurb: "Não estica: sente melhor a beliscada e arremessa mais longe." },
    { id: "multi30", name: "Multifilamento 30 lb", tipo: "multi", lb: 30, price: 220, level: 3,
      blurb: "Coringa para pacu, bagres médios e isca artificial." },
    { id: "mono60", name: "Monofilamento 0,60 mm (48 lb)", tipo: "mono", lb: 48, price: 180, level: 4,
      blurb: "Grossa e barata para o fundo. Arremessa menos." },
    { id: "multi50", name: "Multifilamento 50 lb", tipo: "multi", lb: 50, price: 520, level: 6,
      blurb: "Linha de pintado e cachara." },
    { id: "multi80", name: "Multifilamento 80 lb", tipo: "multi", lb: 80, price: 1300, level: 9,
      blurb: "Para o jaú, que passa de 40 kg." },
  ],
  terminals: [
    { id: "n2", name: "Anzol nº 2", hook: -1, aco: false, price: 0, level: 1,
      blurb: "Pequeno, para boca de piau, pacu-peva e tilápia." },
    { id: "maru1", name: "Anzol maruseigo 1/0", hook: 1, aco: false, price: 20, level: 1,
      blurb: "Haste curta e forte: piauçu, piapara e pacu." },
    { id: "haste2aco", name: "Anzol 2/0 com empate de aço", hook: 2, aco: true, price: 70, level: 2,
      blurb: "Dente de piranha, cachorra e traíra não corta o aço." },
    { id: "circ4", name: "Anzol circular 4/0 com líder de mono", hook: 4, aco: false, price: 60, level: 3,
      blurb: "Bagres médios: barbado, jurupoca, palmito, armado." },
    { id: "circ7", name: "Anzol circular 7/0 com líder de mono 0,80", hook: 7, aco: false, price: 150, level: 6,
      blurb: "Pintado e cachara. Fisga no canto da boca." },
    { id: "circ10aco", name: "Anzol circular 10/0 com cabo de aço", hook: 10, aco: true, price: 380, level: 9,
      blurb: "Jaú: boca enorme e pedra que rala a linha." },
  ],
  baits: [
    { id: "minhoca", name: "Minhoca", keys: ["minhoca"], price: 0, level: 1, blurb: "De graça e quase todo peixe miúdo aceita." },
    { id: "massa", name: "Massa com ceva", keys: ["massa"], price: 15, level: 1, blurb: "Fubá e farinha: piau, pacu-peva, curimbatá, tilápia." },
    { id: "milho", name: "Milho verde", keys: ["milho"], price: 15, level: 1, blurb: "Isca clássica de piapara e piauçu." },
    { id: "coracao", name: "Coração de boi", keys: ["coracao"], price: 30, level: 2, blurb: "Firme no anzol: piranha, armado, mandi." },
    { id: "posta", name: "Posta de peixe", keys: ["posta"], price: 40, level: 2, blurb: "Cheiro na correnteza: piranha, barbado, jaú." },
    { id: "caranguejo", name: "Caranguejo", keys: ["caranguejo"], price: 50, level: 3, blurb: "Piauçu e pacu grandes não resistem." },
    { id: "fruta", name: "Fruta nativa", keys: ["fruta"], price: 40, level: 3, blurb: "Ximbuva, tucum, figo: pacu e piraputanga." },
    { id: "lambari", name: "Lambari vivo", keys: ["peixe"], price: 70, level: 3, blurb: "Isca viva para bagres médios, corvina e cachorra." },
    { id: "tuvira", name: "Tuvira viva", keys: ["tuvira"], price: 140, level: 5, blurb: "A isca do pintado e da cachara." },
    { id: "meia", name: "Artificial: meia-água", keys: ["meia"], art: true, price: 110, level: 3, blurb: "Dourado, cachorra, tucunaré, piraputanga." },
    { id: "superficie", name: "Artificial: zara ou hélice", keys: ["zara", "helice", "popper"], art: true, price: 110, level: 4, blurb: "Ataque na superfície: tucunaré e traíra." },
    { id: "sapo", name: "Artificial: sapo anti-enrosco", keys: ["sapo"], art: true, price: 100, level: 4, blurb: "Por cima do aguapé, atrás da traíra." },
    { id: "colher", name: "Artificial: colher", keys: ["colher", "spinner"], art: true, price: 80, level: 4, blurb: "Brilho na água clara: dourado, cachorra, piraputanga." },
    { id: "jig", name: "Artificial: jig, shad ou crank", keys: ["jig", "shad", "crank"], art: true, price: 90, level: 5, blurb: "Batendo no fundo: corvina, tucunaré, cachara." },
  ],
};

export const GEAR_CATS = [
  { key: "rods", label: "Varas", um: "vara" },
  { key: "reels", label: "Molinetes e carretilhas", um: "molinete" },
  { key: "lines", label: "Linhas", um: "linha" },
  { key: "terminals", label: "Anzóis e empates", um: "anzol" },
  { key: "baits", label: "Iscas", um: "isca" },
];

export const hookTxt = (n) => (n >= 1 ? `${n}/0` : `nº ${1 - n}`);

export function gearStatLines(catKey, item) {
  switch (catKey) {
    case "rods":
      return [item.tipo === "canico" ? "Sem molinete" : `Para ${item.tipo}`, `${item.lb[0]}–${item.lb[1]} lb`, `Alcance ${item.maxDist} m`];
    case "reels":
      return item.tipo === "nenhum" ? ["Só com caniço"] : [`Drag ${item.drag} kg`, `Recolhimento ×${item.speed.toFixed(2)}`];
    case "lines":
      return [item.tipo === "multi" ? "Multifilamento" : "Monofilamento", `${item.lb} lb`];
    case "terminals":
      return [`Anzol ${hookTxt(item.hook)}`, item.aco ? "Empate de aço" : "Sem aço"];
    case "baits":
      return [item.art ? "Isca artificial" : "Isca natural"];
    default:
      return [];
  }
}
