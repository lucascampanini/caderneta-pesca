# Caderneta Pantaneira

Site de bolso para pesca de água doce no Pantanal e em Mato Grosso do Sul. Escolha o peixe e as condições do rio (cor da água, nível, temperatura, tempo, horário) e veja a isca, as cores, a montagem completa, os nós e o que usar do seu próprio equipamento.

## Estrutura

- `src/data.js`: espécies, perfis de equipamento, nós e montagens
- `src/engine.js`: regras de recomendação e cruzamento com o inventário
- `src/draw.js`: ilustrações em SVG (peixes, montagens, nós)
- `src/app.js`, `src/styles.css`, `src/body.html`: interface
- `build.py`: junta tudo em `docs/index.html` (GitHub Pages) e `dist/index.html` (versão Claude)
- `docs/fotos/<id>.jpg` e `docs/fotos/creditos.json`: fotos reais opcionais; sem elas, o site usa só as ilustrações

## Gerar o site

```
python3 build.py
```

## Regras de pesca

As regras de MS (piracema, cota, tamanhos, moratória do dourado) mudam todo ano. Confira o Imasul antes de cada temporada e atualize `regra` em `src/data.js`.
