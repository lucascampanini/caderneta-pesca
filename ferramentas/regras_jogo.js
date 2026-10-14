// Gera docs/jogo/src/data/caderneta.js a partir dos dados da Caderneta (src/data.js):
// iscas que cada peixe aceita, linha, anzol e empate indicados. Assim o jogo segue as mesmas regras do site.
// Uso: node ferramentas/regras_jogo.js   (o build.py chama sozinho)
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(raiz, 'src', 'data.js'), 'utf8');
const { ESPECIES, PERFIS } = new Function(src + ';return { ESPECIES, PERFIS };')();

const regras = {};
for (const e of ESPECIES) {
  const perfil = PERFIS[e.perfilNat] || PERFIS[e.perfilArt];
  const vars = ['carretilha', 'molinete'].map(v => perfil[v]).filter(Boolean);
  const faixa = (f) => {
    const xs = vars.map(f).filter(Boolean);
    return xs.length ? [Math.min(...xs.map(x => x[0])), Math.max(...xs.map(x => x[1]))] : null;
  };
  const iscas = {};
  for (const i of e.iscas) {
    const k = i.tipo === 'artificial' ? i.art : i.ic;
    iscas[k] = Math.max(iscas[k] || 0, i.p);
  }
  const anzolVar = vars.find(v => v.anzol && v.anzol.tam);
  regras[e.id] = {
    nome: e.nome,
    perfil: perfil.nome,
    iscas,
    melhores: e.iscas.slice().sort((a, b) => b.p - a.p).slice(0, 3).map(i => i.nome),
    linha: faixa(v => v.linha && v.linha.lb),
    vara: faixa(v => v.vara && v.vara.lb),
    anzol: anzolVar ? anzolVar.anzol.tam : null,
    anzolTxt: anzolVar ? anzolVar.anzol.txt : '',
    aco: vars.some(v => v.lider && v.lider.tipo === 'aco'),
    linhaTxt: vars[0].linha.txt,
    dica: (e.dicas && e.dicas[0]) || ''
  };
}
const out = '// Gerado por ferramentas/regras_jogo.js a partir de src/data.js da Caderneta. Não edite à mão.\n' +
  'export const REGRAS = ' + JSON.stringify(regras, null, 1) + ';\n';
fs.writeFileSync(path.join(raiz, 'docs', 'jogo', 'src', 'data', 'caderneta.js'), out);
console.log('regras do jogo:', Object.keys(regras).length, 'espécies');
