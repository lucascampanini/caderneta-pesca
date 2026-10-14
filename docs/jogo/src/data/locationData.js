// Fishing spot definitions: unlock gates, water/sky/fog mood, ambience flags,
// spawn tables and which environment builder to use.

export const LOCATIONS = [
  {
    id: "lake",
    name: "Baía Pantaneira",
    blurb: "Água parada entre aguapés e camalotes. O lugar mais calmo para aprender.",
    unlock: { level: 1, cost: 0 },
    env: "lake",
    water: { color: 0x2f4a2a, distortion: 1.7, size: 3.2, timeScale: 0.6 },
    sky: { turbidity: 2.4, rayleigh: 2.2, mieCoefficient: 0.003, mieDirectionalG: 0.82 },
    fog: { day: 0xa9c8d8, night: 0x0a1422, density: 0.0011 },
    ambience: { waves: 0.3, wind: 0.22, birds: true, crickets: true, gulls: false },
    biteMult: 1.0,
    fishTable: [
      ["piranha", 26], ["piavucu", 16], ["traira", 14], ["pacupeva", 12], ["tilapia", 10],
      ["tucunare", 9], ["trespintas", 6], ["corvina", 4], ["pacu", 3], ["mandi", 4],
    ],
  },
  {
    id: "river",
    name: "Rio de Água Clara",
    blurb: "Corredeira transparente sobre pedra, como em Bonito. Piraputanga e dourado.",
    unlock: { level: 3, cost: 400 },
    env: "river",
    water: { color: 0x1f7a6a, distortion: 2.6, size: 4.2, timeScale: 1.0 },
    sky: { turbidity: 2.0, rayleigh: 2.4, mieCoefficient: 0.0028, mieDirectionalG: 0.8 },
    fog: { day: 0xaecfdc, night: 0x0a1620, density: 0.0013 },
    ambience: { waves: 0.45, wind: 0.3, birds: true, crickets: true, gulls: false },
    biteMult: 1.05,
    fishTable: [
      ["trespintas", 24], ["piraputanga", 20], ["curimbata", 16], ["pacupeva", 12], ["piavucu", 8],
      ["piapara", 7], ["pacu", 5], ["cachorra", 5], ["dourado", 2],
    ],
  },
  {
    id: "pier",
    name: "Barranco do Rio Paraguai",
    blurb: "Pesca de barranco no rio grande. Bagres no fundo, piauçu e pacu.",
    unlock: { level: 6, cost: 1800 },
    env: "pier",
    water: { color: 0x5a4a2e, distortion: 3.2, size: 2.6, timeScale: 0.85 },
    sky: { turbidity: 3.2, rayleigh: 2.0, mieCoefficient: 0.0035, mieDirectionalG: 0.82 },
    fog: { day: 0xb4cddb, night: 0x0a141e, density: 0.0010 },
    ambience: { waves: 0.45, wind: 0.35, birds: true, crickets: true, gulls: false },
    biteMult: 0.95,
    fishTable: [
      ["mandi", 24], ["piranha", 14], ["piavucu", 14], ["armado", 12], ["palmito", 8], ["jurupensem", 8],
      ["corvina", 6], ["barbado", 5], ["jurupoca", 4], ["pacu", 4], ["piapara", 3], ["cachara", 1.5], ["pintado", 1.2],
    ],
  },
  {
    id: "ocean",
    name: "Canal Fundo (de barco)",
    blurb: "O canal do Rio Paraguai, de barco, à noite. Pintado, cachara e o jaú.",
    unlock: { level: 10, cost: 6500 },
    env: "ocean",
    water: { color: 0x3a3424, distortion: 3.8, size: 2.0, timeScale: 1.0 },
    sky: { turbidity: 2.6, rayleigh: 2.2, mieCoefficient: 0.003, mieDirectionalG: 0.84 },
    fog: { day: 0xa8c6da, night: 0x060e1a, density: 0.0009 },
    ambience: { waves: 0.55, wind: 0.45, birds: true, crickets: true, gulls: false },
    biteMult: 0.9,
    fishTable: [
      ["piranha", 14], ["armado", 12], ["barbado", 12], ["palmito", 10], ["jurupensem", 9], ["jurupoca", 8],
      ["cachorra", 7], ["cachara", 6], ["pintado", 5], ["pati", 3], ["dourado", 1.6], ["jau", 1.4],
    ],
  },
];

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
