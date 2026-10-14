# Rios do modo livre — dados, créditos e licenças

O modo livre do jogo recria o **Rio Aquidauana (MS)**, da cidade de Aquidauana (Ponte da Amizade) até
uns 8 km abaixo do **Pindó**, com o formato da água, os bancos de areia, a cor do chão e o nível do rio
do dia, a partir de dados abertos. Os arquivos ficam em `aquidauana/` e são refeitos todo dia pelo
workflow `.github/workflows/rio-aquidauana.yml` (script `ferramentas/rios/aquidauana.py`).

## Fontes e créditos (aparecem no rodapé do modo livre)

| Dado | Fonte | Licença / atribuição |
|---|---|---|
| Linha do rio, lugares (Aquidauana, Anastácio, Ponte da Amizade…) | OpenStreetMap, via Overpass API | ODbL — **© OpenStreetMap contributors** |
| Forma atual da água (NDWI/MNDWI + teste de água barrenta), bancos de areia, cor verdadeira do chão e da água | Copernicus Sentinel-2 L2A, pela STAC da Element84 (Earth Search) e COGs públicos na AWS | **Contém dados modificados do Copernicus Sentinel [ano]** (o ano da imagem vai no rodapé) |
| Relevo (barrancos e terreno) | Terrain Tiles "terrarium" (Mapzen / AWS Open Data; SRTM e outros) | dados abertos, atribuição "Terrain Tiles (Mapzen/AWS Open Data, SRTM)" |
| Nível do rio | ANA — Agência Nacional de Águas e Saneamento Básico, telemetria da estação fluviométrica **66945000 (Aquidauana)**, operada pelo SGB/CPRM | dados públicos, atribuição "ANA" |
| Clima (ao vivo no jogo e no pacote diário) | Open-Meteo.com | **CC BY 4.0** |
| Fatores de clima/nível/água por espécie | Caderneta Pantaneira (`src/data.js`) | do próprio projeto |

## Como os dados são feitos

- **Satélite:** busca as cenas Sentinel-2 L2A dos últimos 75 dias sobre o trecho (tile 21KXT). A máscara
  de nuvem SCL é engordada ~150 m e completada por um teste de névoa (branca no azul). O mosaico é
  "mais recente primeiro": cada pixel vem da cena mais nova em que estava limpo. Em outubro de 2026 as
  cenas estavam muito nubladas; o pacote de 14/10/2026 usa 06/10 (8% do corredor), 29/09 (15%) e
  24/09/2026 (77%). A cor do chão vem da cena mais limpa (sem emendas).
- **Água:** NDWI/MNDWI a 10 m mais um teste para o rio barrento debaixo das copas (NDVI, NIR e SWIR
  baixos). Fica a água ligada ao rio e as lagoas grandes que encostam no corredor. A linha central é o
  caminho mais barato pela água (Dijkstra), então segue o canal que o satélite vê hoje, não o desenho
  antigo do OSM. Onde a máscara se fecha (pontes, copas) é aberto um canal mínimo de 22 m para o barco
  passar. No jogo a água fica 2,5 m mais larga de cada lado (as copas da mata cobrem a beira).
- **Nível:** a ANA às vezes passa dias sem transmitir (no pacote de 14/10/2026 a última leitura era de
  24/09/2026, 316 cm). O script usa a mediana diária filtrada, calcula a variação em 7 dias e o percentil
  no último ano e classifica como nas regras da Caderneta: *subindo*, *cheio*, *baixando* ou *seco*
  (baixo e estável). A data da leitura aparece no jogo. Sem leitura, o jogo usa só o satélite.
  A API usada é `telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos` com datas no
  formato `dd/mm/aaaa` e pedidos de 30 dias; "Sem dados para esta estação" quer dizer que a estação não
  transmitiu no período (não é erro de formato).
- **Clima:** o jogo busca o clima atual do ponto no Open-Meteo a cada 10 minutos (temperatura, nuvens,
  chuva, vento e pressão para pré/pós-frente) e usa a hora local de MS (America/Campo_Grande). Se não
  houver internet, usa o clima gravado no pacote.

## Regras de pesca no modo livre (decisões)

- **Piracema em MS (5 de novembro a 28/29 de fevereiro):** decidimos **permitir só o pesque e solte** —
  o peixe conta no Diário e dá XP, mas não vai para o samburá nem rende dinheiro, e o jogo avisa ao
  entrar no rio. (Bloquear a pesca de vez tiraria o modo livre do ar por quase 4 meses.)
- **Dourado:** captura proibida em MS (moratória até 2027): sempre solto.
- **Medidas mínimas de referência em MS:** pintado e cachara 80 cm, jaú 95 cm, barbado 60 cm, pacu
  45 cm, piauçu e curimbatá 38 cm, piraputanga 30 cm — abaixo disso o peixe volta para a água. São
  valores de referência para o jogo: confira sempre a legislação vigente do IMASUL antes de pescar.
- A tabela de peixes é a do Aquidauana (espécies de `data/fishData.js`), com o peso de cada espécie
  ajustado pelos fatores −2..+2 da Caderneta para o clima de agora, a fase do rio e a água barrenta.

## Tamanho

`rio.json` ~65 kB, `campo.png` ~1,5 MB (grade 1432×2850 de 10 m, RGB: distância até a beira, areia e
relevo), `cor.webp` ~0,3 MB (cor verdadeira a 10 m). Total ~1,9 MB.
