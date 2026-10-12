/* ===== Motor: recomendação por condição e cruzamento com o inventário ===== */

const MONO_TAB = [[0.2, 8], [0.25, 11], [0.28, 13], [0.3, 15], [0.35, 20], [0.4, 25], [0.45, 30], [0.5, 36], [0.6, 48], [0.7, 62], [0.8, 78], [0.9, 95], [1.0, 115], [1.2, 150]];
function monoToLb(mm) {
  mm = +mm; if (!mm) return 0;
  if (mm <= MONO_TAB[0][0]) return Math.round(MONO_TAB[0][1] * mm / MONO_TAB[0][0]);
  for (let i = 1; i < MONO_TAB.length; i++) {
    const [a, la] = MONO_TAB[i - 1], [b, lb] = MONO_TAB[i];
    if (mm <= b) return Math.round(la + (lb - la) * (mm - a) / (b - a));
  }
  return Math.round(MONO_TAB[MONO_TAB.length - 1][1] * mm / 1.2);
}
function hookNum(s) {
  if (s === undefined || s === null || s === '') return null;
  s = String(s).trim().toLowerCase().replace('nº', '').replace('n°', '').trim();
  const m = s.match(/^(\d+)\s*\/\s*0$/);
  if (m) return +m[1];
  const n = parseFloat(s);
  return isNaN(n) ? null : 1 - n;
}
function hookTxt(n) { return n >= 1 ? n + '/0' : 'nº ' + (1 - n); }
function lbOf(item) { return item.unid === 'mm' ? monoToLb(item.res) : +item.res || 0; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtN = (v) => String(v).replace('.', ',');

function luzDe(st) {
  return (['madrugada', 'amanhecer', 'entardecer', 'noite'].includes(st.hora) || ['nublado', 'chuva'].includes(st.clima)) ? 'baixa' : 'alta';
}

function coresPara(st, sp) {
  const luz = luzDe(st);
  const t = {
    clara: { alta: ['prata', 'natural', 'osso', 'transp'], baixa: ['branco', 'osso', 'dorsoverde', 'preto'] },
    verde: { alta: ['dourado', 'dorsoverde', 'fogo', 'prata'], baixa: ['fogo', 'limao', 'branco', 'preto'] },
    barrenta: { alta: ['limao', 'laranja', 'fogo', 'preto'], baixa: ['preto', 'roxo', 'limao', 'vermelho'] }
  };
  let lista = t[st.agua][luz].slice();
  if (st.hora === 'noite' || st.hora === 'madrugada') lista = ['preto', 'glow'].concat(lista.filter(c => c !== 'preto')).slice(0, 4);
  if (sp && sp.id === 'traira') lista = ['preto', 'vermelho', 'amarelo'].concat(lista.filter(c => !['preto', 'vermelho', 'amarelo'].includes(c))).slice(0, 4);
  const pq = {
    clara: 'Água clara: o peixe vê detalhes. Imite a presa.',
    verde: 'Água esverdeada: cor natural com contraste.',
    barrenta: 'Água barrenta: silhueta e cor sólida aparecem melhor.'
  }[st.agua] + (luz === 'baixa' ? ' Pouca luz: prefira silhueta escura ou cor clara sólida.' : '');
  return { lista, pq };
}

function pontuaIsca(b, st) {
  let s = b.p * 10;
  if (b.hor) s += b.hor.includes(st.hora) ? 8 : -6;
  if (b.agua) s += b.agua.includes(st.agua) ? 6 : -6;
  if (b.niv) s += b.niv.includes(st.nivel) ? 8 : -5;
  if (st.temp === 'frio' && b.frio === false) s -= 12;
  if (st.clima === 'pos') s += b.col === 'sup' ? -18 : b.col === 'fundo' ? 8 : -4;
  if (st.clima === 'pre' && b.tipo === 'artificial') s += 4;
  if (st.hora === 'dia' && st.clima === 'sol' && b.col === 'sup') s -= 8;
  if ((st.hora === 'noite' || st.hora === 'madrugada') && b.tipo === 'artificial' && !(b.hor || []).includes(st.hora)) s -= 4;
  if (st.agua === 'barrenta' && b.tipo === 'natural') s += 4;
  if (st.agua === 'barrenta' && b.tipo === 'artificial' && b.col !== 'sup') s -= 3;
  if (st.local === 'barranco' && b.tipo === 'artificial') s -= 2;
  return s;
}

function ajustaChumbada(ch, st) {
  if (!ch) return null;
  const [a, b] = ch.g, mid = Math.round((a + b) / 2);
  let g = ch.g, por = '';
  if (st.nivel === 'subindo' || st.nivel === 'cheio') { g = [mid, b]; por = 'mais correnteza'; }
  else if (st.nivel === 'seco') { g = [a, mid]; por = 'pouca correnteza'; }
  return Object.assign({}, ch, { g, txtAjustado: (ch.tipo === 'chumbinho' ? 'Chumbinho' : ch.tipo === 'chata' ? 'Chata' : 'Oliva corrida') + ' ' + g[0] + '–' + g[1] + ' g' + (por ? ' (' + por + ')' : '') });
}

function recomenda(st) {
  const sp = ESPECIES.find(e => e.id === st.esp) || ESPECIES[0];
  // índice de atividade
  let s = sp.h[st.hora] / 3 * 45 + sp.t[st.temp] / 3 * 25 + 10 + sp.c[st.clima] * 6 + sp.n[st.nivel] * 5 + sp.a[st.agua] * 4;
  s = Math.round(clamp(s, 0, 100));
  const rotulo = s >= 72 ? 'Ótima' : s >= 52 ? 'Boa' : s >= 32 ? 'Média' : 'Baixa';

  // fatores que mais pesaram
  const f = [];
  const hv = sp.h[st.hora];
  f.push({ v: hv - 1.5, t: hv >= 3 ? 'Horário de pico para esta espécie' : hv >= 2 ? 'Horário bom' : hv === 1 ? 'Horário fraco para esta espécie' : 'Fora do horário de alimentação' });
  const tv = sp.t[st.temp];
  if (tv <= 1) f.push({ v: -1.2, t: 'Temperatura baixa reduz a atividade' });
  if (sp.c[st.clima] !== 0) f.push({ v: sp.c[st.clima], t: { sol: 'Sol forte', nublado: 'Céu nublado', chuva: 'Chuva fina', pre: 'Frente fria chegando', pos: 'Pós-frente fria' }[st.clima] + (sp.c[st.clima] > 0 ? ' favorece' : ' atrapalha') });
  if (sp.n[st.nivel] !== 0) f.push({ v: sp.n[st.nivel], t: 'Rio ' + NIVEIS.find(n => n.id === st.nivel).nome.toLowerCase() + (sp.n[st.nivel] > 0 ? ': fase boa' : ': fase difícil') });
  if (sp.a[st.agua] !== 0) f.push({ v: sp.a[st.agua], t: 'Água ' + AGUAS.find(a => a.id === st.agua).nome.toLowerCase() + (sp.a[st.agua] > 0 ? ' ajuda' : ' atrapalha') });
  f.sort((x, y) => Math.abs(y.v) - Math.abs(x.v));

  // iscas
  const iscas = sp.iscas.map(b => Object.assign({}, b, { sc: pontuaIsca(b, st) })).sort((x, y) => y.sc - x.sc);
  const top = iscas[0];
  let pk = top.tipo === 'artificial' ? sp.perfilArt : sp.perfilNat;
  if (!pk) pk = sp.perfilNat || sp.perfilArt;
  const perfil = PERFIS[pk];
  const spec = Object.assign({}, perfil[st.variante]);
  spec.chumbada = ajustaChumbada(spec.chumbada, st);

  const temArt = iscas.slice(0, 3).some(b => b.tipo === 'artificial');
  const cores = temArt ? coresPara(st, sp) : null;

  const notas = [];
  if (st.agua === 'clara') notas.push('Água clara: linha mais fina ou líder de fluorcarbono mais longo, e arremessos longos.');
  if (st.agua === 'barrenta') notas.push('Água barrenta: o peixe caça pelo cheiro e pela vibração. Isca natural fresca, ou artificial barulhenta e de cor forte.');
  if (st.clima === 'pos') notas.push('Pós-frente fria: peixe parado. Isca menor, mais lenta e mais perto do fundo.');
  if (st.clima === 'pre') notas.push('Frente fria chegando: o peixe come forte nas horas anteriores. Aproveite ao máximo.');
  if (st.clima === 'sol' && st.hora === 'dia') notas.push('Sol a pino: procure sombra, pauleira e fundo.');
  if (st.temp === 'frio') notas.push('Frio: reduza o tamanho da isca e o ritmo do trabalho.');
  if (st.local === 'barranco') notas.push('Do barranco: vara 0,2 a 0,3 m mais longa ajuda a arremessar longe e tirar o peixe da beira.');
  if (pk === 'fundo-jau' && st.variante === 'molinete') notas.push('Para jaú, a carretilha redonda é bem mais indicada que o molinete.');
  if (top.ic === 'fruta' && sp.id === 'pacu') notas.push('Fruta batida: tire a chumbada e bata a isca na água sob a árvore.');

  return { sp, st, score: s, rotulo, fatores: f.slice(0, 4), top, alts: iscas.slice(1, 3), pk, perfil, spec, cores, onde: sp.onde[st.nivel], notas, rigId: perfil.rig };
}

/* ---------- Cruzamento com o inventário ---------- */
function faixa(have, need, tol) {
  // 1 = cobre; 0.5 = perto; 0 = fora
  const [h0, h1] = have, [n0, n1] = need;
  if (h1 >= n0 && h0 <= n1) return 1;
  const gap = h1 < n0 ? n0 - h1 : h0 - n1;
  return gap <= tol ? 0.5 : 0;
}
const ST = (sc) => sc >= 1 ? 'ok' : sc > 0 ? 'perto' : 'falta';
const lbTxt = (r) => r[0] + '–' + r[1] + ' lb';

function cruza(rec, inv) {
  const spec = rec.spec, v = rec.st.variante, comps = [];
  const varaNome = v === 'carretilha' ? 'vara para carretilha' : 'vara para molinete';

  // Vara
  {
    const need = spec.vara;
    const cand = inv.filter(i => i.cat === 'vara' && i.tipo === need.tipo);
    let best = null, bs = 0, nota = '';
    cand.forEach(i => {
      let sc = faixa([+i.lbMin || 0, +i.lbMax || 0], need.lb, 6);
      if (sc === 1 && i.comp && (i.comp < need.comp[0] - 0.25 || i.comp > need.comp[1] + 0.35)) sc = 0.5;
      if (sc > bs) { bs = sc; best = i; }
    });
    if (!best && inv.some(i => i.cat === 'vara')) nota = 'Suas varas são para ' + (v === 'carretilha' ? 'molinete' : 'carretilha') + '.';
    if (best && bs < 1) nota = 'Libragem ou comprimento fora da faixa ideal; funciona com cuidado no freio.';
    comps.push({ nome: 'Vara', precisa: fmtN(need.comp[0]) + '–' + fmtN(need.comp[1]) + ' m, ' + lbTxt(need.lb) + ', ação ' + need.acao, tem: best, status: ST(bs), sc: bs, nota, buy: varaNome + ' ' + need.lb[0] + '-' + need.lb[1] + 'lb' });
  }
  // Carretilha / molinete
  {
    const need = spec.reel;
    let best = null, bs = 0, nota = '';
    if (v === 'carretilha') {
      inv.filter(i => i.cat === 'carretilha').forEach(i => {
        const t = +i.tam || 0;
        let sc = (t >= need.tam[0] * 0.75 && t <= need.tam[1] * 1.34) ? 1 : (t >= need.tam[0] * 0.5 && t <= need.tam[1] * 2) ? 0.5 : 0;
        if (!need.tipo.includes(i.perfil)) sc = Math.min(sc, 0.5);
        if (sc > bs) { bs = sc; best = i; }
      });
    } else {
      inv.filter(i => i.cat === 'molinete').forEach(i => {
        const t = +i.tam || 0;
        const sc = (t >= need.tam[0] * 0.66 && t <= need.tam[1] * 1.5) ? 1 : (t >= need.tam[0] * 0.4 && t <= need.tam[1] * 2.5) ? 0.5 : 0;
        if (sc > bs) { bs = sc; best = i; }
      });
    }
    if (best && bs < 1) nota = 'Tamanho diferente do ideal: confira a capacidade de linha e o drag.';
    comps.push({ nome: v === 'carretilha' ? 'Carretilha' : 'Molinete', precisa: need.txt, tem: best, status: ST(bs), sc: bs, nota, buy: v === 'carretilha' ? ('carretilha ' + (need.tipo[0] === 'redonda' ? 'redonda ' : 'perfil baixo ') + need.tam[0]) : ('molinete ' + need.tam[0]) });
  }
  // Linha principal
  {
    const need = spec.linha;
    let best = null, bs = 0, nota = '';
    inv.filter(i => i.cat === 'linha' && i.tipo !== 'fluor').forEach(i => {
      const lb = lbOf(i);
      let sc = (lb >= need.lb[0] * 0.85 && lb <= need.lb[1] * 1.2) ? 1 : (lb >= need.lb[0] * 0.6 && lb <= need.lb[1] * 1.7) ? 0.5 : 0;
      if (i.tipo !== need.tipo && sc === 1) sc = (need.tipo === 'mono' && i.tipo === 'multi') ? 1 : 0.5;
      if (sc > bs) { bs = sc; best = i; }
    });
    if (best && bs < 1) nota = 'Resistência ou tipo de linha fora da faixa ideal.';
    comps.push({ nome: 'Linha principal', precisa: need.txt, tem: best, status: ST(bs), sc: bs, nota, buy: need.tipo === 'multi' ? ('linha multifilamento ' + need.lb[1] + 'lb') : ('linha monofilamento ' + need.lb[1] + 'lb') });
  }
  // Líder / empate
  {
    const need = spec.lider;
    let best = null, bs = 0, nota = '';
    if (need.tipo === 'aco') {
      inv.filter(i => i.cat === 'empate').forEach(i => {
        const sc = (+i.lb || 0) >= need.lb[0] * 0.7 ? 1 : 0.5;
        if (sc > bs) { bs = sc; best = i; }
      });
      if (!best) nota = 'Sem empate de aço o dente corta a linha.';
    } else {
      inv.filter(i => i.cat === 'linha' && (i.tipo === 'fluor' || i.tipo === 'mono')).forEach(i => {
        const lb = lbOf(i);
        let sc = (lb >= need.lb[0] * 0.8 && lb <= need.lb[1] * 1.3) ? 1 : (lb >= need.lb[0] * 0.55 && lb <= need.lb[1] * 1.8) ? 0.5 : 0;
        if (need.tipo === 'fluor' && i.tipo === 'mono' && sc === 1) sc = rec.st.agua === 'clara' ? 0.5 : 1;
        if (sc > bs) { bs = sc; best = i; }
      });
      if (best && bs < 1) nota = need.tipo === 'fluor' && best.tipo === 'mono' ? 'Mono serve, mas em água clara o fluorcarbono é menos visível.' : 'Resistência do líder fora da faixa ideal.';
    }
    comps.push({ nome: need.tipo === 'aco' ? 'Empate de aço' : 'Líder', precisa: need.txt, tem: best, status: ST(bs), sc: bs, nota, buy: need.tipo === 'aco' ? 'empate de aço pesca' : (need.tipo === 'fluor' ? 'linha fluorcarbono ' + need.lb[1] + 'lb' : 'linha monofilamento ' + need.lb[1] + 'lb') });
  }
  // Anzol
  const usaOffset = rec.top.art === 'shad';
  if (spec.anzol && !(spec.anzol.soSilicone && !usaOffset) && !spec.anzol.soGarateia) {
    const need = spec.anzol;
    let best = null, bs = 0, nota = '';
    inv.filter(i => i.cat === 'anzol').forEach(i => {
      const a = hookNum(i.min), b = hookNum(i.max === '' || i.max === undefined ? i.min : i.max);
      if (a === null) return;
      const r = [Math.min(a, b === null ? a : b), Math.max(a, b === null ? a : b)];
      let sc = faixa(r, need.tam, 1);
      if (i.modelo !== need.modelo) sc = Math.min(sc, 0.5);
      if (sc > bs) { bs = sc; best = i; }
    });
    if (best && bs < 1) nota = best.modelo !== need.modelo ? 'Modelo diferente do ideal, mas o tamanho atende.' : 'Tamanho fora da faixa ideal.';
    const nomeMod = { circular: 'circular', maruseigo: 'maruseigo', offset: 'offset', haste: 'haste longa', jcomum: '', garateia: '' }[need.modelo] || '';
    comps.push({ nome: 'Anzol', precisa: need.txt, tem: best, status: ST(bs), sc: bs, nota, buy: 'anzol ' + nomeMod + ' ' + hookTxt(need.tam[1]) });
  } else if (spec.anzol && spec.anzol.soGarateia) {
    comps.push({ nome: 'Garatéias', precisa: spec.anzol.txt, tem: null, status: 'info', sc: null, nota: 'Confira se as garatéias das suas iscas são reforçadas.', buy: 'garateia reforçada 4x' });
  }
  // Chumbada
  if (spec.chumbada) {
    const need = spec.chumbada;
    let best = null, bs = 0, nota = '';
    inv.filter(i => i.cat === 'chumbada').forEach(i => {
      let sc = faixa([+i.gMin || 0, +i.gMax || +i.gMin || 0], need.g, 5);
      if (i.tipo !== need.tipo) sc = Math.min(sc, 0.5);
      if (sc > bs) { bs = sc; best = i; }
    });
    if (best && bs < 1) nota = 'Tipo ou peso diferente do ideal.';
    comps.push({ nome: 'Chumbada', precisa: need.txtAjustado, tem: best, status: ST(bs), sc: bs, nota, buy: 'chumbada ' + need.tipo + ' ' + need.g[1] + 'g' });
  }
  // Iscas artificiais recomendadas
  const arts = [rec.top].concat(rec.alts).filter(b => b.tipo === 'artificial').slice(0, 2);
  arts.forEach((b, idx) => {
    const tenho = inv.filter(i => i.cat === 'isca' && i.art === b.art);
    let best = null, bs = 0, nota = '';
    tenho.forEach(i => {
      const sc = rec.cores && rec.cores.lista.includes(i.cor) ? 1 : 0.5;
      if (sc > bs) { bs = sc; best = i; }
    });
    if (best && bs < 1) nota = 'Você tem o tipo certo; a cor indicada hoje é ' + rec.cores.lista.slice(0, 2).map(c => CORES_ISCA[c].nome.toLowerCase()).join(' ou ') + '.';
    comps.push({ nome: idx === 0 && b === rec.top ? 'Isca principal' : 'Isca alternativa', precisa: ART_TIPOS[b.art], tem: best, status: ST(bs), sc: bs, nota, buy: 'isca artificial ' + ART_TIPOS[b.art].split(' (')[0] + (rec.sp.id === 'tucunare' || rec.sp.id === 'traira' ? ' ' + rec.sp.nome : '') });
  });
  if (rec.top.tipo === 'natural') {
    comps.push({ nome: 'Isca natural', precisa: rec.top.nome, tem: null, status: 'info', sc: null, nota: 'Compre com isqueiro da região ou capture no local.', buy: null });
  }
  const pontuados = comps.filter(c => c.sc !== null);
  const pct = pontuados.length ? Math.round(pontuados.reduce((a, c) => a + c.sc, 0) / pontuados.length * 100) : 0;
  return { comps, pct };
}

/* Cobertura: o quanto o equipamento atende cada espécie em uma condição típica boa */
function cobertura(inv) {
  return ESPECIES.map(sp => {
    const melhorHora = Object.keys(sp.h).sort((a, b) => sp.h[b] - sp.h[a])[0];
    let best = { pct: -1 };
    ['carretilha', 'molinete'].forEach(v => {
      const st = { esp: sp.id, agua: 'verde', nivel: 'baixando', temp: 'quente', clima: 'nublado', hora: melhorHora, local: 'barco', variante: v };
      const r = recomenda(st);
      const m = cruza(r, inv);
      if (m.pct > best.pct) best = { pct: m.pct, variante: v, falta: m.comps.filter(c => c.status === 'falta').map(c => c.nome) };
    });
    return Object.assign({ sp }, best);
  }).sort((a, b) => b.pct - a.pct);
}

/* Kit de exemplo para o inventário vazio */
function kitExemplo() {
  const id = () => Math.random().toString(36).slice(2, 9);
  return [
    { cat: 'vara', nome: 'Vara de carretilha 1,80 m', tipo: 'carretilha', comp: 1.8, lbMin: 12, lbMax: 25, acao: 'rapida' },
    { cat: 'vara', nome: 'Vara de fundo 2,10 m', tipo: 'carretilha', comp: 2.1, lbMin: 20, lbMax: 40, acao: 'moderada' },
    { cat: 'vara', nome: 'Vara de molinete 1,80 m', tipo: 'molinete', comp: 1.8, lbMin: 8, lbMax: 17, acao: 'moderada' },
    { cat: 'carretilha', nome: 'Carretilha perfil baixo', perfil: 'perfil', tam: 150 },
    { cat: 'carretilha', nome: 'Carretilha redonda', perfil: 'redonda', tam: 300 },
    { cat: 'molinete', nome: 'Molinete', tam: 3000 },
    { cat: 'linha', nome: 'Multi 8X', tipo: 'multi', res: 30, unid: 'lb' },
    { cat: 'linha', nome: 'Multi 4X', tipo: 'multi', res: 50, unid: 'lb' },
    { cat: 'linha', nome: 'Mono', tipo: 'mono', res: 0.35, unid: 'mm' },
    { cat: 'linha', nome: 'Fluorcarbono', tipo: 'fluor', res: 35, unid: 'lb' },
    { cat: 'linha', nome: 'Mono grosso (líder)', tipo: 'mono', res: 0.7, unid: 'mm' },
    { cat: 'empate', nome: 'Empate de aço 25 cm', lb: 40 },
    { cat: 'anzol', nome: 'Circular', modelo: 'circular', min: '4/0', max: '7/0' },
    { cat: 'anzol', nome: 'Maruseigo', modelo: 'maruseigo', min: '1/0', max: '3/0' },
    { cat: 'chumbada', nome: 'Oliva', tipo: 'oliva', gMin: 10, gMax: 40 },
    { cat: 'isca', nome: 'Zara 9 cm', art: 'zara', cor: 'osso', cm: 9 },
    { cat: 'isca', nome: 'Meia-água 9 cm', art: 'meia', cor: 'dourado', cm: 9 },
    { cat: 'isca', nome: 'Sapo anti-enrosco', art: 'sapo', cor: 'preto', cm: 6 },
    { cat: 'isca', nome: 'Jig de penas', art: 'jig', cor: 'branco', cm: 7 }
  ].map(i => Object.assign(i, { id: id(), exemplo: true }));
}

if (typeof module !== 'undefined') module.exports = { recomenda, cruza, cobertura, kitExemplo, hookNum, hookTxt, monoToLb };
