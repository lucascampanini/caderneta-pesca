// Gera docs/jogo/src/livre/fatoresCaderneta.js a partir de src/data.js da Caderneta: quanto o clima (c),
// o nível do rio (n) e a cor da água (a) ajudam ou atrapalham cada espécie (−2 a +2), como no site.
// O modo livre usa isso com o clima ao vivo e o nível do rio para mudar a tabela de peixes.
// Uso: node ferramentas/rios/fatores_caderneta.js
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(raiz, 'src', 'data.js'), 'utf8');
const { ESPECIES } = new Function(src + ';return { ESPECIES };')();
const out = {};
for (const e of ESPECIES) if (e.c || e.n || e.a) out[e.id] = { c: e.c || {}, n: e.n || {}, a: e.a || {}, onde: e.onde || {} };
const txt = '// Gerado por ferramentas/rios/fatores_caderneta.js a partir de src/data.js da Caderneta. Não edite à mão.\n' +
  '// c: clima (sol, nublado, chuva, pre = pré-frente, pos = pós-frente) · n: nível · a: água · onde: dica por nível\n' +
  'export const FATORES = ' + JSON.stringify(out, null, 1) + ';\n';
fs.writeFileSync(path.join(raiz, 'docs', 'jogo', 'src', 'livre', 'fatoresCaderneta.js'), txt);
console.log('fatores:', Object.keys(out).length, 'espécies');
