# Caderneta Pantaneira

Site de bolso para pesca de água doce no Pantanal e em Mato Grosso do Sul. Escolha o peixe e as condições do rio (cor da água, nível, temperatura, tempo, horário) e veja a isca, as cores, a montagem completa, os nós e o que usar do seu próprio equipamento.

Site publicado: https://lucascampanini.github.io/caderneta-pesca/

## Estrutura

- `src/data.js`: espécies, perfis de equipamento, nós e montagens
- `src/engine.js`: regras de recomendação e cruzamento com o inventário
- `src/draw.js`: diagramas de montagem (com as peças 3D quando publicadas) e desenhos de reserva
- `src/app.js`, `src/styles.css`, `src/body.html`: interface
- `build.py`: junta tudo em `docs/index.html` (GitHub Pages) e `dist/index.html` (versão Claude, sem as mídias)
- `docs/fotos/`: recorte de cada peixe (`<id>.webp`, `<id>-card.webp`), foto original (`<id>.jpg`) e `creditos.json`
- `docs/nos/`: animação 3D de cada nó (`<id>.mp4`), capa (`<id>.jpg`) e capítulos (`<id>.timeline.json`)
- `docs/montagem/`: peças 3D das montagens (`*.webp`) e `manifest.json` com o ponto onde a linha prende

O `build.py` lê os três manifestos e injeta no `docs/index.html`. Se uma pasta faltar, o site volta para os desenhos.

## Gerar o site

```
python3 build.py
```

## Ferramentas de mídia (`ferramentas/`)

Precisam de GPU NVIDIA, Blender 4.5 e Python com numpy, numba, Pillow e OpenCV.

**Fotos dos peixes** (fotos com licença livre do Wikimedia Commons e do iNaturalist):
- `cutout.py`: recorta o peixe com SAM2 (`D:/AI/sam2`), usando a caixa e os pontos de `prompts.json`
- `export_fotos.py`: gera os WebP recortados, a foto original reduzida e o `creditos.json`

**Nós** (simulação de linha + Blender):
- `knots_def.py` e `knots_more.py`: caminho de cada nó, frouxo e apertado, na ordem em que se faz
- `knotsim.py` e `solver_nb.py`: transição frouxo → apertado com colisão da linha com ela mesma e com o anzol
- `render_knot.py`: monta a cena no Blender e renderiza o MP4 com os capítulos
- `publish_videos.py`: copia os vídeos para `docs/nos` com capa e capítulos

```
python knots_def.py out                       # simula os seis nós
blender -b --factory-startup --python render_knot.py -- out/clinch.json video --res 1280x720 --samples 40
python publish_videos.py video ../docs
```

**Montagens**:
- `sprites.py`: modela no Blender anzóis, giradores, chumbadas, boia, iscas artificiais (10 tipos × 15 cores) e naturais
- `export_sprites.py`: recorta, salva em WebP e escreve o `manifest.json`

```
blender -b --factory-startup --python sprites.py -- render
python export_sprites.py render ../docs
```

## Regras de pesca

As regras de MS (piracema, cota, tamanhos, moratória do dourado) mudam todo ano. Confira o Imasul antes de cada temporada e atualize `regra` em `src/data.js`.
