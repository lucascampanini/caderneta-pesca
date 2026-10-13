/* ===== Mochila: categorias, campos, marcas e catálogo de equipamentos =====
   Campos usados pelo motor de recomendação (não renomear): vara.tipo/comp/lbMin/lbMax/acao,
   carretilha.perfil/tam, molinete.tam, linha.tipo/res/unid, empate.lb, anzol.modelo/min/max,
   chumbada.tipo/gMin/gMax, isca.art/cor/cm.
   Cada campo: [chave, rótulo, tipo ('text' | 'num' | 'sel' | 'marca'), extra (placeholder ou opções)]. */

const MARCAS = {
  vara: ['Shimano', 'Daiwa', 'Abu Garcia', 'Okuma', 'Penn', 'Ugly Stik', 'St. Croix', 'Lumis', 'Marine Sports', 'Saint Plus', 'Albatroz Fishing', 'Maruri', 'Pesca Brasil', 'Sumax', 'Rapala', 'Kunnan', 'Pinnacle'],
  carretilha: ['Shimano', 'Daiwa', 'Abu Garcia', 'Okuma', 'Penn', 'KastKing', 'Marine Sports', 'Saint Plus', 'Albatroz Fishing', 'Maruri', 'Pinnacle'],
  molinete: ['Shimano', 'Daiwa', 'Abu Garcia', 'Okuma', 'Penn', 'KastKing', 'Marine Sports', 'Saint Plus', 'Albatroz Fishing', 'Maruri', 'Pinnacle'],
  linha: ['Sufix', 'PowerPro', 'Daiwa', 'Shimano', 'Seaguar', 'Sunline', 'YGK', 'Varivas', 'Berkley', 'KastKing', 'Maruri', 'Marine Sports', 'Fastline', 'Platil'],
  empate: ['Marine Sports', 'Albatroz Fishing', 'Maruri', 'Pesca Brasil', 'American Fishing Wire', 'Artesanal'],
  anzol: ['Mustad', 'Owner', 'Gamakatsu', 'VMC', 'Daiichi', 'Marine Sports', 'Maruri', 'Pinnacle'],
  garateia: ['Owner', 'Gamakatsu', 'VMC', 'Mustad', 'Marine Sports', 'Maruri'],
  chumbada: ['Artesanal', 'Marine Sports', 'Albatroz Fishing', 'Maruri'],
  girador: ['Owner', 'VMC', 'Mustad', 'Sampo', 'Marine Sports', 'Albatroz Fishing', 'Maruri', 'Pinnacle'],
  micanga: ['Marine Sports', 'Albatroz Fishing', 'Maruri', 'Artesanal'],
  boia: ['Marine Sports', 'Albatroz Fishing', 'Maruri', 'Artesanal'],
  isca: ['Rapala', 'Heddon', 'Yo-Zuri', 'Lucky Craft', 'Megabass', 'Strike King', 'Zoom', 'Berkley', 'Monster 3X', 'Marine Sports', 'Deconto', 'Yara', 'Borboleta', 'Nelson Nakamura', 'OCL Lures', 'Hunter Bait', 'Artesanal'],
  acessorio: ['Marine Sports', 'Albatroz Fishing', 'Maruri', 'Rapala', 'Berkley', 'Boga Grip', 'Plano', 'Outra'],
  eletronico: ['Garmin', 'Lowrance', 'Humminbird', 'Deeper', 'Minn Kota', 'MotorGuide', 'Outra'],
  outro: []
};

const OPC = {
  acao: { 'extra-rapida': 'Extra rápida', rapida: 'Rápida', moderada: 'Moderada', lenta: 'Lenta' },
  material: { carbono: 'Carbono', fibra: 'Fibra de vidro', mista: 'Mista', bambu: 'Bambu' },
  partes: { '1': 'Inteiriça', '2': '2 partes', tele: 'Telescópica', mais: '3 ou mais partes' },
  mao: { direita: 'Manivela direita', esquerda: 'Manivela esquerda' },
  reforco: { normal: 'Normal', '2x': '2X', '3x': '3X', '4x': '4X ou mais' },
  fios: { '': '—', '4x': '4 fios', '8x': '8 fios', '9x': '9 fios ou mais' }
};

const CATS = [
  { id: 'vara', nome: 'Varas', um: 'Vara', f: [['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: Solara'], ['tipo', 'Para', 'sel', { carretilha: 'Carretilha', molinete: 'Molinete', canico: 'Caniço / bambu (sem molinete)' }], ['comp', 'Comprimento (m)', 'num', '1,80'], ['lbMin', 'Libragem mín. (lb)', 'num', '12'], ['lbMax', 'Libragem máx. (lb)', 'num', '25'], ['acao', 'Ação', 'sel', OPC.acao], ['partes', 'Partes', 'sel', OPC.partes], ['material', 'Material', 'sel', OPC.material]], obrig: ['lbMin'] },
  { id: 'carretilha', nome: 'Carretilhas', um: 'Carretilha', f: [['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: Black Max'], ['perfil', 'Tipo', 'sel', { perfil: 'Perfil baixo', redonda: 'Redonda' }], ['tam', 'Tamanho', 'num', '150'], ['mao', 'Manivela', 'sel', OPC.mao], ['drag', 'Drag máx. (kg)', 'num', '6'], ['rol', 'Rolamentos', 'num', '7'], ['recolh', 'Recolhimento', 'text', '7.1:1']], obrig: ['tam'] },
  { id: 'molinete', nome: 'Molinetes', um: 'Molinete', f: [['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: FX'], ['tam', 'Tamanho', 'num', '3000'], ['drag', 'Drag máx. (kg)', 'num', '8'], ['rol', 'Rolamentos', 'num', '5']], obrig: ['tam'] },
  { id: 'linha', nome: 'Linhas e líderes', um: 'Linha', f: [['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: 832'], ['tipo', 'Tipo', 'sel', { multi: 'Multifilamento', mono: 'Monofilamento', fluor: 'Fluorcarbono' }], ['res', 'Resistência', 'num', '30'], ['unid', 'Unidade', 'sel', { lb: 'lb', mm: 'mm (diâmetro)' }], ['fios', 'Fios (multi)', 'sel', OPC.fios], ['metros', 'Metros no carretel', 'num', '150']], obrig: ['res'] },
  { id: 'empate', nome: 'Empates de aço', um: 'Empate', f: [['marca', 'Marca', 'marca'], ['produto', 'Descrição', 'text', 'Ex.: Cabo flexível com snap'], ['material', 'Material', 'sel', { aco: 'Aço', flex: 'Cabo flexível', titanio: 'Titânio', kevlar: 'Kevlar' }], ['lb', 'Resistência (lb)', 'num', '40'], ['compCm', 'Comprimento (cm)', 'num', '25']], obrig: [] },
  { id: 'anzol', nome: 'Anzóis', um: 'Anzol', f: [['marca', 'Marca', 'marca'], ['produto', 'Linha / descrição', 'text', 'Ex.: Circle Hook'], ['modelo', 'Modelo', 'sel', { circular: 'Circular', maruseigo: 'Maruseigo / chinu', offset: 'Offset / wide gap (silicone)', haste: 'Haste longa', jcomum: 'Comum (J)', jig: 'Jig head' }], ['min', 'Menor tamanho', 'text', '2/0'], ['max', 'Maior tamanho', 'text', '6/0'], ['reforco', 'Reforço', 'sel', OPC.reforco]], obrig: ['min'] },
  { id: 'garateia', nome: 'Garatéias', um: 'Garatéia', f: [['marca', 'Marca', 'marca'], ['produto', 'Linha / descrição', 'text', 'Ex.: ST-36'], ['tam', 'Tamanho (nº)', 'text', '2'], ['reforco', 'Reforço', 'sel', OPC.reforco]], obrig: [] },
  { id: 'chumbada', nome: 'Chumbadas', um: 'Chumbada', f: [['marca', 'Marca', 'marca'], ['tipo', 'Tipo', 'sel', { oliva: 'Oliva', pera: 'Pera / gota', chata: 'Chata', chumbinho: 'Chumbinho' }], ['gMin', 'Peso mín. (g)', 'num', '10'], ['gMax', 'Peso máx. (g)', 'num', '40']], obrig: ['gMin'] },
  { id: 'girador', nome: 'Giradores e snaps', um: 'Girador', f: [['marca', 'Marca', 'marca'], ['tipo', 'Tipo', 'sel', { comum: 'Girador comum', rolamento: 'Girador com rolamento', snap: 'Snap', girosnap: 'Girador com snap', argola: 'Argola (split ring)' }], ['tam', 'Tamanho (nº)', 'text', '6']], obrig: [] },
  { id: 'micanga', nome: 'Miçangas', um: 'Miçanga', f: [['marca', 'Marca', 'marca'], ['tipo', 'Tipo', 'sel', { comum: 'Miçanga', fluor: 'Fluorescente / luminosa', stopper: 'Stopper de borracha' }], ['tam', 'Tamanho (mm)', 'num', '6']], obrig: [] },
  { id: 'boia', nome: 'Boias', um: 'Boia', f: [['marca', 'Marca', 'marca'], ['tipo', 'Tipo', 'sel', { bola: 'Bola', palito: 'Palito / torpedo', cevadeira: 'Cevadeira', sinal: 'Sinalizadora', luz: 'Luminosa' }], ['g', 'Peso suportado (g)', 'num', '5']], obrig: [] },
  { id: 'isca', nome: 'Iscas artificiais', um: 'Isca', f: [['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: Skitter Walk'], ['art', 'Tipo', 'sel', ART_TIPOS], ['cor', 'Cor', 'sel', Object.fromEntries(Object.entries(CORES_ISCA).map(([k, v]) => [k, v.nome]))], ['cm', 'Tamanho (cm)', 'num', '9'], ['g', 'Peso (g)', 'num', '12']], obrig: [] },
  { id: 'acessorio', nome: 'Acessórios', um: 'Acessório', f: [['tipo', 'O que é', 'sel', { boga: 'Alicate de contenção (boga grip)', alicate: 'Alicate de bico / multiuso', balanca: 'Balança', passagua: 'Passaguá / puçá', caixa: 'Caixa organizadora', bolsa: 'Bolsa / mochila de pesca', faca: 'Faca', tesoura: 'Tesoura de linha', lanterna: 'Lanterna de cabeça', colete: 'Colete salva-vidas', oculos: 'Óculos polarizado', luva: 'Luva', portavara: 'Porta-vara', viveiro: 'Viveiro / samburá', cevador: 'Cevador', capa: 'Capa de chuva', chapeu: 'Chapéu / boné / balaclava UV', repelente: 'Repelente / protetor solar', outro: 'Outro' }], ['marca', 'Marca', 'marca'], ['produto', 'Modelo / descrição', 'text', 'Ex.: Boga Grip 30 lb']], obrig: [] },
  { id: 'eletronico', nome: 'Eletrônicos e barco', um: 'Eletrônico', f: [['tipo', 'O que é', 'sel', { sonar: 'Sonar / GPS', motor: 'Motor elétrico', bateria: 'Bateria', radio: 'Rádio', outro: 'Outro' }], ['marca', 'Marca', 'marca'], ['produto', 'Modelo', 'text', 'Ex.: Striker 4']], obrig: [] },
  { id: 'outro', nome: 'Outros itens', um: 'Item', f: [['produto', 'O que é', 'text', 'Ex.: Cadeira dobrável'], ['marca', 'Marca', 'marca']], obrig: ['produto'] }
];

/* Catálogo inicial: só modelos conhecidos. Cada variante já traz o que dá para afirmar pelo nome do modelo
   (tipo e tamanho); o resto a pessoa confere na etiqueta. */
const CATALOGO_BASE = (() => {
  const out = [];
  const add = (cat, marca, produto, campos, variantes) => {
    if (!variantes) { out.push({ cat, marca, produto, campos }); return; }
    variantes.forEach(v => out.push({ cat, marca, produto: produto + ' ' + v[0], campos: Object.assign({}, campos, v[1]) }));
  };
  const tams = (lista) => lista.map(t => [String(t), { tam: t }]);
  // Molinetes
  add('molinete', 'Shimano', 'FX', {}, tams([1000, 2500, 4000]));
  add('molinete', 'Shimano', 'Sienna', {}, tams([1000, 2500, 4000]));
  add('molinete', 'Shimano', 'Sahara', {}, tams([1000, 2500, 3000, 4000, 5000]));
  add('molinete', 'Shimano', 'Nasci', {}, tams([1000, 2500, 3000, 4000, 5000]));
  add('molinete', 'Shimano', 'Stradic', {}, tams([1000, 2500, 3000, 4000, 5000]));
  add('molinete', 'Shimano', 'Miravel', {}, tams([1000, 2500, 4000]));
  add('molinete', 'Daiwa', 'Crossfire LT', {}, tams([1000, 2000, 2500, 3000, 4000, 5000]));
  add('molinete', 'Daiwa', 'Revros LT', {}, tams([1000, 2000, 2500, 3000, 4000, 5000]));
  add('molinete', 'Daiwa', 'Fuego LT', {}, tams([1000, 2000, 2500, 3000, 4000]));
  add('molinete', 'Daiwa', 'BG', {}, tams([2500, 3000, 4000, 5000, 6500]));
  add('molinete', 'Penn', 'Battle III', {}, tams([2500, 3000, 4000, 5000, 6000]));
  add('molinete', 'Penn', 'Spinfisher VI', {}, tams([2500, 3500, 4500, 5500]));
  add('molinete', 'Abu Garcia', 'Cardinal', {}, tams([10, 20, 30, 40]).map(([r, c]) => [r, { tam: c.tam * 100 }]));
  // Carretilhas
  add('carretilha', 'Shimano', 'SLX', { perfil: 'perfil', tam: 150 }, [['150 (direita)', { mao: 'direita' }], ['151 (esquerda)', { mao: 'esquerda' }]]);
  add('carretilha', 'Shimano', 'Caius', { perfil: 'perfil', tam: 150 }, [['150 (direita)', { mao: 'direita' }], ['151 (esquerda)', { mao: 'esquerda' }]]);
  add('carretilha', 'Shimano', 'Curado', { perfil: 'perfil', tam: 200 }, [['200 (direita)', { mao: 'direita' }], ['201 (esquerda)', { mao: 'esquerda' }]]);
  add('carretilha', 'Shimano', 'Tranx', { perfil: 'perfil' }, [['300', { tam: 300 }], ['400', { tam: 400 }], ['500', { tam: 500 }]]);
  add('carretilha', 'Shimano', 'Calcutta', { perfil: 'redonda' }, [['200', { tam: 200 }], ['300', { tam: 300 }], ['400', { tam: 400 }]]);
  add('carretilha', 'Daiwa', 'Tatula', { perfil: 'perfil' }, [['100', { tam: 100 }], ['150', { tam: 150 }]]);
  add('carretilha', 'Daiwa', 'Fuego CT', { perfil: 'perfil', tam: 100 });
  add('carretilha', 'Daiwa', 'Lexa', { perfil: 'perfil' }, [['100', { tam: 100 }], ['300', { tam: 300 }], ['400', { tam: 400 }]]);
  add('carretilha', 'Daiwa', 'Millionaire', { perfil: 'redonda', tam: 300 });
  add('carretilha', 'Abu Garcia', 'Black Max', { perfil: 'perfil', tam: 150 });
  add('carretilha', 'Abu Garcia', 'Silver Max', { perfil: 'perfil', tam: 150 });
  add('carretilha', 'Abu Garcia', 'Pro Max', { perfil: 'perfil', tam: 150 });
  add('carretilha', 'Abu Garcia', 'Revo SX', { perfil: 'perfil', tam: 150 });
  add('carretilha', 'Abu Garcia', 'Revo Beast', { perfil: 'perfil', tam: 300 });
  add('carretilha', 'Abu Garcia', 'Ambassadeur C3', { perfil: 'redonda' }, [['5500', { tam: 200 }], ['6500', { tam: 300 }]]);
  // Linhas
  add('linha', 'Sufix', '832', { tipo: 'multi', unid: 'lb', fios: '8x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }], ['65 lb', { res: 65 }]]);
  add('linha', 'PowerPro', 'Spectra', { tipo: 'multi', unid: 'lb', fios: '4x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }], ['65 lb', { res: 65 }]]);
  add('linha', 'Daiwa', 'J-Braid X8', { tipo: 'multi', unid: 'lb', fios: '8x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }], ['65 lb', { res: 65 }]]);
  add('linha', 'Shimano', 'Kairiki 8', { tipo: 'multi', unid: 'lb', fios: '8x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }]]);
  add('linha', 'Sunline', 'Siglon PE X8', { tipo: 'multi', unid: 'lb', fios: '8x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }]]);
  add('linha', 'Maruri', 'Max Force 8X', { tipo: 'multi', unid: 'lb', fios: '8x' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }]]);
  add('linha', 'Seaguar', 'InvizX', { tipo: 'fluor', unid: 'lb' }, [['15 lb', { res: 15 }], ['20 lb', { res: 20 }], ['25 lb', { res: 25 }]]);
  add('linha', 'Seaguar', 'Blue Label', { tipo: 'fluor', unid: 'lb' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }]]);
  add('linha', 'Sunline', 'FC Rock', { tipo: 'fluor', unid: 'lb' }, [['16 lb', { res: 16 }], ['20 lb', { res: 20 }], ['25 lb', { res: 25 }]]);
  add('linha', 'Berkley', 'Trilene XL', { tipo: 'mono', unid: 'lb' }, [['10 lb', { res: 10 }], ['14 lb', { res: 14 }], ['20 lb', { res: 20 }]]);
  add('linha', 'Berkley', 'Trilene Big Game', { tipo: 'mono', unid: 'lb' }, [['20 lb', { res: 20 }], ['30 lb', { res: 30 }], ['40 lb', { res: 40 }], ['50 lb', { res: 50 }]]);
  // Varas
  add('vara', 'Ugly Stik', 'GX2', { material: 'mista' }, [['para molinete', { tipo: 'molinete' }], ['para carretilha', { tipo: 'carretilha' }]]);
  add('vara', 'Shimano', 'Solara', { material: 'mista' }, [['para molinete', { tipo: 'molinete' }], ['para carretilha', { tipo: 'carretilha' }]]);
  add('vara', 'Abu Garcia', 'Vengeance', { material: 'carbono' }, [['para molinete', { tipo: 'molinete' }], ['para carretilha', { tipo: 'carretilha' }]]);
  add('vara', 'Abu Garcia', 'Veritas', { material: 'carbono' }, [['para molinete', { tipo: 'molinete' }], ['para carretilha', { tipo: 'carretilha' }]]);
  add('vara', 'Daiwa', 'Crossfire', {}, [['para molinete', { tipo: 'molinete' }], ['para carretilha', { tipo: 'carretilha' }]]);
  // Iscas
  add('isca', 'Rapala', 'Skitter Walk', { art: 'zara' }, [['8 cm', { cm: 8 }], ['11 cm', { cm: 11 }]]);
  add('isca', 'Rapala', 'Skitter Pop', { art: 'popper' }, [['5 cm', { cm: 5 }], ['7 cm', { cm: 7 }], ['9 cm', { cm: 9 }]]);
  add('isca', 'Rapala', 'X-Rap', { art: 'meia' }, [['8 cm', { cm: 8 }], ['10 cm', { cm: 10 }], ['12 cm', { cm: 12 }]]);
  add('isca', 'Rapala', 'CountDown', { art: 'meia' }, [['5 cm', { cm: 5 }], ['7 cm', { cm: 7 }], ['9 cm', { cm: 9 }]]);
  add('isca', 'Rapala', 'Shad Rap', { art: 'crank' }, [['5 cm', { cm: 5 }], ['7 cm', { cm: 7 }], ['9 cm', { cm: 9 }]]);
  add('isca', 'Heddon', 'Zara Spook', { art: 'zara', cm: 11 });
  add('isca', 'Heddon', 'Super Spook', { art: 'zara', cm: 13 });
  add('isca', 'Yo-Zuri', 'Crystal Minnow', { art: 'meia' }, [['7 cm', { cm: 7 }], ['9 cm', { cm: 9 }], ['11 cm', { cm: 11 }]]);
  add('isca', 'Strike King', 'KVD 1.5', { art: 'crank', cm: 6 });
  add('isca', 'Zoom', 'Super Fluke', { art: 'shad', cm: 13 });
  // Acessórios
  add('acessorio', 'Boga Grip', 'Boga Grip', { tipo: 'boga' });
  add('acessorio', 'Rapala', 'Balança digital', { tipo: 'balanca' });
  // Eletrônicos
  add('eletronico', 'Garmin', 'Striker', { tipo: 'sonar' }, [['4', {}], ['Vivid 4cv', {}], ['Vivid 5cv', {}], ['Vivid 7cv', {}]]);
  add('eletronico', 'Deeper', 'Chirp+', { tipo: 'sonar' });
  add('eletronico', 'Minn Kota', 'Endura', { tipo: 'motor' });
  return out.map((x, i) => Object.assign({ id: 'base-' + i, fonte: 'base' }, x));
})();
