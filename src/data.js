/* ===== Dados: espécies, perfis de equipamento, iscas, nós, montagens ===== */

const NIVEIS = [
  { id: 'subindo', nome: 'Subindo', dica: 'repiquete, enchente' },
  { id: 'cheio', nome: 'Cheio', dica: 'campo alagado' },
  { id: 'baixando', nome: 'Baixando', dica: 'vazante' },
  { id: 'seco', nome: 'Baixo e estável', dica: 'seca' }
];
const AGUAS = [
  { id: 'clara', nome: 'Clara', sw: '#9fc9c4' },
  { id: 'verde', nome: 'Esverdeada', sw: '#6f8f55' },
  { id: 'barrenta', nome: 'Barrenta', sw: '#a2794a' }
];
const TEMPS = [
  { id: 'frio', nome: 'Frio', dica: 'abaixo de 20 °C' },
  { id: 'ameno', nome: 'Ameno', dica: '20 a 26 °C' },
  { id: 'quente', nome: 'Quente', dica: 'acima de 26 °C' }
];
const CLIMAS = [
  { id: 'sol', nome: 'Sol forte' },
  { id: 'nublado', nome: 'Nublado' },
  { id: 'chuva', nome: 'Chuva fina' },
  { id: 'pre', nome: 'Frente fria chegando', dica: 'abafado, pressão caindo' },
  { id: 'pos', nome: 'Pós-frente fria', dica: 'céu limpo, vento sul' }
];
const HORAS = [
  { id: 'madrugada', nome: 'Madrugada' },
  { id: 'amanhecer', nome: 'Amanhecer' },
  { id: 'dia', nome: 'Meio do dia' },
  { id: 'entardecer', nome: 'Entardecer' },
  { id: 'noite', nome: 'Noite' }
];
const LOCAIS = [
  { id: 'barco', nome: 'Barco' },
  { id: 'barranco', nome: 'Barranco' }
];
const VARIANTES = [
  { id: 'carretilha', nome: 'Carretilha' },
  { id: 'molinete', nome: 'Molinete' }
];

/* Tipos de isca artificial (usados no inventário e na recomendação) */
const ART_TIPOS = {
  zara: 'Zara (stickbait)', helice: 'Hélice', popper: 'Popper', sapo: 'Sapo / frog',
  meia: 'Meia-água (minnow)', crank: 'Crank / fundo', jig: 'Jig', shad: 'Shad de silicone',
  colher: 'Colher', spinner: 'Spinner / rodadeira'
};

/* Cores de isca (cores físicas da isca, não do tema) */
const CORES_ISCA = {
  prata: { nome: 'Prata / cromado', sw: '#c9d0d4' },
  osso: { nome: 'Osso / pérola', sw: '#ece4d2' },
  natural: { nome: 'Natural (lambari)', sw: '#8fa7a0' },
  transp: { nome: 'Transparente', sw: '#dfeef0' },
  branco: { nome: 'Branco', sw: '#f7f7f4' },
  dorsoverde: { nome: 'Dorso verde, barriga clara', sw: '#5f8a5a' },
  dourado: { nome: 'Dourado', sw: '#d8a531' },
  limao: { nome: 'Verde-limão / chartreuse', sw: '#c7e03a' },
  fogo: { nome: 'Fogo (amarelo e laranja)', sw: '#f08a24' },
  preto: { nome: 'Preto', sw: '#1e1e1e' },
  roxo: { nome: 'Roxo', sw: '#5d3b8c' },
  vermelho: { nome: 'Vermelho', sw: '#c7312b' },
  laranja: { nome: 'Laranja', sw: '#f26b1d' },
  amarelo: { nome: 'Amarelo', sw: '#f4cf2c' },
  glow: { nome: 'Glow (fosforescente)', sw: '#d9f7b6' }
};

/* ---------- Perfis de equipamento ----------
   Faixas: comp (m), lb (libras), tam (tamanho da carretilha/molinete),
   anzol: escala numérica (4/0 = 4, 1/0 = 1, nº1 = 0, nº2 = -1, nº4 = -3).  */
const PERFIS = {
  'art-leve': {
    nome: 'Isca artificial leve a média', rig: 'art-lider',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [12, 25], acao: 'rapida' },
      reel: { tipo: ['perfil'], tam: [100, 150], txt: 'Perfil baixo 100–150, drag 5 kg+' },
      linha: { tipo: 'multi', lb: [20, 30], txt: 'Multifilamento 8X 20–30 lb' },
      lider: { tipo: 'fluor', lb: [30, 40], comp: '50–80 cm', txt: 'Fluorcarbono 30–40 lb, 50–80 cm' },
      anzol: { modelo: 'offset', tam: [3, 5], txt: 'Garatéias da própria isca; anzol offset 3/0–5/0 no silicone', soSilicone: true },
      chumbada: null, nos: ['fg', 'loop']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 1.98], lb: [8, 17], acao: 'rapida' },
      reel: { tipo: ['molinete'], tam: [2500, 3000], txt: 'Molinete 2500–3000' },
      linha: { tipo: 'multi', lb: [15, 20], txt: 'Multifilamento 15–20 lb' },
      lider: { tipo: 'fluor', lb: [25, 30], comp: '60–100 cm', txt: 'Fluorcarbono 25–30 lb, 60–100 cm' },
      anzol: { modelo: 'offset', tam: [2, 4], txt: 'Garatéias da própria isca; offset 2/0–4/0 no silicone', soSilicone: true },
      chumbada: null, nos: ['fg', 'loop']
    }
  },
  'art-ultra': {
    nome: 'Isca artificial ultraleve', rig: 'art-lider',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.8], lb: [6, 14], acao: 'rapida' },
      reel: { tipo: ['perfil'], tam: [100, 100], txt: 'Perfil baixo 100 com freio fino (BFS, se tiver)' },
      linha: { tipo: 'multi', lb: [10, 15], txt: 'Multifilamento 10–15 lb' },
      lider: { tipo: 'fluor', lb: [12, 16], comp: '80–120 cm', txt: 'Fluorcarbono 12–16 lb (0,28–0,30 mm)' },
      anzol: null, chumbada: null, nos: ['fg', 'loop']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.65, 1.8], lb: [4, 10], acao: 'rapida' },
      reel: { tipo: ['molinete'], tam: [1000, 2000], txt: 'Molinete 1000–2000' },
      linha: { tipo: 'multi', lb: [8, 12], txt: 'Multifilamento 8–12 lb ou mono 0,25 mm' },
      lider: { tipo: 'fluor', lb: [10, 14], comp: '80–120 cm', txt: 'Fluorcarbono 10–14 lb' },
      anzol: null, chumbada: null, nos: ['fg', 'loop']
    }
  },
  'art-dourado': {
    nome: 'Isca artificial com empate de aço', rig: 'art-aco',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [150, 200], txt: 'Perfil baixo 150–200' },
      linha: { tipo: 'multi', lb: [30, 50], txt: 'Multifilamento 30–50 lb' },
      lider: { tipo: 'aco', lb: [30, 60], comp: '20–30 cm', txt: 'Empate de aço ou cabo flexível 30–60 lb, 20–30 cm' },
      anzol: { modelo: 'garateia', tam: [1, 3], txt: 'Garatéias reforçadas 3X ou 4X no lugar das originais', soGarateia: true },
      chumbada: null, nos: ['fg', 'palomar']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 2.1], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [3000, 4000], txt: 'Molinete 3000–4000' },
      linha: { tipo: 'multi', lb: [30, 40], txt: 'Multifilamento 30–40 lb' },
      lider: { tipo: 'aco', lb: [30, 50], comp: '20–30 cm', txt: 'Empate de aço 30–50 lb, 20–30 cm' },
      anzol: { modelo: 'garateia', tam: [1, 3], txt: 'Garatéias reforçadas 3X', soGarateia: true },
      chumbada: null, nos: ['fg', 'palomar']
    }
  },
  'fundo-bagre': {
    nome: 'Fundo para bagre grande', rig: 'fundo-corrida',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.8, 2.1], lb: [20, 50], acao: 'moderada' },
      reel: { tipo: ['redonda', 'perfil'], tam: [300, 400], txt: 'Redonda 300–400 (ou perfil baixo 300)' },
      linha: { tipo: 'multi', lb: [40, 65], txt: 'Multifilamento 4X 40–65 lb' },
      lider: { tipo: 'mono', lb: [60, 90], comp: '50–80 cm', txt: 'Mono 0,70–0,90 mm, 50–80 cm' },
      anzol: { modelo: 'circular', tam: [4, 8], txt: 'Circular 4/0–8/0' },
      chumbada: { tipo: 'oliva', g: [20, 60], txt: 'Oliva corrida 20–60 g' }, nos: ['palomar', 'uni']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [2.1, 2.4], lb: [20, 40], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [5000, 6000], txt: 'Molinete 5000–6000' },
      linha: { tipo: 'mono', lb: [35, 45], txt: 'Mono 0,50–0,60 mm ou multi 40 lb' },
      lider: { tipo: 'mono', lb: [60, 80], comp: '50–80 cm', txt: 'Mono 0,70–0,80 mm, 50–80 cm' },
      anzol: { modelo: 'circular', tam: [4, 7], txt: 'Circular 4/0–7/0' },
      chumbada: { tipo: 'oliva', g: [20, 60], txt: 'Oliva corrida 20–60 g' }, nos: ['palomar', 'uni']
    }
  },
  'fundo-jau': {
    nome: 'Fundo pesado', rig: 'fundo-pesado',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.8, 2.1], lb: [40, 80], acao: 'moderada' },
      reel: { tipo: ['redonda'], tam: [400, 500], txt: 'Redonda 400–500, drag 10 kg+' },
      linha: { tipo: 'multi', lb: [80, 100], txt: 'Multifilamento 80–100 lb' },
      lider: { tipo: 'aco', lb: [100, 150], comp: '60–100 cm', txt: 'Cabo de aço 100–150 lb ou mono 1,00 mm+' },
      anzol: { modelo: 'circular', tam: [8, 12], txt: 'Circular 8/0–12/0' },
      chumbada: { tipo: 'chata', g: [60, 150], txt: 'Chata 60–150 g (segura na correnteza)' }, nos: ['palomar', 'uni']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [2.1, 2.4], lb: [40, 60], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [8000, 10000], txt: 'Molinete 8000+ (a carretilha é mais indicada)' },
      linha: { tipo: 'multi', lb: [65, 80], txt: 'Multifilamento 65–80 lb' },
      lider: { tipo: 'aco', lb: [100, 150], comp: '60–100 cm', txt: 'Cabo de aço 100–150 lb' },
      anzol: { modelo: 'circular', tam: [8, 10], txt: 'Circular 8/0–10/0' },
      chumbada: { tipo: 'chata', g: [60, 150], txt: 'Chata 60–150 g' }, nos: ['palomar', 'uni']
    }
  },
  'fundo-medio': {
    nome: 'Fundo médio', rig: 'fundo-corrida',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.8, 2.1], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['perfil', 'redonda'], tam: [150, 300], txt: 'Perfil baixo 150–200 ou redonda 200–300' },
      linha: { tipo: 'multi', lb: [25, 40], txt: 'Multifilamento 25–40 lb' },
      lider: { tipo: 'mono', lb: [35, 45], comp: '40–60 cm', txt: 'Mono 0,50–0,60 mm, 40–60 cm' },
      anzol: { modelo: 'circular', tam: [2, 5], txt: 'Circular 2/0–5/0' },
      chumbada: { tipo: 'oliva', g: [15, 40], txt: 'Oliva corrida 15–40 g' }, nos: ['palomar', 'uni']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 2.1], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [3000, 4000], txt: 'Molinete 3000–4000' },
      linha: { tipo: 'mono', lb: [24, 30], txt: 'Mono 0,40–0,45 mm ou multi 25–30 lb' },
      lider: { tipo: 'mono', lb: [35, 45], comp: '40–60 cm', txt: 'Mono 0,50–0,60 mm' },
      anzol: { modelo: 'circular', tam: [2, 5], txt: 'Circular 2/0–5/0' },
      chumbada: { tipo: 'oliva', g: [15, 40], txt: 'Oliva corrida 15–40 g' }, nos: ['palomar', 'uni']
    }
  },
  'pacu': {
    nome: 'Pacu na fruta e no caranguejo', rig: 'fruta',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.8, 2.1], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [150, 200], txt: 'Perfil baixo 150–200' },
      linha: { tipo: 'multi', lb: [30, 40], txt: 'Multifilamento 30–40 lb' },
      lider: { tipo: 'mono', lb: [35, 45], comp: '30–50 cm', txt: 'Mono 0,50–0,60 mm (o dente corta), 30–50 cm' },
      anzol: { modelo: 'maruseigo', tam: [1, 4], txt: 'Maruseigo 1/0–4/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva 5–20 g (sem chumbo na fruta batida)' }, nos: ['palomar', 'uni']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [2.1, 2.4], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [4000, 5000], txt: 'Molinete 4000–5000' },
      linha: { tipo: 'mono', lb: [24, 35], txt: 'Mono 0,40–0,50 mm' },
      lider: { tipo: 'mono', lb: [35, 45], comp: '30–50 cm', txt: 'Mono 0,50–0,60 mm, 30–50 cm' },
      anzol: { modelo: 'maruseigo', tam: [1, 4], txt: 'Maruseigo 1/0–4/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva 5–20 g' }, nos: ['palomar', 'uni']
    }
  },
  'medio-escama': {
    nome: 'Fundo leve para peixe de escama', rig: 'fundo-corrida',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.8, 2.1], lb: [10, 20], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [100, 150], txt: 'Perfil baixo 100–150' },
      linha: { tipo: 'multi', lb: [15, 25], txt: 'Multifilamento 15–25 lb' },
      lider: { tipo: 'mono', lb: [18, 24], comp: '40 cm', txt: 'Mono 0,35–0,40 mm, 40 cm' },
      anzol: { modelo: 'maruseigo', tam: [0, 2], txt: 'Maruseigo nº 1 a 2/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva corrida 5–20 g' }, nos: ['palomar', 'uni']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 2.4], lb: [10, 20], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [2500, 4000], txt: 'Molinete 2500–4000' },
      linha: { tipo: 'mono', lb: [14, 24], txt: 'Mono 0,30–0,40 mm' },
      lider: { tipo: 'mono', lb: [18, 24], comp: '40 cm', txt: 'Mono 0,35–0,40 mm, 40 cm' },
      anzol: { modelo: 'maruseigo', tam: [0, 2], txt: 'Maruseigo nº 1 a 2/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva corrida 5–20 g' }, nos: ['palomar', 'uni']
    }
  },
  'leve-escama': {
    nome: 'Boia e linha fina', rig: 'boia',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [8, 17], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [100, 100], txt: 'Perfil baixo 100' },
      linha: { tipo: 'mono', lb: [12, 16], txt: 'Mono 0,28–0,30 mm ou multi 10–15 lb' },
      lider: { tipo: 'fluor', lb: [12, 16], comp: '40 cm', txt: 'Fluorcarbono 0,30 mm, 40 cm' },
      anzol: { modelo: 'maruseigo', tam: [-3, 0], txt: 'Chinu ou maruseigo nº 4 a nº 1' },
      chumbada: { tipo: 'chumbinho', g: [1, 5], txt: 'Chumbinho 1–5 g abaixo da boia' }, nos: ['palomar', 'clinch']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.65, 1.8], lb: [6, 14], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [1000, 2500], txt: 'Molinete 1000–2500' },
      linha: { tipo: 'mono', lb: [10, 14], txt: 'Mono 0,25–0,30 mm' },
      lider: { tipo: 'fluor', lb: [12, 16], comp: '40 cm', txt: 'Fluorcarbono 0,30 mm, 40 cm' },
      anzol: { modelo: 'maruseigo', tam: [-3, 0], txt: 'Chinu ou maruseigo nº 4 a nº 1' },
      chumbada: { tipo: 'chumbinho', g: [1, 5], txt: 'Chumbinho 1–5 g abaixo da boia' }, nos: ['palomar', 'clinch']
    }
  },
  'piranha': {
    nome: 'Dente afiado (piranha, traíra na isca natural)', rig: 'piranha',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [12, 25], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [100, 150], txt: 'Perfil baixo 100–150' },
      linha: { tipo: 'multi', lb: [20, 30], txt: 'Multifilamento 20–30 lb' },
      lider: { tipo: 'aco', lb: [20, 40], comp: '15–20 cm', txt: 'Empate de aço curto 20–40 lb, 15–20 cm' },
      anzol: { modelo: 'haste', tam: [1, 3], txt: 'Haste longa 1/0–3/0' },
      chumbada: { tipo: 'oliva', g: [5, 15], txt: 'Oliva 5–15 g' }, nos: ['palomar', 'clinch']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.65, 1.8], lb: [10, 20], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [2000, 3000], txt: 'Molinete 2000–3000' },
      linha: { tipo: 'mono', lb: [18, 24], txt: 'Mono 0,35–0,40 mm' },
      lider: { tipo: 'aco', lb: [20, 40], comp: '15–20 cm', txt: 'Empate de aço curto 20–40 lb, 15–20 cm' },
      anzol: { modelo: 'haste', tam: [1, 3], txt: 'Haste longa 1/0–3/0' },
      chumbada: { tipo: 'oliva', g: [5, 15], txt: 'Oliva 5–15 g' }, nos: ['palomar', 'clinch']
    }
  },
  'isca-viva': {
    nome: 'Isca viva com líder', rig: 'viva',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [12, 25], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [100, 150], txt: 'Perfil baixo 100–150' },
      linha: { tipo: 'multi', lb: [20, 30], txt: 'Multifilamento 20–30 lb' },
      lider: { tipo: 'fluor', lb: [30, 40], comp: '60 cm', txt: 'Fluorcarbono ou mono 30–40 lb, 60 cm' },
      anzol: { modelo: 'offset', tam: [1, 3], txt: 'Wide gap ou circular 1/0–3/0' },
      chumbada: { tipo: 'oliva', g: [3, 10], txt: 'Oliva leve 3–10 g (opcional)' }, nos: ['fg', 'palomar']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 2.1], lb: [10, 20], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [2500, 3000], txt: 'Molinete 2500–3000' },
      linha: { tipo: 'mono', lb: [18, 24], txt: 'Mono 0,35–0,40 mm' },
      lider: { tipo: 'fluor', lb: [25, 35], comp: '60 cm', txt: 'Fluorcarbono 25–35 lb, 60 cm' },
      anzol: { modelo: 'offset', tam: [1, 3], txt: 'Wide gap ou circular 1/0–3/0' },
      chumbada: { tipo: 'oliva', g: [3, 10], txt: 'Oliva leve 3–10 g (opcional)' }, nos: ['palomar', 'uni']
    }
  },
  'isca-viva-aco': {
    nome: 'Isca viva com empate de aço', rig: 'viva-aco',
    carretilha: {
      vara: { tipo: 'carretilha', comp: [1.68, 1.83], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['perfil'], tam: [150, 200], txt: 'Perfil baixo 150–200' },
      linha: { tipo: 'multi', lb: [30, 40], txt: 'Multifilamento 30–40 lb' },
      lider: { tipo: 'aco', lb: [30, 50], comp: '20–30 cm', txt: 'Empate de aço 30–50 lb, 20–30 cm' },
      anzol: { modelo: 'circular', tam: [2, 4], txt: 'Circular ou wide gap 2/0–4/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva 5–20 g conforme a correnteza' }, nos: ['fg', 'palomar']
    },
    molinete: {
      vara: { tipo: 'molinete', comp: [1.8, 2.1], lb: [15, 30], acao: 'moderada' },
      reel: { tipo: ['molinete'], tam: [3000, 4000], txt: 'Molinete 3000–4000' },
      linha: { tipo: 'mono', lb: [24, 35], txt: 'Mono 0,40–0,50 mm' },
      lider: { tipo: 'aco', lb: [30, 50], comp: '20–30 cm', txt: 'Empate de aço 30–50 lb' },
      anzol: { modelo: 'circular', tam: [2, 4], txt: 'Circular ou wide gap 2/0–4/0' },
      chumbada: { tipo: 'oliva', g: [5, 20], txt: 'Oliva 5–20 g' }, nos: ['palomar', 'uni']
    }
  }
};

/* ---------- Espécies ----------
   h: atividade por horário (0–3); t: por temperatura (0–3);
   c / n / a: ajuste por clima, nível e água (−2 a +2).
   iscas: p = peso base (1–3), col = coluna d'água, hor/agua/niv = condições
   em que a isca rende mais, frio:false = rende pouco no frio.               */
const H = (madrugada, amanhecer, dia, entardecer, noite) => ({ madrugada, amanhecer, dia, entardecer, noite });

const ESPECIES = [
  {
    id: 'pintado', nome: 'Pintado', outros: 'surubim-pintado, cambucu', sci: 'Pseudoplatystoma corruscans',
    grupo: 'couro', origem: 'nativa', regra: 'Leve 1 exemplar entre 85 e 125 cm (cota de nativa)',
    porte: 'Passa de 1 m. Comuns de 5 a 20 kg.',
    resumo: 'O bagre mais procurado do Pantanal. Caça à noite, no fundo, atrás de tuvira e muçum.',
    habitat: 'De dia fica em poços fundos do canal, bocas de baía e pauleira afundada. À noite sobe para praias e beiras rasas.',
    come: 'Tuvira, muçum, peixes pequenos, caranguejo e até pequenos roedores.',
    h: H(3, 2, 1, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 0, cheio: -1, baixando: 2, seco: 1 }, a: { clara: -1, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-bagre', perfilArt: 'art-dourado',
    iscas: [
      { nome: 'Tuvira viva', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 3, como: 'Anzol atravessado logo atrás da cabeça. Deixe no fundo com a linha esticada.' },
      { nome: 'Muçum', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2.4, como: 'Vivo ou em pedaço de 10 cm, anzol pela boca.' },
      { nome: 'Minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 2, agua: ['barrenta'], niv: ['subindo'], como: 'Inteiro, dobrado no anzol. Rende muito em água barrenta de repiquete.' },
      { nome: 'Piau ou ximburé em pedaço', tipo: 'natural', ic: 'posta', col: 'fundo', p: 1.6, como: 'Postas de 4 a 6 cm com a pele. Solta cheiro na correnteza.' },
      { nome: 'Crank de fundo', tipo: 'artificial', art: 'crank', col: 'fundo', p: 1, hor: ['entardecer', 'amanhecer'], frio: false, como: 'Recolhimento lento batendo no fundo e na pauleira, em água pouco turva.' }
    ],
    onde: {
      subindo: 'Beiras de barranco recém-alagadas e entradas de corixo, onde a tuvira se esconde no capim.',
      cheio: 'Espalhado no campo alagado e difícil de achar. Concentre-se em bocas de baía com água corrente.',
      baixando: 'Melhor fase. Saídas de baía e de corixo no rio, onde ele espera a tuvira que deixa o campo.',
      seco: 'Poços fundos do canal e pauleira afundada de dia. Praias rasas à noite.'
    },
    dicas: [
      'Deixe o peixe levar a isca de 3 a 5 segundos antes de travar. Com anzol circular, só recolha firme, sem fisgada brusca.',
      'Os ferrões das nadadeiras cortam. Segure por baixo, atrás da cabeça.',
      'Freio leve na hora da puxada e firme depois de fisgar: ele corre para a pauleira.'
    ],
    d: { L: 285, ht: 34, hb: 30, hp: 11, tm: 0.33, head: 'flat', sy: 6, back: '#5c6b73', belly: '#eef0ee', fin: '#77858b',
      tail: 'forked', tl: 62, th: 40, barbels: { n: 3, len: 95 }, eye: { x: 40, y: 10, r: 4 }, mouth: 'wide',
      dorsal: { x: 0.3, w: 0.13, h: 30 }, adipose: { x: 0.73, w: 0.1, h: 9 }, anal: { x: 0.74, w: 0.08, h: 16 }, pelvic: { x: 0.52, h: 16 }, pectoral: true,
      pattern: [{ t: 'spots', n: 70, r: [2.5, 5], c: '#1f2427', area: 0.75 }], lateral: true }
  },
  {
    id: 'cachara', nome: 'Cachara', outros: 'surubim-cachara', sci: 'Pseudoplatystoma reticulatum',
    grupo: 'couro', origem: 'nativa', regra: 'Leve 1 exemplar entre 80 e 120 cm (cota de nativa)',
    porte: 'Até 1 m. Comuns de 3 a 12 kg.',
    resumo: 'Parente do pintado, com listras verticais. Mais agressivo em isca artificial no entardecer.',
    habitat: 'Fundo do canal e pauleira de dia. No fim da tarde e à noite caça em praias, bocas de baía e beira de barranco raso.',
    come: 'Tuvira, lambari, sairu, muçum e caranguejo.',
    h: H(2, 2, 1, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 0, cheio: -1, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-bagre', perfilArt: 'art-dourado',
    iscas: [
      { nome: 'Tuvira viva', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 3, como: 'Anzol atrás da cabeça; fundo com linha esticada ou deriva lenta na beira.' },
      { nome: 'Lambari ou sairu vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 2.2, como: 'Anzol pelo lombo para nadar livre, perto da pauleira.' },
      { nome: 'Meia-água de 10–12 cm', tipo: 'artificial', art: 'meia', col: 'meia', p: 2, hor: ['entardecer', 'amanhecer'], agua: ['clara', 'verde'], frio: false, como: 'Recolhimento lento com pausas, rente à pauleira e às praias.' },
      { nome: 'Crank de fundo', tipo: 'artificial', art: 'crank', col: 'fundo', p: 1.3, hor: ['entardecer'], como: 'Bata a barbela no fundo e na estrutura.' },
      { nome: 'Muçum', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 1.8, como: 'Pedaço de 10 cm, anzol pela boca.' }
    ],
    onde: {
      subindo: 'Beiras recém-alagadas e capim das entradas de corixo.',
      cheio: 'Bocas de baía com água corrente e beiras de vegetação.',
      baixando: 'Saídas de baía e corixo, e praias que vão aparecendo no fim da tarde.',
      seco: 'Pauleira e poços do canal de dia; praias e rasos a partir do entardecer.'
    },
    dicas: [
      'No fim da tarde, arremesse a meia-água rente às praias rasas antes de mudar para a isca natural.',
      'Como o pintado, deixe levar a isca natural alguns segundos antes de recolher firme.'
    ],
    d: { L: 280, ht: 31, hb: 26, hp: 10, tm: 0.33, head: 'flat', sy: 5, back: '#6b6a5e', belly: '#efeee6', fin: '#7d7b6d',
      tail: 'forked', tl: 60, th: 38, barbels: { n: 3, len: 90 }, eye: { x: 38, y: 9, r: 4 }, mouth: 'wide',
      dorsal: { x: 0.3, w: 0.13, h: 28 }, adipose: { x: 0.73, w: 0.1, h: 9 }, anal: { x: 0.74, w: 0.08, h: 15 }, pelvic: { x: 0.52, h: 15 }, pectoral: true,
      pattern: [{ t: 'bars', n: 13, c: '#24221d', w: 4, wobble: 1 }, { t: 'spots', n: 18, r: [2, 3.5], c: '#24221d', area: 0.6 }], lateral: true }
  },
  {
    id: 'jau', nome: 'Jaú', outros: 'pacamão', sci: 'Zungaro jahu',
    grupo: 'couro', origem: 'nativa', regra: 'Leve 1 exemplar entre 95 e 130 cm (cota de nativa)',
    porte: 'O maior bagre da bacia; pode passar de 100 kg.',
    resumo: 'Gigante de poço fundo e pé de cachoeira. Briga entocando na pedra.',
    habitat: 'Poços fundos, pés de cachoeira, pedreiras e trechos de correnteza forte.',
    come: 'Peixes inteiros: curimbatá, piau, piranha.',
    h: H(3, 1, 0, 2, 3), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: -1, nublado: 0, chuva: 1, pre: 2, pos: -2 }, n: { subindo: 0, cheio: -1, baixando: 2, seco: 2 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-jau', perfilArt: null,
    iscas: [
      { nome: 'Peixe inteiro ou posta grande', tipo: 'natural', ic: 'posta', col: 'fundo', p: 3, como: 'Curimbatá, piau ou piranha inteiros ou em postas grandes, com a pele.' },
      { nome: 'Tuvira grande', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2, como: 'Duas tuviras no mesmo anzol aumentam o volume.' },
      { nome: 'Muçum', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2, como: 'Inteiro, anzol pela boca.' }
    ],
    onde: {
      subindo: 'Poços de remanso abaixo de corredeiras.',
      cheio: 'Pés de cachoeira e poços de pedra.',
      baixando: 'Poços fundos do canal e pedreiras com correnteza.',
      seco: 'Poços fundos de pedra; é a melhor época para tentar.'
    },
    dicas: [
      'Ao fisgar, tire o peixe da toca nos primeiros segundos, sem dar linha.',
      'Freio quase travado e vara apoiada: a primeira arrancada é a mais forte.'
    ],
    d: { L: 275, ht: 46, hb: 38, hp: 15, tm: 0.3, head: 'flat', sy: 8, back: '#5b5136', belly: '#d8cfb4', fin: '#5f563c',
      tail: 'forked', tl: 50, th: 40, barbels: { n: 3, len: 55 }, eye: { x: 44, y: 14, r: 3.5 }, mouth: 'wide',
      dorsal: { x: 0.3, w: 0.12, h: 30 }, adipose: { x: 0.68, w: 0.16, h: 10 }, anal: { x: 0.74, w: 0.09, h: 18 }, pelvic: { x: 0.5, h: 18 }, pectoral: true,
      pattern: [{ t: 'blotch', n: 16, c: '#3a3320', area: 0.8 }], lateral: true }
  },
  {
    id: 'barbado', nome: 'Barbado', outros: 'barba-chata', sci: 'Pinirampus pirinampu',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 60 cm (cota de nativa)',
    porte: 'Até 80 cm e cerca de 8 kg.',
    resumo: 'Bagre prateado de barbilhões chatos, que anda em cardume no canal e come bem de dia em água barrenta.',
    habitat: 'Canal do rio com correnteza média, fundo de areia e beira de barranco.',
    come: 'Peixes pequenos e pedaços de peixe.',
    h: H(2, 2, 2, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 1, cheio: 0, baixando: 2, seco: 1 }, a: { clara: -1, verde: 1, barrenta: 2 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Pedaço de peixe (piau, piranha)', tipo: 'natural', ic: 'posta', col: 'fundo', p: 3, como: 'Filé de 5 cm com a pele, bem preso no anzol.' },
      { nome: 'Tuvira', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2, como: 'Viva ou recém-morta.' },
      { nome: 'Minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 2, agua: ['barrenta'], como: 'Inteiro, ótimo na água barrenta.' },
      { nome: 'Coração de boi', tipo: 'natural', ic: 'coracao', col: 'fundo', p: 1.2, como: 'Tiras firmes de 6 cm.' }
    ],
    onde: {
      subindo: 'Beira de barranco no canal, onde a água barrenta entra.',
      cheio: 'Canal principal, atrás de bancos de areia.',
      baixando: 'Canal e encontros de água, em cardume.',
      seco: 'Poços do canal com fundo de areia.'
    },
    dicas: ['Quando um sai, insista no ponto: costuma estar em cardume.', 'Cuidado com os ferrões peitorais ao desanzolar.'],
    d: { L: 270, ht: 30, hb: 24, hp: 9, tm: 0.33, head: 'flat', sy: 5, back: '#7c8790', belly: '#e9edef', fin: '#8e98a0',
      tail: 'forked', tl: 70, th: 46, barbels: { n: 2, len: 120, flat: true }, eye: { x: 36, y: 8, r: 4 }, mouth: 'wide',
      dorsal: { x: 0.3, w: 0.12, h: 30 }, adipose: { x: 0.55, w: 0.33, h: 8 }, anal: { x: 0.68, w: 0.18, h: 14 }, pelvic: { x: 0.48, h: 14 }, pectoral: true,
      pattern: [], lateral: true }
  },
  {
    id: 'jurupoca', nome: 'Jurupoca', outros: 'jerepoca, braço-de-moça', sci: 'Hemisorubim platyrhynchos',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 40 cm (cota de nativa)',
    porte: 'Até 50 cm e cerca de 3 kg.',
    resumo: 'Bagre de bico achatado e manchas escuras, de carne muito apreciada. Ativo à noite.',
    habitat: 'Bocas de baía, beiras de rio e praias rasas à noite.',
    come: 'Peixes pequenos e invertebrados.',
    h: H(3, 1, 0, 2, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 0, cheio: 0, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Lambari ou pedaço de peixe', tipo: 'natural', ic: 'peixe', col: 'fundo', p: 3, como: 'Lambari inteiro ou filé pequeno.' },
      { nome: 'Tuvira pequena', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2.2, como: 'Viva, anzol atrás da cabeça.' },
      { nome: 'Minhoca ou minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 1.8, como: 'Bem enfiada no anzol.' }
    ],
    onde: {
      subindo: 'Bocas de corixo e beira de vegetação.', cheio: 'Bocas de baía com corrente.',
      baixando: 'Saídas de baía e praias que estão aparecendo.', seco: 'Praias rasas e beira de barranco à noite.'
    },
    dicas: ['Use equipamento médio: o peixe é pequeno, mas mora perto de pauleira.'],
    d: { L: 265, ht: 26, hb: 22, hp: 8, tm: 0.38, head: 'duck', snout: 18, sy: 3, back: '#a08a52', belly: '#f1ead4', fin: '#9b8857',
      tail: 'forked', tl: 58, th: 36, barbels: { n: 3, len: 50 }, eye: { x: 52, y: 8, r: 3.5 }, mouth: 'wide',
      dorsal: { x: 0.33, w: 0.12, h: 26 }, adipose: { x: 0.72, w: 0.1, h: 8 }, anal: { x: 0.73, w: 0.08, h: 13 }, pelvic: { x: 0.52, h: 13 }, pectoral: true,
      pattern: [{ t: 'blotch', n: 9, c: '#3d3318', area: 0.5, row: true }], lateral: true }
  },
  {
    id: 'jurupensem', nome: 'Jurupensém', outros: 'bico-de-pato', sci: 'Sorubim lima',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 35 cm (cota de nativa)',
    porte: 'Até 70 cm e cerca de 3 kg.',
    resumo: 'Bico de pato longo e faixa escura do focinho à cauda. Anda em cardume em remansos.',
    habitat: 'Remansos, baías e praias à noite.',
    come: 'Peixes pequenos e invertebrados.',
    h: H(3, 1, 1, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 0, cheio: 0, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'fundo', p: 3, como: 'Vivo, anzol pelos lábios.' },
      { nome: 'Minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 2, como: 'Inteiro.' },
      { nome: 'Pedaço de peixe', tipo: 'natural', ic: 'posta', col: 'fundo', p: 1.8, como: 'Filé pequeno com pele.' }
    ],
    onde: { subindo: 'Remansos de beira.', cheio: 'Baías ligadas ao rio.', baixando: 'Saídas de baía e remansos.', seco: 'Praias e remansos à noite.' },
    dicas: ['Boca pequena para o tamanho do bico: prefira anzol circular 2/0–3/0.'],
    d: { L: 275, ht: 22, hb: 19, hp: 7, tm: 0.4, head: 'duck', snout: 34, sy: 2, back: '#8e979b', belly: '#f0f2f2', fin: '#9aa3a6',
      tail: 'forked', tl: 56, th: 34, barbels: { n: 3, len: 40 }, eye: { x: 66, y: 6, r: 3.5 }, mouth: 'wide',
      dorsal: { x: 0.36, w: 0.11, h: 24 }, adipose: { x: 0.72, w: 0.1, h: 7 }, anal: { x: 0.73, w: 0.08, h: 12 }, pelvic: { x: 0.54, h: 12 }, pectoral: true,
      pattern: [{ t: 'band', c: '#2a2f33', y: 0, w: 7 }], lateral: false }
  },
  {
    id: 'palmito', nome: 'Palmito', outros: 'mandubé, fidalgo', sci: 'Ageneiosus inermis',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 35 cm (cota de nativa)',
    porte: 'Até 50 cm e cerca de 2,5 kg.',
    resumo: 'Bagre prateado de boca grande e quase sem barbilhões. Carne muito saborosa.',
    habitat: 'Remansos e beiras do rio, baías.',
    come: 'Peixes pequenos e invertebrados.',
    h: H(2, 2, 1, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 1, cheio: 0, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 3, como: 'Pelos lábios, perto do fundo.' },
      { nome: 'Pedaço de peixe', tipo: 'natural', ic: 'posta', col: 'fundo', p: 2, como: 'Filé pequeno.' },
      { nome: 'Minhoca', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 1.6, como: 'Duas ou três no anzol.' }
    ],
    onde: { subindo: 'Remansos de beira.', cheio: 'Baías.', baixando: 'Remansos atrás de bancos e saídas de baía.', seco: 'Remansos e poços de beira.' },
    dicas: ['Boca grande e mole: recolha firme e constante, sem trancos.'],
    d: { L: 265, ht: 30, hb: 26, hp: 8, tm: 0.36, head: 'pointed', sy: 2, back: '#7d8a92', belly: '#f2f4f5', fin: '#9aa6ad',
      tail: 'forked', tl: 60, th: 36, barbels: null, eye: { x: 30, y: 4, r: 5 }, mouth: 'big',
      dorsal: { x: 0.25, w: 0.1, h: 30 }, adipose: { x: 0.74, w: 0.07, h: 6 }, anal: { x: 0.6, w: 0.22, h: 14 }, pelvic: { x: 0.45, h: 14 }, pectoral: true,
      pattern: [], lateral: true }
  },
  {
    id: 'armado', nome: 'Armado', outros: 'armau, abotoado, botoado', sci: 'Pterodoras granulosus',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 35 cm (cota de nativa)',
    porte: 'Até cerca de 70 cm e 5 kg. Comuns de 1 a 3 kg.',
    resumo: 'Bagre de placas ósseas com espinhos na lateral. Briga no fundo e aparece muito na pesca de barranco.',
    habitat: 'Canais e remansos de rio grande, fundo de areia ou lodo, bocas de baía.',
    come: 'Onívoro: caramujos, frutos, sementes, crustáceos e restos.',
    h: H(3, 1, 0, 2, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 1, cheio: 1, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 1 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Caramujo', tipo: 'natural', ic: 'caranguejo', col: 'fundo', p: 3, como: 'Sem a casca, bem preso no anzol.' },
      { nome: 'Minhoca ou minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 2.6, como: 'Bem enfiada, cobrindo o anzol.' },
      { nome: 'Coração de boi ou de galinha', tipo: 'natural', ic: 'coracao', col: 'fundo', p: 2.2, como: 'Em tiras ou inteiro (galinha).' },
      { nome: 'Pedaço de peixe', tipo: 'natural', ic: 'posta', col: 'fundo', p: 1.8, como: 'Filé pequeno com pele.' }
    ],
    onde: { subindo: 'Bocas de corixo e beira de barranco.', cheio: 'Remansos do canal e bocas de baía.', baixando: 'Canal principal, logo abaixo das saídas de baía.', seco: 'Poços do canal, à noite.' },
    dicas: ['Os espinhos das placas e das nadadeiras cortam: use alicate e pano para segurar.', 'Fisgue firme e tire do fundo logo, antes que ele entoque.'],
    d: { L: 265, ht: 26, hb: 22, hp: 8, tm: 0.38, head: 'blunt', sy: 3, back: '#6b5a48', belly: '#cdbfa8', fin: '#6f5d48',
      tail: 'forked', tl: 58, th: 36, barbels: { n: 3, len: 50 }, eye: { x: 52, y: 8, r: 3.5 }, mouth: 'wide',
      dorsal: { x: 0.33, w: 0.12, h: 26 }, adipose: { x: 0.72, w: 0.1, h: 8 }, anal: { x: 0.73, w: 0.08, h: 13 }, pelvic: { x: 0.52, h: 13 }, pectoral: true,
      pattern: [], lateral: true }
  },
  {
    id: 'pati', nome: 'Pati', outros: '', sci: 'Luciopimelodus pati',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 65 cm (cota de nativa)',
    porte: 'Até cerca de 70 cm e 5 kg.',
    resumo: 'Bagre prateado de corpo alongado e barbilhões longos. Caça no canal à noite, em água barrenta.',
    habitat: 'Canal principal de rio grande, fundo com correnteza moderada.',
    come: 'Peixes pequenos, camarões e insetos.',
    h: H(3, 1, 0, 2, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 2, cheio: 1, baixando: 2, seco: 0 }, a: { clara: -1, verde: 1, barrenta: 2 },
    perfilNat: 'fundo-medio', perfilArt: null,
    iscas: [
      { nome: 'Lambari ou pedaço de peixe', tipo: 'natural', ic: 'peixe', col: 'fundo', p: 3, como: 'Lambari inteiro ou filé com pele.' },
      { nome: 'Tuvira', tipo: 'natural', ic: 'tuvira', col: 'fundo', p: 2.4, como: 'Viva, anzol atrás da cabeça.' },
      { nome: 'Minhocuçu', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 1.8, como: 'Inteiro, bem preso.' }
    ],
    onde: { subindo: 'Canal com água barrenta e correnteza.', cheio: 'Beira do canal e bocas de corixo.', baixando: 'Canal principal na saída das baías.', seco: 'Poços fundos do canal.' },
    dicas: ['Pesca de fundo à noite, com chumbo que segure na correnteza.', 'A medida mínima é alta (65 cm): solte os menores com cuidado.'],
    d: { L: 270, ht: 30, hb: 24, hp: 9, tm: 0.33, head: 'flat', sy: 5, back: '#8a8f96', belly: '#ebecee', fin: '#9aa0a6',
      tail: 'forked', tl: 70, th: 46, barbels: { n: 2, len: 120, flat: true }, eye: { x: 36, y: 8, r: 4 }, mouth: 'wide',
      dorsal: { x: 0.3, w: 0.12, h: 30 }, adipose: { x: 0.55, w: 0.33, h: 8 }, anal: { x: 0.68, w: 0.18, h: 14 }, pelvic: { x: 0.48, h: 14 }, pectoral: true,
      pattern: [], lateral: true }
  },
  {
    id: 'mandi', nome: 'Mandi-amarelo', outros: 'mandi, mandi-pintado', sci: 'Pimelodus maculatus',
    grupo: 'couro', origem: 'nativa', regra: 'Mínimo 25 cm (cota de nativa)',
    porte: 'Até cerca de 40 cm e 1 kg. Comuns de 20 a 30 cm.',
    resumo: 'Bagre pequeno e muito comum na pesca de barranco. Os ferrões da dorsal e do peito dão ferroada dolorida.',
    habitat: 'Fundo de rio, beira de barranco, remansos e represas.',
    come: 'Onívoro: insetos, minhocas, pequenos peixes, sementes e restos.',
    h: H(3, 2, 0, 3, 3), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 2, pos: -1 }, n: { subindo: 2, cheio: 1, baixando: 2, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 2 },
    perfilNat: 'leve-escama', perfilArt: null,
    iscas: [
      { nome: 'Minhoca', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 3, como: 'Inteira ou em pedaços, cobrindo o anzol.' },
      { nome: 'Coração de galinha', tipo: 'natural', ic: 'coracao', col: 'fundo', p: 2.6, como: 'Em pedaços, bem preso.' },
      { nome: 'Massa', tipo: 'natural', ic: 'massa', col: 'fundo', p: 2, como: 'Massa firme com cheiro forte.' },
      { nome: 'Pedaço de peixe', tipo: 'natural', ic: 'posta', col: 'fundo', p: 1.8, como: 'Tiras pequenas de lambari.' }
    ],
    onde: { subindo: 'Beira de barranco com água turvando.', cheio: 'Remansos e bocas de corixo.', baixando: 'Barrancos do canal no fim da tarde.', seco: 'Poços de beira e remansos à noite.' },
    dicas: ['Segure por trás das nadadeiras peitorais, com o polegar na nuca, para não levar ferroada.', 'Chumbo só para tocar o fundo; ele belisca e engole rápido no fim da tarde.'],
    d: { L: 265, ht: 26, hb: 22, hp: 8, tm: 0.38, head: 'blunt', sy: 3, back: '#9a8a4a', belly: '#efe2b0', fin: '#c9a640',
      tail: 'forked', tl: 58, th: 36, barbels: { n: 3, len: 50 }, eye: { x: 52, y: 8, r: 3.5 }, mouth: 'wide',
      dorsal: { x: 0.33, w: 0.12, h: 26 }, adipose: { x: 0.72, w: 0.1, h: 8 }, anal: { x: 0.73, w: 0.08, h: 13 }, pelvic: { x: 0.52, h: 13 }, pectoral: true,
      pattern: [{ t: 'blotch', n: 9, c: '#3d3318', area: 0.5, row: true }], lateral: true }
  },
  {
    id: 'pacu', nome: 'Pacu', outros: 'pacu-caranha, caranha', sci: 'Piaractus mesopotamicus',
    grupo: 'escama', origem: 'nativa', regra: 'Leve 1 exemplar entre 45 e 65 cm (cota de nativa)',
    porte: 'Até cerca de 15 kg. Comuns de 2 a 6 kg.',
    resumo: 'Come frutas, sementes e caranguejo. Briga forte e corta linha com os dentes.',
    habitat: 'Sob árvores frutíferas na margem, galhada, remansos e baías ligadas ao rio.',
    come: 'Frutas nativas, sementes, caranguejo, caramujo e peixes.',
    h: H(1, 3, 2, 3, 1), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -2 }, n: { subindo: 2, cheio: 2, baixando: 1, seco: -1 }, a: { clara: 0, verde: 1, barrenta: 0 },
    perfilNat: 'pacu', perfilArt: 'art-leve',
    iscas: [
      { nome: 'Fruta nativa (ximbuva, tucum, laranjinha-de-pacu, figo)', tipo: 'natural', ic: 'fruta', col: 'sup', p: 3, niv: ['subindo', 'cheio'], hor: ['amanhecer', 'dia', 'entardecer'], como: 'Pesque sob a árvore que está soltando fruta e bata a isca na água para imitar a queda.' },
      { nome: 'Caranguejo', tipo: 'natural', ic: 'caranguejo', col: 'fundo', p: 2.8, niv: ['baixando', 'seco'], como: 'Inteiro sem as patas grandes, ou em pedaço, no fundo perto da galhada.' },
      { nome: 'Coquinho (bocaiuva, acuri)', tipo: 'natural', ic: 'fruta', col: 'meia', p: 2, como: 'Inteiro, anzol pelo lado. Funciona bem com ceva.' },
      { nome: 'Milho verde', tipo: 'natural', ic: 'milho', col: 'fundo', p: 1.8, como: 'Dois a quatro grãos. Bom com ceva de milho no ponto.' },
      { nome: 'Meia-água pequena', tipo: 'artificial', art: 'meia', col: 'meia', p: 0.8, frio: false, agua: ['clara', 'verde'], como: 'Recolhimento lento perto da galhada; pacu ataca por reação no calor.' }
    ],
    onde: {
      subindo: 'Margens com frutíferas começando a alagar. É a época da fruta.',
      cheio: 'Dentro da mata alagada e sob frutíferas; procure o barulho da fruta caindo.',
      baixando: 'Galhada e remansos na saída das baías; troque a fruta pelo caranguejo.',
      seco: 'Poços com galhada e remansos fundos. Caranguejo e massa no fundo.'
    },
    dicas: [
      'Espere o pacu levar a isca e fisgue firme: a boca é dura.',
      'Ele parte para a galhada. Segure com a vara e não deixe correr.',
      'A pesca com fruta batida é uma técnica tradicional pantaneira descrita pela Embrapa Pantanal.'
    ],
    d: { L: 225, ht: 62, hb: 60, hp: 13, tm: 0.42, head: 'blunt', sy: 8, back: '#4b4f4a', belly: '#e1c78a', fin: '#c46a2e',
      tail: 'truncate', tl: 46, th: 46, tailColor: '#3d403c', barbels: null, eye: { x: 30, y: 14, r: 6 }, mouth: 'small',
      dorsal: { x: 0.42, w: 0.17, h: 34 }, adipose: { x: 0.8, w: 0.06, h: 8 }, anal: { x: 0.68, w: 0.2, h: 20 }, pelvic: { x: 0.5, h: 18 }, pectoral: true,
      pattern: [{ t: 'belly', c: '#d9a654' }], scales: true, lateral: true }
  },
  {
    id: 'pacupeva', nome: 'Pacu-peva', outros: 'pacu-manteiga', sci: 'Mylossoma duriventre',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 20 cm (cota de nativa)',
    porte: 'Até cerca de 25 cm e 1 kg.',
    resumo: 'Pacu pequeno e arredondado, de cardume. Diversão com equipamento leve.',
    habitat: 'Baías, remansos e beiras com vegetação.',
    come: 'Frutinhas, sementes, insetos e plantas.',
    h: H(0, 3, 3, 3, 0), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 1, pos: -2 }, n: { subindo: 1, cheio: 2, baixando: 1, seco: 0 }, a: { clara: 1, verde: 1, barrenta: -1 },
    perfilNat: 'leve-escama', perfilArt: null,
    iscas: [
      { nome: 'Massa (farinha e fubá)', tipo: 'natural', ic: 'massa', col: 'meia', p: 3, como: 'Bolinha cobrindo o anzol, com ceva no ponto.' },
      { nome: 'Milho cozido', tipo: 'natural', ic: 'milho', col: 'meia', p: 2.5, como: 'Um ou dois grãos.' },
      { nome: 'Frutinha', tipo: 'natural', ic: 'fruta', col: 'sup', p: 2, niv: ['cheio', 'subindo'], como: 'Pequena, na boia rasa.' }
    ],
    onde: { subindo: 'Beiras com vegetação recém-alagada.', cheio: 'Baías e mata alagada.', baixando: 'Saídas de baía.', seco: 'Remansos com vegetação.' },
    dicas: ['Boia sensível e anzol pequeno: ele belisca antes de engolir.'],
    d: { L: 200, ht: 66, hb: 64, hp: 11, tm: 0.45, head: 'blunt', sy: 6, back: '#9aa3a2', belly: '#e9ddb8', fin: '#d28a4a',
      tail: 'truncate', tl: 40, th: 40, tailColor: '#8f9897', barbels: null, eye: { x: 26, y: 14, r: 6 }, mouth: 'small',
      dorsal: { x: 0.45, w: 0.15, h: 28 }, adipose: { x: 0.8, w: 0.06, h: 6 }, anal: { x: 0.62, w: 0.26, h: 18 }, pelvic: { x: 0.5, h: 14 }, pectoral: true,
      pattern: [{ t: 'belly', c: '#e6b866' }], scales: true, lateral: true }
  },
  {
    id: 'piavucu', nome: 'Piauçu', outros: 'piavuçu, piavussu, piau-açu', sci: 'Megaleporinus macrocephalus',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 38 cm (cota de nativa)',
    porte: 'Até 60 cm e cerca de 3 kg.',
    resumo: 'O peixe mais pescado do Pantanal de MS. Tira a isca com delicadeza sem se fisgar: pede atenção e fisgada rápida.',
    habitat: 'Barrancos, canais, baías com vegetação e pés de cachoeira.',
    come: 'Caranguejo, caramujo, frutas, sementes e plantas.',
    h: H(1, 3, 2, 3, 1), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: 1, cheio: 1, baixando: 2, seco: 1 }, a: { clara: 1, verde: 1, barrenta: 0 },
    perfilNat: 'medio-escama', perfilArt: null,
    iscas: [
      { nome: 'Caranguejo', tipo: 'natural', ic: 'caranguejo', col: 'fundo', p: 3, como: 'Pedaços pequenos, cobrindo bem o anzol.' },
      { nome: 'Massa com ceva', tipo: 'natural', ic: 'massa', col: 'fundo', p: 2.6, como: 'Massa firme, com ceva de milho ou ração no ponto.' },
      { nome: 'Milho verde', tipo: 'natural', ic: 'milho', col: 'fundo', p: 2, como: 'Dois ou três grãos.' },
      { nome: 'Caramujo', tipo: 'natural', ic: 'caranguejo', col: 'fundo', p: 1.8, como: 'Sem a casca, bem preso.' }
    ],
    onde: { subindo: 'Beira de barranco com vegetação.', cheio: 'Canais e baías.', baixando: 'Barrancos do canal e pés de cachoeira.', seco: 'Poços de beira com fundo limpo.' },
    dicas: ['Fisgue no primeiro toque firme; se esperar, ele limpa o anzol.', 'Caniço de bambu ou molinete leve funcionam bem no barranco.'],
    d: { L: 260, ht: 34, hb: 28, hp: 10, tm: 0.38, head: 'pointed', sy: 3, back: '#6e7d5b', belly: '#ece8d6', fin: '#a8916a',
      tail: 'forked', tl: 56, th: 34, barbels: null, eye: { x: 26, y: 7, r: 5 }, mouth: 'small',
      dorsal: { x: 0.36, w: 0.13, h: 30 }, adipose: { x: 0.76, w: 0.06, h: 7 }, anal: { x: 0.74, w: 0.08, h: 14 }, pelvic: { x: 0.52, h: 14 }, pectoral: true,
      pattern: [{ t: 'spots3', c: '#222a1e' }], scales: true, lateral: true }
  },
  {
    id: 'trespintas', nome: 'Piau-três-pintas', outros: 'piau, aracu', sci: 'Leporinus friderici',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 25 cm (cota de nativa)',
    porte: 'Até cerca de 40 cm e 1,5 kg. Comuns de 25 a 35 cm.',
    resumo: 'Piau das três manchas escuras na lateral. Belisca a isca e pede fisgada curta e rápida.',
    habitat: 'Remansos, pés de corredeira, beira de barranco com pedra e lagoas.',
    come: 'Onívoro: sementes, frutas, insetos, algas e pequenos crustáceos.',
    h: H(0, 3, 2, 3, 0), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: 0, cheio: 1, baixando: 2, seco: 2 }, a: { clara: 2, verde: 1, barrenta: -1 },
    perfilNat: 'leve-escama', perfilArt: null,
    iscas: [
      { nome: 'Massa com ceva', tipo: 'natural', ic: 'massa', col: 'fundo', p: 3, como: 'Massa firme, com ceva de milho no ponto.' },
      { nome: 'Milho verde', tipo: 'natural', ic: 'milho', col: 'fundo', p: 2.6, como: 'Dois ou três grãos, anzol pequeno.' },
      { nome: 'Minhoca', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 2.2, como: 'Pedaço pequeno, cobrindo a ponta do anzol.' },
      { nome: 'Caranguejo', tipo: 'natural', ic: 'caranguejo', col: 'fundo', p: 1.8, como: 'Pedacinhos.' }
    ],
    onde: { subindo: 'Remansos laterais com água mais limpa.', cheio: 'Beira de baía e pés de corredeira.', baixando: 'Pés de corredeira e barrancos com pedra.', seco: 'Remansos e poços de água clara.' },
    dicas: ['Anzol pequeno (chinu ou maruseigo 2 a 4) e linha fina: ele desconfia.', 'Cevar o ponto com milho segura o cardume.'],
    d: { L: 260, ht: 34, hb: 28, hp: 10, tm: 0.38, head: 'pointed', sy: 3, back: '#7a6a3c', belly: '#efe6c8', fin: '#c9a24a',
      tail: 'forked', tl: 56, th: 34, barbels: null, eye: { x: 26, y: 7, r: 5 }, mouth: 'small',
      dorsal: { x: 0.36, w: 0.13, h: 30 }, adipose: { x: 0.76, w: 0.06, h: 7 }, anal: { x: 0.74, w: 0.08, h: 14 }, pelvic: { x: 0.52, h: 14 }, pectoral: true,
      pattern: [{ t: 'spots3', c: '#222a1e' }], scales: true, lateral: true }
  },
  {
    id: 'piapara', nome: 'Piapara', outros: 'piau', sci: 'Megaleporinus obtusidens',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 25 cm na regra dos piaus (confira no Imasul)',
    porte: 'Até cerca de 70 cm e 5 kg. Comuns de 1 a 3 kg.',
    resumo: 'Piau grande e desconfiado, muito pescado na bacia do Paraná em MS. Briga forte em linha fina.',
    habitat: 'Rios grandes e represas: corredeiras, remansos com fundo de areia ou pedra.',
    come: 'Sementes, grãos, frutas, algas e pequenos invertebrados.',
    h: H(1, 3, 2, 3, 1), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: 1, cheio: 1, baixando: 2, seco: 1 }, a: { clara: 1, verde: 2, barrenta: -1 },
    perfilNat: 'medio-escama', perfilArt: null,
    iscas: [
      { nome: 'Milho verde', tipo: 'natural', ic: 'milho', col: 'fundo', p: 3, como: 'Três ou quatro grãos, com ceva de milho no ponto.' },
      { nome: 'Massa com ceva', tipo: 'natural', ic: 'massa', col: 'fundo', p: 2.6, como: 'Massa firme que aguente a correnteza.' },
      { nome: 'Minhoca', tipo: 'natural', ic: 'minhoca', col: 'fundo', p: 1.8, como: 'Inteira, bem presa.' }
    ],
    onde: { subindo: 'Remansos laterais.', cheio: 'Beiras de canal e bocas de baía.', baixando: 'Corredeiras e remansos de fundo de areia.', seco: 'Poços de corredeira cevados.' },
    dicas: ['Ceve o ponto por um ou dois dias antes, se puder.', 'Linha fina e fisgada no primeiro peso firme; freio leve, que ele dá arrancadas.'],
    d: { L: 260, ht: 34, hb: 28, hp: 10, tm: 0.38, head: 'pointed', sy: 3, back: '#7d8b78', belly: '#f0efe6', fin: '#d8b04a',
      tail: 'forked', tl: 56, th: 34, barbels: null, eye: { x: 26, y: 7, r: 5 }, mouth: 'small',
      dorsal: { x: 0.36, w: 0.13, h: 30 }, adipose: { x: 0.76, w: 0.06, h: 7 }, anal: { x: 0.74, w: 0.08, h: 14 }, pelvic: { x: 0.52, h: 14 }, pectoral: true,
      pattern: [], scales: true, lateral: true }
  },
  {
    id: 'piraputanga', nome: 'Piraputanga', outros: '', sci: 'Brycon hilarii',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 30 cm (cota de nativa)',
    porte: 'Até 50 cm e cerca de 2,5 kg.',
    resumo: 'Peixe ágil de rio de água clara (Bonito, Miranda, Aquidauana). Muito arisco.',
    habitat: 'Corredeiras, remansos sob frutíferas e beiras de vegetação.',
    come: 'Frutas (figo, ingá, goiaba), sementes, insetos e peixinhos.',
    h: H(0, 3, 2, 3, 0), t: { frio: 1, ameno: 3, quente: 2 },
    c: { sol: 0, nublado: 1, chuva: -1, pre: 1, pos: -1 }, n: { subindo: -1, cheio: 0, baixando: 1, seco: 2 }, a: { clara: 2, verde: 0, barrenta: -2 },
    perfilNat: 'leve-escama', perfilArt: 'art-ultra',
    iscas: [
      { nome: 'Frutinha (figo, ingá)', tipo: 'natural', ic: 'fruta', col: 'sup', p: 3, como: 'Na boia rasa ou solta, descendo com a correnteza sob a árvore.' },
      { nome: 'Spinner pequeno', tipo: 'artificial', art: 'spinner', col: 'meia', p: 2.4, agua: ['clara'], como: 'Recolhimento contínuo, cruzando a correnteza.' },
      { nome: 'Milho cozido', tipo: 'natural', ic: 'milho', col: 'meia', p: 2, como: 'Um ou dois grãos, linha fina.' },
      { nome: 'Meia-água de 5–7 cm', tipo: 'artificial', art: 'meia', col: 'meia', p: 1.8, agua: ['clara', 'verde'], como: 'Toques curtos e pausas nos remansos.' },
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 1.4, como: 'Pelos lábios, sem chumbo.' }
    ],
    onde: { subindo: 'Água turvando: procure remansos laterais mais limpos.', cheio: 'Remansos sob frutíferas.', baixando: 'Corredeiras e remansos de água clara.', seco: 'Corredeiras rasas e poços claros.' },
    dicas: [
      'Aproxime-se em silêncio e use linha fina.',
      'Ao ser fisgada, libera na água uma substância de alarme que afasta o cardume. Depois da primeira, mude de ponto.'
    ],
    d: { L: 255, ht: 34, hb: 30, hp: 9, tm: 0.4, head: 'pointed', sy: 2, back: '#7f8c86', belly: '#eef0ec', fin: '#c9643a',
      tail: 'forked', tl: 58, th: 36, tailColor: '#d6602f', tailBand: '#1c1c1c', barbels: null, eye: { x: 24, y: 6, r: 5.5 }, mouth: 'small',
      dorsal: { x: 0.42, w: 0.11, h: 26 }, adipose: { x: 0.78, w: 0.06, h: 6 }, anal: { x: 0.66, w: 0.2, h: 13 }, pelvic: { x: 0.52, h: 12 }, pectoral: true,
      pattern: [{ t: 'pedband', c: '#1c1c1c' }], scales: true, lateral: true }
  },
  {
    id: 'dourado', nome: 'Dourado', outros: 'rei do rio', sci: 'Salminus brasiliensis',
    grupo: 'escama', origem: 'nativa', regra: 'Captura proibida em MS até 31/03/2027 (Lei 6.390/2025). Só pesque e solte',
    porte: 'Até 1 m e 20 kg. Comuns de 2 a 8 kg.',
    resumo: 'Predador de correnteza que salta muito depois de fisgado.',
    habitat: 'Corredeiras, saídas de corixo, pontas de pedra, encontros de água e remansos atrás de estruturas.',
    come: 'Sairu, curimbatá, lambari, tuvira.',
    h: H(1, 3, 2, 3, 0), t: { frio: 1, ameno: 3, quente: 2 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: -1, cheio: -1, baixando: 2, seco: 1 }, a: { clara: 1, verde: 1, barrenta: -1 },
    perfilNat: 'isca-viva-aco', perfilArt: 'art-dourado',
    iscas: [
      { nome: 'Meia-água de 8–12 cm', tipo: 'artificial', art: 'meia', col: 'meia', p: 3, como: 'Arremesse rio acima e recolha a favor da correnteza, com toques.' },
      { nome: 'Colher', tipo: 'artificial', art: 'colher', col: 'meia', p: 2.2, como: 'Recolhimento contínuo cruzando a corredeira, ou corrico rio abaixo.' },
      { nome: 'Hélice', tipo: 'artificial', art: 'helice', col: 'sup', p: 2, hor: ['amanhecer', 'entardecer'], frio: false, como: 'Na corredeira, nas horas de pouca luz.' },
      { nome: 'Jig', tipo: 'artificial', art: 'jig', col: 'fundo', p: 1.5, como: 'Deixe afundar no poço abaixo da corredeira e dê toques.' },
      { nome: 'Tuvira ou lambari vivo', tipo: 'natural', ic: 'tuvira', col: 'meia', p: 2, como: 'Com empate de aço, à deriva na correnteza.' }
    ],
    onde: {
      subindo: 'Água suja espalha o dourado. Procure encontros onde entra água mais limpa.',
      cheio: 'Saídas de baía com correnteza e água limpa.',
      baixando: 'Melhor fase. Saídas de corixo e de baía, onde ele espera o sairu que deixa o campo.',
      seco: 'Corredeiras, pontas de pedra e poços logo abaixo.'
    },
    dicas: [
      'Fisgue forte e mais de uma vez: a boca é dura.',
      'Mantenha a linha esticada nos saltos e abaixe a ponta da vara quando ele pular.',
      'Troque garatéias finas por reforçadas e use empate de aço.'
    ],
    d: { L: 265, ht: 40, hb: 34, hp: 12, tm: 0.38, head: 'pointed', sy: 2, back: '#a8781f', belly: '#f3dc8b', fin: '#e07a2a',
      tail: 'forked', tl: 62, th: 40, tailColor: '#e0662a', tailBand: '#1d1a14', barbels: null, eye: { x: 28, y: 6, r: 5.5 }, mouth: 'big',
      dorsal: { x: 0.42, w: 0.12, h: 28 }, adipose: { x: 0.79, w: 0.06, h: 7 }, anal: { x: 0.68, w: 0.18, h: 14 }, pelvic: { x: 0.52, h: 13 }, pectoral: true,
      pattern: [{ t: 'dashrows', c: '#3d2c0d' }], scales: true, lateral: false }
  },
  {
    id: 'traira', nome: 'Traíra', outros: '', sci: 'Hoplias malabaricus',
    grupo: 'escama', origem: 'nativa', regra: 'Cota de nativa',
    porte: 'Até 60 cm e cerca de 3 kg.',
    resumo: 'Predador de emboscada de água rasa e parada. Ataca a superfície com violência.',
    habitat: 'Baías rasas, corixos, beira de aguapé, capim e baceiro, lagoas e represas.',
    come: 'Peixes, rãs e insetos.',
    h: H(2, 3, 1, 3, 3), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: -1, nublado: 1, chuva: 1, pre: 1, pos: -1 }, n: { subindo: 1, cheio: 1, baixando: 1, seco: 0 }, a: { clara: 0, verde: 1, barrenta: 0 },
    perfilNat: 'piranha', perfilArt: 'art-leve',
    iscas: [
      { nome: 'Sapo / frog anti-enrosco', tipo: 'artificial', art: 'sapo', col: 'sup', p: 3, frio: false, como: 'Arraste por cima do aguapé e pare nas clareiras. Espere meio segundo antes de fisgar.' },
      { nome: 'Zara pequena', tipo: 'artificial', art: 'zara', col: 'sup', p: 2.5, hor: ['amanhecer', 'entardecer', 'noite'], frio: false, como: 'Zigue-zague lento com pausas na beira da vegetação.' },
      { nome: 'Hélice', tipo: 'artificial', art: 'helice', col: 'sup', p: 2, frio: false, agua: ['verde', 'barrenta'], como: 'Recolhimento lento e barulhento.' },
      { nome: 'Shad com anzol offset', tipo: 'artificial', art: 'shad', col: 'meia', p: 1.8, como: 'Recolhimento lento perto do fundo; rende no frio.' },
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 2, como: 'Anzol de haste longa, sem chumbo, perto da vegetação.' },
      { nome: 'Coração de frango', tipo: 'natural', ic: 'coracao', col: 'fundo', p: 1.4, como: 'Inteiro, no fundo raso.' }
    ],
    onde: { subindo: 'Capim recém-alagado nas beiras.', cheio: 'Baceiro e aguapé das baías.', baixando: 'Corixos e baías rasas que estão secando.', seco: 'Lagoas e poças com vegetação.' },
    dicas: ['Dentes muito afiados: use alicate para tirar o anzol.', 'No verão ela ataca muito na superfície. Preto, vermelho e amarelo são as cores mais citadas.'],
    d: { L: 255, ht: 30, hb: 28, hp: 15, tm: 0.42, head: 'pointed', sy: 4, back: '#4f4a32', belly: '#c9bf98', fin: '#5a5338',
      tail: 'rounded', tl: 48, th: 32, barbels: null, eye: { x: 28, y: 8, r: 5 }, mouth: 'teeth',
      dorsal: { x: 0.36, w: 0.15, h: 26 }, adipose: null, anal: { x: 0.74, w: 0.1, h: 16 }, pelvic: { x: 0.5, h: 16 }, pectoral: true,
      pattern: [{ t: 'bars', n: 7, c: '#2b2818', w: 10, wobble: 4, soft: true }, { t: 'blotch', n: 10, c: '#2b2818', area: 0.7 }], scales: true, lateral: true }
  },
  {
    id: 'piranha', nome: 'Piranha', outros: 'piranha-vermelha, pirambeba', sci: 'Pygocentrus nattereri',
    grupo: 'escama', origem: 'nativa', regra: 'Até 5 exemplares, além da cota de nativa',
    porte: 'Até cerca de 30 cm e 1,5 kg.',
    resumo: 'Abundante no Pantanal. Cuidado ao desanzolar.',
    habitat: 'Remansos, baías e beira de barranco.',
    come: 'Pedaços de peixe, nadadeiras e animais feridos.',
    h: H(1, 2, 3, 2, 1), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: 1, nublado: 0, chuva: 0, pre: 1, pos: -1 }, n: { subindo: 0, cheio: 0, baixando: 1, seco: 2 }, a: { clara: 0, verde: 1, barrenta: 0 },
    perfilNat: 'piranha', perfilArt: 'art-leve',
    iscas: [
      { nome: 'Pedaço de peixe', tipo: 'natural', ic: 'posta', col: 'meia', p: 3, como: 'Filé com pele, bem preso no anzol de haste longa.' },
      { nome: 'Coração de boi', tipo: 'natural', ic: 'coracao', col: 'meia', p: 2.5, como: 'Tiras firmes.' },
      { nome: 'Meia-água pequena', tipo: 'artificial', art: 'meia', col: 'meia', p: 1, como: 'Recolhimento médio; ela destrói isca macia.' }
    ],
    onde: { subindo: 'Beiras de remanso.', cheio: 'Baías.', baixando: 'Remansos e beira de barranco.', seco: 'Poços e baías isoladas, onde se concentra.' },
    dicas: ['Use alicate e segure por trás da cabeça.', 'Empate de aço curto: ela corta mono e multi.'],
    d: { L: 210, ht: 56, hb: 56, hp: 12, tm: 0.42, head: 'blunt', sy: 12, back: '#7d8790', belly: '#c8452f', fin: '#57616a',
      tail: 'truncate', tl: 40, th: 38, tailBand: '#1d2125', barbels: null, eye: { x: 30, y: 14, r: 6 }, mouth: 'jaw',
      dorsal: { x: 0.48, w: 0.15, h: 26 }, adipose: { x: 0.8, w: 0.06, h: 7 }, anal: { x: 0.66, w: 0.22, h: 18 }, pelvic: { x: 0.5, h: 12 }, pectoral: true,
      pattern: [{ t: 'belly', c: '#d14a2f' }, { t: 'speckle', c: '#d7dde0', n: 60 }], scales: true, lateral: true }
  },
  {
    id: 'curimbata', nome: 'Curimbatá', outros: 'curimba, papa-terra', sci: 'Prochilodus lineatus',
    grupo: 'escama', origem: 'nativa', regra: 'Mínimo 38 cm (cota de nativa)',
    porte: 'Até 40 cm e cerca de 5 kg.',
    resumo: 'Come lodo e detritos do fundo. Quase não ataca isca artificial.',
    habitat: 'Águas calmas, em grandes cardumes; barrancos e remansos.',
    come: 'Lodo, algas e pequenos invertebrados do fundo.',
    h: H(1, 3, 2, 3, 1), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 1, pos: -1 }, n: { subindo: 1, cheio: 1, baixando: 1, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 0 },
    perfilNat: 'leve-escama', perfilArt: null,
    iscas: [
      { nome: 'Massa de farinha', tipo: 'natural', ic: 'massa', col: 'fundo', p: 3, como: 'Massa bem mole, com ceva no ponto.' },
      { nome: 'Massa com ração', tipo: 'natural', ic: 'massa', col: 'fundo', p: 2.4, como: 'Ração triturada misturada à massa.' }
    ],
    onde: { subindo: 'Remansos de barranco.', cheio: 'Baías e remansos.', baixando: 'Barrancos e remansos.', seco: 'Remansos com fundo de lodo.' },
    dicas: ['Equipamento leve e ceva constante. Fisgue suave: a boca é delicada.'],
    d: { L: 250, ht: 44, hb: 34, hp: 11, tm: 0.38, head: 'blunt', sy: 8, back: '#6f7a7e', belly: '#eef1f1', fin: '#8b979b',
      tail: 'forked', tl: 58, th: 38, barbels: null, eye: { x: 26, y: 10, r: 5 }, mouth: 'under',
      dorsal: { x: 0.36, w: 0.14, h: 30 }, adipose: { x: 0.78, w: 0.06, h: 7 }, anal: { x: 0.72, w: 0.1, h: 14 }, pelvic: { x: 0.5, h: 14 }, pectoral: true,
      pattern: [], scales: true, lateral: true }
  },
  {
    id: 'cachorra', nome: 'Cachorra', outros: 'peixe-cachorro, dourado-facão', sci: 'Rhaphiodon vulpinus',
    grupo: 'escama', origem: 'nativa', regra: 'Cota de nativa',
    porte: 'Até 80 cm e cerca de 3 kg.',
    resumo: 'Predador alongado de boca virada para cima, com presas. Ataca em correnteza.',
    habitat: 'Correnteza, encontros de água e beira de canal.',
    come: 'Peixes pequenos.',
    h: H(1, 3, 2, 3, 1), t: { frio: 1, ameno: 3, quente: 2 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: 0, cheio: 0, baixando: 2, seco: 1 }, a: { clara: 1, verde: 1, barrenta: -1 },
    perfilNat: 'isca-viva-aco', perfilArt: 'art-dourado',
    iscas: [
      { nome: 'Meia-água fina', tipo: 'artificial', art: 'meia', col: 'meia', p: 3, como: 'Recolhimento rápido cruzando a correnteza.' },
      { nome: 'Colher', tipo: 'artificial', art: 'colher', col: 'meia', p: 2.4, como: 'Contínua, na corredeira.' },
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 2, como: 'Com empate de aço.' }
    ],
    onde: { subindo: 'Encontros de água.', cheio: 'Saídas de baía.', baixando: 'Corredeiras e encontros.', seco: 'Corredeiras e beira de canal.' },
    dicas: ['As presas cortam: empate de aço sempre.', 'Boca óssea: fisgue firme.'],
    d: { L: 290, ht: 26, hb: 30, hp: 9, tm: 0.38, head: 'pointed', sy: -4, back: '#8d979c', belly: '#f0f2f2', fin: '#b2bbbf',
      tail: 'forked', tl: 56, th: 32, barbels: null, eye: { x: 26, y: 4, r: 5.5 }, mouth: 'up',
      dorsal: { x: 0.56, w: 0.08, h: 22 }, adipose: { x: 0.8, w: 0.05, h: 6 }, anal: { x: 0.45, w: 0.4, h: 12 }, pelvic: { x: 0.4, h: 10 }, pectoral: 'big',
      pattern: [], scales: true, lateral: true }
  },
  {
    id: 'tucunare', nome: 'Tucunaré', outros: 'tucunaré-amarelo, açu', sci: 'Cichla spp.',
    grupo: 'escama', origem: 'exotica', regra: 'Espécie exótica em MS: sem cota',
    porte: 'Comuns de 1 a 4 kg; o açu da Amazônia passa de 10 kg.',
    resumo: 'Predador territorial de água quente e parada, que ataca por reação. Em MS vive nas represas e na bacia do Paraná.',
    habitat: 'Pauleira, pedras, pontas de ilha, bocas de lagoa e praias rasas de manhã.',
    come: 'Peixes, camarão e o que cair na água perto da estrutura.',
    h: H(0, 3, 2, 3, 0), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -2 }, n: { subindo: 0, cheio: -1, baixando: 1, seco: 1 }, a: { clara: 1, verde: 1, barrenta: -1 },
    perfilNat: 'isca-viva', perfilArt: 'art-leve',
    iscas: [
      { nome: 'Zara', tipo: 'artificial', art: 'zara', col: 'sup', p: 3, hor: ['amanhecer', 'entardecer'], frio: false, como: 'Toques curtos com a linha frouxa. No ataque errado, pare a isca: ele volta.' },
      { nome: 'Hélice', tipo: 'artificial', art: 'helice', col: 'sup', p: 2.5, hor: ['amanhecer', 'entardecer'], frio: false, como: 'Recolhimento em trancos, fazendo barulho perto da estrutura.' },
      { nome: 'Meia-água', tipo: 'artificial', art: 'meia', col: 'meia', p: 2.5, hor: ['dia'], como: 'Recolhimento com toques e pausas quando o sol sobe.' },
      { nome: 'Jig de penas', tipo: 'artificial', art: 'jig', col: 'fundo', p: 2, como: 'Deixe afundar na pauleira e dê toques curtos. Rende no frio.' },
      { nome: 'Shad de silicone', tipo: 'artificial', art: 'shad', col: 'fundo', p: 1.8, como: 'Recolhimento lento perto do fundo na pós-frente fria.' },
      { nome: 'Popper', tipo: 'artificial', art: 'popper', col: 'sup', p: 1.8, frio: false, como: 'Estalos curtos com pausas, quando ele não sobe para a zara.' },
      { nome: 'Lambari vivo', tipo: 'natural', ic: 'peixe', col: 'meia', p: 1, como: 'Pelo lombo, perto da estrutura.' }
    ],
    onde: { subindo: 'Bocas de lagoa e beiras com pauleira.', cheio: 'Dentro da vegetação alagada: difícil.', baixando: 'Pontas de ilha e saídas de lagoa.', seco: 'Pauleira, pedras e praias rasas.' },
    dicas: [
      'O primeiro metro depois da queda da isca é quando mais ataca.',
      'Técnica da catimba: arremesse a zara no ponto e, quase sem recolher, dê toques de ponta de vara até irritar o peixe. É o trabalho para o qual Johnny Hoffmann e a Marine Sports desenharam a Animal 130.'
    ],
    d: { L: 255, ht: 42, hb: 38, hp: 14, tm: 0.4, head: 'pointed', sy: 4, back: '#7c8b3a', belly: '#f0d35c', fin: '#c98a35',
      tail: 'rounded', tl: 46, th: 38, barbels: null, eye: { x: 28, y: 9, r: 5.5, iris: '#c8341e' }, mouth: 'big',
      dorsal: { x: 0.3, w: 0.42, h: 24, spiny: true }, adipose: null, anal: { x: 0.74, w: 0.1, h: 18 }, pelvic: { x: 0.4, h: 18 }, pectoral: true,
      pattern: [{ t: 'bars', n: 3, c: '#2a2a18', w: 13, from: 0.3, to: 0.72 }, { t: 'ocellus' }, { t: 'belly', c: '#e8a33a' }], scales: true, lateral: true }
  },
  {
    id: 'corvina', nome: 'Corvina', outros: 'pescada-do-piauí', sci: 'Plagioscion squamosissimus',
    grupo: 'escama', origem: 'exotica', regra: 'Espécie exótica em MS: sem cota',
    porte: 'Comuns de 1 a 3 kg.',
    resumo: 'Peixe de cardume de represas e rios grandes (bacia do Paraná). Fica no fundo e caça ao entardecer.',
    habitat: 'Fundo de represas, canais de rio grande e beira de barrancos fundos.',
    come: 'Camarão, peixes pequenos.',
    h: H(2, 2, 1, 3, 2), t: { frio: 1, ameno: 3, quente: 3 },
    c: { sol: 0, nublado: 1, chuva: 0, pre: 2, pos: -1 }, n: { subindo: 0, cheio: 0, baixando: 1, seco: 1 }, a: { clara: 0, verde: 1, barrenta: 0 },
    perfilNat: 'fundo-medio', perfilArt: 'art-leve',
    iscas: [
      { nome: 'Jig', tipo: 'artificial', art: 'jig', col: 'fundo', p: 3, como: 'Vertical no cardume marcado no sonar, toques curtos.' },
      { nome: 'Shad de silicone', tipo: 'artificial', art: 'shad', col: 'fundo', p: 2.6, como: 'Recolhimento lento pulando no fundo.' },
      { nome: 'Camarão ou lambari', tipo: 'natural', ic: 'peixe', col: 'fundo', p: 2.4, como: 'No fundo, chumbada corrida.' },
      { nome: 'Crank de fundo', tipo: 'artificial', art: 'crank', col: 'fundo', p: 1.6, como: 'Bata no fundo nas beiras de canal.' }
    ],
    onde: { subindo: 'Beira de canal.', cheio: 'Canais fundos.', baixando: 'Beiras de canal e encontros.', seco: 'Fundo de represa e poços.' },
    dicas: ['Onde sai uma, há cardume: repita o arremesso no mesmo ponto.'],
    d: { L: 250, ht: 44, hb: 30, hp: 11, tm: 0.38, head: 'pointed', sy: 6, back: '#8e9aa2', belly: '#f1f2f0', fin: '#c2b48a',
      tail: 'pointed', tl: 50, th: 30, barbels: null, eye: { x: 26, y: 10, r: 6 }, mouth: 'big',
      dorsal: { x: 0.3, w: 0.5, h: 24, spiny: true, split: true }, adipose: null, anal: { x: 0.72, w: 0.08, h: 16 }, pelvic: { x: 0.36, h: 16 }, pectoral: true,
      pattern: [], scales: true, lateral: true }
  },
  {
    id: 'tilapia', nome: 'Tilápia', outros: '', sci: 'Oreochromis niloticus',
    grupo: 'escama', origem: 'exotica', regra: 'Espécie exótica em MS: sem cota',
    porte: 'Comuns de 0,5 a 2 kg.',
    resumo: 'Peixe de represa, lagoa e pesqueiro. Ótimo para treinar ceva e boia.',
    habitat: 'Represas, lagoas, remansos e margens rasas.',
    come: 'Algas, plantas, ração e pequenos invertebrados.',
    h: H(0, 2, 3, 2, 0), t: { frio: 0, ameno: 2, quente: 3 },
    c: { sol: 1, nublado: 0, chuva: 0, pre: 1, pos: -2 }, n: { subindo: 0, cheio: 0, baixando: 1, seco: 1 }, a: { clara: 1, verde: 1, barrenta: 0 },
    perfilNat: 'leve-escama', perfilArt: null,
    iscas: [
      { nome: 'Massa (fubá, farinha, ração)', tipo: 'natural', ic: 'massa', col: 'meia', p: 3, como: 'Bolinha pequena cobrindo o anzol, com ceva regular.' },
      { nome: 'Minhoca', tipo: 'natural', ic: 'minhoca', col: 'meia', p: 2.4, como: 'Pedaço pequeno.' },
      { nome: 'Milho', tipo: 'natural', ic: 'milho', col: 'meia', p: 2, como: 'Um grão.' }
    ],
    onde: { subindo: 'Margens rasas.', cheio: 'Margens com vegetação.', baixando: 'Remansos.', seco: 'Margens rasas e ensolaradas.' },
    dicas: ['Ceva pouca e frequente segura o cardume no ponto.', 'Anzol nº 8 a 12 e boia sensível.'],
    d: { L: 220, ht: 50, hb: 44, hp: 14, tm: 0.42, head: 'blunt', sy: 6, back: '#6c7a76', belly: '#e3e6df', fin: '#7d6a6a',
      tail: 'truncate', tl: 42, th: 38, barbels: null, eye: { x: 28, y: 12, r: 6 }, mouth: 'small',
      dorsal: { x: 0.3, w: 0.52, h: 26, spiny: true }, adipose: null, anal: { x: 0.68, w: 0.16, h: 18 }, pelvic: { x: 0.36, h: 18 }, pectoral: true,
      pattern: [{ t: 'bars', n: 7, c: '#4a5651', w: 8, soft: true }, { t: 'tailbars' }], scales: true, lateral: true }
  }
];

/* ---------- Nós ---------- */
/* Nós: passos escritos a partir dos vídeos de referência (tempos em segundos de cada passo no vídeo) */
const NOS = [
  { id: "palomar", nome: "Palomar", uso: "Isca, anzol ou girador", forca: "Muito alta", linhas: "Multi, mono e fluorcarbono",
    passos: ["Dobre uns 15 cm de linha e passe a dobra pelo olho do anzol.", "Com a linha dupla, dê um nó simples frouxo. O anzol fica pendurado no meio do nó.", "Passe a alça por cima do anzol inteiro.", "Molhe e puxe juntas a linha principal e a sobra até o nó assentar no olho.", "Corte a sobra rente."],
    video: { yt: "9qyFlP3NwLE", fonte: "Animated Knots", tempos: [[10.5, 14.8], [14.8, 19.2], [19.2, 21.6], [21.6, 30.2], [30.2, 33.2]] } },
  { id: "clinch", nome: "Clinch melhorado", uso: "Isca e anzol com mono", forca: "Alta", linhas: "Mono e fluorcarbono",
    passos: ["Passe a ponta pelo olho do anzol, deixando uns 15 cm de sobra.", "Enrole a ponta 5 a 7 voltas em volta da linha principal (menos voltas em linha grossa).", "Passe a ponta pela primeira alça, a que ficou junto ao olho.", "Agora passe a ponta pela alça grande que acabou de se formar. É isso que faz o clinch ser \"melhorado\".", "Molhe, puxe a linha principal para as voltas descerem até o olho e corte a sobra."],
    video: { yt: "laNu2Fz_YTc", fonte: "Animated Knots", tempos: [[9.5, 12.6], [12.6, 16.6], [16.6, 20.2], [20.2, 22.6], [22.6, 27.6]] } },
  { id: "uni", nome: "Uni (Grinner)", uso: "Isca, anzol e união de linhas (uni-uni)", forca: "Alta", linhas: "Todas",
    passos: ["Passe a ponta pelo olho e traga-a de volta, deitada ao lado da linha principal.", "Volte a ponta por cima das duas linhas, formando uma alça.", "Enrole a ponta 5 a 6 vezes por dentro da alça, abraçando as duas linhas.", "Molhe e puxe a ponta para fechar as voltas.", "Puxe a linha principal para deslizar o nó até o olho e corte a sobra."],
    video: { yt: "T88i1HxPhaw", fonte: "Animated Knots", tempos: [[9.5, 13.6], [13.6, 16.0], [16.0, 22.2], [22.2, 24.6], [24.6, 30.2]] } },
  { id: "fg", nome: "FG", uso: "União do multifilamento com o líder", forca: "A mais alta entre as uniões", linhas: "Multi + fluor ou mono",
    passos: ["Com o multi bem esticado (preso na carretilha ou no dente), cruze o líder por cima dele.", "Enrole o multi no líder alternando por baixo e por cima, bem justo: 15 a 20 cruzamentos.", "Trave com meio-nós do multi em volta do líder e aperte forte, molhado.", "Corte a ponta do líder rente.", "Finalize com meio-nós só no multi e corte a sobra."],
    video: { yt: "XJ78PH0gonQ", fonte: "Sunline", tempos: [[2.0, 4.6], [4.6, 20.6], [20.6, 30.0], [30.0, 33.2], [33.2, 37.4]] } },
  { id: "albright", nome: "Albright", uso: "União de linhas de diâmetros diferentes", forca: "Alta", linhas: "Multi + líder, mono + mono",
    passos: ["Dobre a ponta do líder (a linha mais grossa) formando uma alça e passe o multi por dentro dela.", "Enrole o multi 10 a 12 vezes sobre ele mesmo e as duas pernas da alça, seguindo em direção à curva.", "Saia com o multi pela mesma alça, do mesmo lado por onde entrou.", "Molhe, aperte puxando as quatro pontas e corte as sobras."],
    video: { yt: "vyoayxB6D7M", fonte: "Animated Knots", tempos: [[9.2, 12.8], [12.8, 23.6], [23.6, 26.0], [26.0, 32.6]] } },
  { id: "loop", nome: "Laço (Rapala)", uso: "Iscas de superfície e meia-água", forca: "Alta", linhas: "Mono e fluorcarbono",
    passos: ["Faça um nó simples frouxo a uns 15 cm da ponta.", "Passe a ponta pelo olho da isca e volte por dentro do nó simples.", "Enrole a ponta 3 vezes na linha principal.", "Volte a ponta por dentro do nó simples, entrando pelo lado de trás.", "Passe a ponta pela alça que acabou de se formar.", "Molhe e aperte puxando a linha, a ponta e a isca. Corte a sobra: fica um laço que deixa a isca nadar solta."],
    video: { yt: "DEgCIZ6y8So", fonte: "Animated Knots", tempos: [[9.6, 12.8], [12.8, 17.0], [17.0, 22.4], [22.4, 25.4], [25.4, 27.4], [27.4, 33.0]] } }
];

/* ---------- Montagens (para a aba Montagens) ---------- */
const MONTAGENS = [
  { id: 'fundo-corrida', nome: 'Fundo com chumbada corrida', perfil: 'fundo-bagre', isca: { tipo: 'natural', ic: 'tuvira', nome: 'Tuvira viva' },
    quando: 'Isca natural no fundo. O peixe puxa a linha pela chumbada sem sentir o peso.', especies: ['pintado', 'cachara', 'barbado', 'jurupoca', 'piavucu', 'armado', 'pati', 'mandi'],
    ajuste: 'Correnteza forte: suba a chumbada ou troque por chata. Remanso: use o mínimo que toque o fundo.' },
  { id: 'fundo-pesado', nome: 'Fundo pesado', perfil: 'fundo-jau', isca: { tipo: 'natural', ic: 'posta', nome: 'Posta de peixe' },
    quando: 'Poços fundos e correnteza forte, peixe acima de 30 kg.', especies: ['jau'],
    ajuste: 'Chumbada chata não rola. Cabo de aço protege da pedra.' },
  { id: 'art-lider', nome: 'Isca artificial com líder', perfil: 'art-leve', isca: { tipo: 'artificial', art: 'zara', nome: 'Zara' },
    quando: 'Artificial em estrutura e água clara. O líder protege da abrasão e some na água.', especies: ['tucunare', 'traira', 'corvina'],
    ajuste: 'Iscas de superfície: nó de laço para nadar solto. Silicone: anzol offset para não enroscar.' },
  { id: 'art-aco', nome: 'Isca artificial com empate de aço', perfil: 'art-dourado', isca: { tipo: 'artificial', art: 'meia', nome: 'Meia-água' },
    quando: 'Peixe de dente que corta linha: dourado, cachorra, e piranha por perto.', especies: ['dourado', 'cachorra'],
    ajuste: 'Empate curto (20–30 cm) não atrapalha o nado. Troque garatéias por reforçadas.' },
  { id: 'fruta', nome: 'Fruta e caranguejo para pacu', perfil: 'pacu', isca: { tipo: 'natural', ic: 'fruta', nome: 'Fruta nativa' },
    quando: 'Pacu sob frutíferas (fruta batida, sem chumbo) ou caranguejo no fundo da galhada (com chumbo).', especies: ['pacu', 'pacupeva'],
    ajuste: 'Fruta batida: tire a chumbada e bata a isca na água. Caranguejo: oliva leve no fundo.' },
  { id: 'boia', nome: 'Boia e linha fina', perfil: 'leve-escama', isca: { tipo: 'natural', ic: 'massa', nome: 'Massa' },
    quando: 'Peixe de escama que belisca a isca: piraputanga, piau, tilápia, curimbatá.', especies: ['piraputanga', 'tilapia', 'curimbata', 'pacupeva', 'trespintas', 'piapara'],
    ajuste: 'Regule a profundidade da boia para a isca ficar a um palmo do fundo.' },
  { id: 'piranha', nome: 'Empate curto e anzol de haste longa', perfil: 'piranha', isca: { tipo: 'natural', ic: 'posta', nome: 'Pedaço de peixe' },
    quando: 'Piranha e traíra na isca natural.', especies: ['piranha', 'traira'],
    ajuste: 'Haste longa facilita tirar o anzol com alicate, longe dos dentes.' },
  { id: 'viva-aco', nome: 'Isca viva com empate', perfil: 'isca-viva-aco', isca: { tipo: 'natural', ic: 'peixe', nome: 'Lambari vivo' },
    quando: 'Peixe vivo à deriva para dourado e cachorra.', especies: ['dourado', 'cachorra'],
    ajuste: 'Sem chumbo em água rasa; oliva leve na correnteza.' }
];

const FOTOS_URL = (sci) => 'https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=' + encodeURIComponent(sci.replace(' spp.', ''));
const INAT_URL = (sci) => 'https://www.inaturalist.org/taxa/search?q=' + encodeURIComponent(sci.replace(' spp.', ''));
const ML_URL = (q) => 'https://lista.mercadolivre.com.br/' + encodeURIComponent(q.toLowerCase().replace(/[\/]/g, '-').replace(/\s+/g, '-')).replace(/%2C/g, ',');
const AMZ_URL = (q) => 'https://www.amazon.com.br/s?k=' + encodeURIComponent(q).replace(/%20/g, '+');
const YT_URL = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q).replace(/%20/g, '+');
