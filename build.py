import re, pathlib
S = pathlib.Path('src')
css = (S/'styles.css').read_text(encoding='utf-8')
js = '\n'.join((S/f).read_text(encoding='utf-8') for f in ['data.js','engine.js','draw.js','app.js'])
js = re.sub(r"if \(typeof module !== 'undefined'\)[^\n]*\n", '', js)
body = (S/'body.html').read_text(encoding='utf-8')
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">'
page = f'<title>Caderneta Pantaneira</title>\n{fonts}\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n'
pathlib.Path('dist').mkdir(exist_ok=True)
(pathlib.Path('dist')/'index.html').write_text(page, encoding='utf-8')
site = pathlib.Path('docs'); site.mkdir(exist_ok=True)
# fotos recortadas (docs/fotos) só existem na versão do GitHub Pages
cred = site / 'fotos' / 'creditos.json'
fotos = cred.read_text(encoding='utf-8').strip() if cred.exists() else '{}'
rig = site / 'montagem' / 'manifest.json'
sprites = rig.read_text(encoding='utf-8').strip() if rig.exists() else 'null'
page_site = page.replace('<script>\n', '<script>\nwindow.FOTOS = ' + fotos + ';\nwindow.NOS_YT = true;\nwindow.RIG_SPRITES = ' + sprites + ';\n', 1)
full = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="Isca, montagem e equipamento para cada peixe do Pantanal, conforme a condição do rio.">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
        f'</head><body>\n{page_site}</body></html>\n')
(site/'index.html').write_text(full, encoding='utf-8')
print(len(page))
