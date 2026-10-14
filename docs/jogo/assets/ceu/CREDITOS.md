# Céus do jogo — créditos

Fotos de céu (HDRI) do **Poly Haven** (https://polyhaven.com), licença **CC0** (domínio público).
Usamos só a metade de cima de cada panorama, convertida para WebP com codificação Reinhard
reversível (o shader do céu recupera a luz original e o tone mapping ACES é feito uma vez só).

| Arquivo | HDRI original | Autor |
|---|---|---|
| `ceu_dia.webp` | Kloofendal 48d Partly Cloudy (Pure Sky) | Greg Zaal |
| `ceu_amanhecer.webp` | Qwantani Dawn (Pure Sky) | Greg Zaal / Jarod Guest |
| `ceu_entardecer.webp` | Kloppenheim 06 (Pure Sky) | Greg Zaal |
| `ceu_noite.webp` | Kloppenheim 02 (Pure Sky), escurecido, sem o sol, com estrelas e Via Láctea geradas | Greg Zaal |

Amanhecer e entardecer receberam um tom quente no horizonte. A conversão está em
`converter_hdri.py` (roda dentro do Blender: `blender -b --factory-startup -P converter_hdri.py`).
