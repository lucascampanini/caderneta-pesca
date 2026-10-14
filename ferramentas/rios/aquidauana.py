# -*- coding: utf-8 -*-
"""
Pacote de dados do Rio Aquidauana para o modo livre do jogo Pesca Pantaneira.

Fontes (todas abertas, sem chave):
  - Geometria da linha do rio: OpenStreetMap via Overpass (ODbL, (c) OpenStreetMap contributors)
  - Forma atual da água, bancos de areia e cor: Sentinel-2 L2A (Copernicus), pela STAC da Element84
    (COGs públicos na AWS)
  - Relevo: Terrain Tiles "terrarium" (Mapzen/AWS Open Data; SRTM e outros)
  - Nível do rio: ANA, telemetria da estação fluviométrica 66945000 (Aquidauana)
  - Clima no momento do pacote: Open-Meteo (CC BY 4.0) — o jogo também busca ao vivo

Saída em docs/jogo/assets/rios/aquidauana/:
  rio.json   metadados, linha central suavizada com larguras, pontos de interesse (o Pindó), datas,
             nível, clima e a georreferência da grade
  campo.png  grade de 10 m (UTM 21S) em RGB: R distância com sinal até a beira d'água
             (128 = beira, 1 unidade = 0,75 m, <128 dentro d'água), G banco de areia (0..255),
             B relevo relativo ao rio (0,1 m por unidade)
  cor.webp   cor verdadeira do satélite na mesma grade (20 m) para o chão das margens

Uso:  python ferramentas/rios/aquidauana.py [--saida DIR] [--cache DIR]
Precisa de: rasterio, numpy, scipy, pillow, requests, pyproj
"""
import argparse
import datetime as dt
import io
import json
import math
import os
import sys
import time
import xml.etree.ElementTree as ET

import numpy as np
import requests
from PIL import Image
from pyproj import Transformer
from scipy import ndimage

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAIDA_PADRAO = os.path.join(RAIZ, "docs", "jogo", "assets", "rios", "aquidauana")
UA = "CadernetaPantaneira/1.0 (+https://github.com/lucascampanini/caderneta-pesca)"

# ---------------------------------------------------------------- configuração do trecho
CIDADE = (-20.4711, -55.7872)  # Aquidauana (centro)
PINDO = (-20.2818, -55.8949)
KM_ALEM_DO_PINDO = 8.0  # o dono pediu para descer além do Pindó
BBOX_BUSCA = (-56.00, -20.50, -55.75, -20.08)  # lon0, lat0, lon1, lat1
MARGEM_M = 1400  # corredor modelado de cada lado da linha do rio
EPSG_UTM = 32721  # UTM 21S (a grade nativa do Sentinel-2 neste tile, 21KXT)
CELULA = 10.0
ESTACAO_ANA = "66945000"
DIAS_STAC = 75
MAX_CENAS = 8

PONTOS_EXTRA = [
    # nome, lat, lon, tipo, descrição
    ("Pindó", PINDO[0], PINDO[1], "pindo", "Ponto de pesca Pindó, rio abaixo de Aquidauana"),
]


def log(*a):
    print(*a, flush=True)


def sessao():
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    return s


S = sessao()


def get_json(url, **kw):
    for tent in range(4):
        try:
            r = S.get(url, timeout=kw.pop("timeout", 90), **kw)
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001
            log("  falhou", url[:80], e)
            time.sleep(3 + tent * 5)
    raise RuntimeError("sem resposta: " + url)


# ---------------------------------------------------------------- OSM
OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


def overpass(q, cache):
    if cache and os.path.exists(cache) and time.time() - os.path.getmtime(cache) < 6 * 3600:
        with open(cache, encoding="utf-8") as f:
            return json.load(f)
    erro = None
    for rodada in range(3):
        for url in OVERPASS:
            try:
                r = S.post(url, data={"data": q}, headers={"Accept": "application/json"}, timeout=200)
                if r.status_code == 200 and r.text.lstrip().startswith("{"):
                    d = r.json()
                    if cache:
                        with open(cache, "w", encoding="utf-8") as f:
                            json.dump(d, f)
                    return d
                erro = f"{url}: HTTP {r.status_code} {r.text[:120]!r}"
            except Exception as e:  # noqa: BLE001
                erro = f"{url}: {e}"
            log("  overpass:", erro)
        time.sleep(10 + rodada * 20)
    raise RuntimeError("Overpass indisponível: " + str(erro))


def linha_do_rio(cache_dir):
    lon0, lat0, lon1, lat1 = BBOX_BUSCA
    q = f'[out:json][timeout:120];way["waterway"="river"]["name"="Rio Aquidauana"]({lat0},{lon0},{lat1},{lon1});out geom;'
    d = overpass(q, os.path.join(cache_dir, "osm_rio.json") if cache_dir else None)
    ways = [w for w in d["elements"] if w.get("type") == "way" and w.get("geometry")]
    log(f"OSM: {len(ways)} trechos do Rio Aquidauana")
    # encadeia pelo nó final -> nó inicial (o sentido do OSM é o da correnteza)
    ini = {}
    for w in ways:
        g = w["geometry"]
        ini.setdefault((round(g[0]["lat"], 7), round(g[0]["lon"], 7)), w)
    fins = {(round(w["geometry"][-1]["lat"], 7), round(w["geometry"][-1]["lon"], 7)) for w in ways}
    # começo da cadeia: trecho cujo início não é fim de nenhum outro, o mais a leste (rio acima)
    cand = [w for w in ways if (round(w["geometry"][0]["lat"], 7), round(w["geometry"][0]["lon"], 7)) not in fins]
    cur = max(cand, key=lambda w: w["geometry"][0]["lon"]) if cand else ways[0]
    usados, pts = set(), []
    while cur and cur["id"] not in usados:
        usados.add(cur["id"])
        g = [(p["lat"], p["lon"]) for p in cur["geometry"]]
        pts.extend(g[1:] if pts else g)
        fim = (round(g[-1][0], 7), round(g[-1][1], 7))
        cur = ini.get(fim)
    return np.array(pts), sorted(usados)


def feicoes_osm(cache_dir, bbox_ll):
    """Lagoas, corixos, ilhas e lugares com nome perto do trecho (para o mapa e o contexto)."""
    lon0, lat0, lon1, lat1 = bbox_ll
    q = (f'[out:json][timeout:120];('
         f'way["natural"="water"]({lat0},{lon0},{lat1},{lon1});'
         f'way["waterway"~"stream|canal|riverbank"]({lat0},{lon0},{lat1},{lon1});'
         f'way["place"="island"]({lat0},{lon0},{lat1},{lon1});'
         f'node["place"]({lat0},{lon0},{lat1},{lon1});'
         f'node["name"]["tourism"]({lat0},{lon0},{lat1},{lon1});'
         f'node["leisure"="fishing"]({lat0},{lon0},{lat1},{lon1});'
         f'way["bridge"="yes"]["highway"]({lat0},{lon0},{lat1},{lon1});'
         f');out geom;')
    try:
        return overpass(q, os.path.join(cache_dir, "osm_feicoes.json") if cache_dir else None)["elements"]
    except Exception as e:  # noqa: BLE001
        log("  feições OSM indisponíveis:", e)
        return []


# ---------------------------------------------------------------- geometria
R_TERRA = 6371008.8


def dist_ll(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return R_TERRA * math.hypot(math.radians(b[1] - a[1]) * math.cos(la), math.radians(b[0] - a[0]))


def abscissa(pts):
    s = [0.0]
    for i in range(1, len(pts)):
        s.append(s[-1] + float(np.hypot(*(pts[i] - pts[i - 1]))))
    return np.array(s)


def reamostra(pts, passo):
    s = abscissa(pts)
    n = max(2, int(s[-1] / passo) + 1)
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)


def suaviza(pts, janela):
    if janela < 2:
        return pts
    k = np.hanning(janela * 2 + 1)
    k /= k.sum()
    pad = np.concatenate([np.repeat(pts[:1], janela, 0), pts, np.repeat(pts[-1:], janela, 0)])
    return np.stack([np.convolve(pad[:, i], k, "valid") for i in range(2)], 1)


# ---------------------------------------------------------------- Sentinel-2
STAC = "https://earth-search.aws.element84.com/v1/search"


def busca_cenas(bbox_ll):
    hoje = dt.datetime.now(dt.timezone.utc)
    ini = hoje - dt.timedelta(days=DIAS_STAC)
    corpo = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(bbox_ll),
        "datetime": f"{ini:%Y-%m-%dT00:00:00Z}/{hoje:%Y-%m-%dT23:59:59Z}",
        "limit": 100,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    for tent in range(4):
        try:
            r = S.post(STAC, json=corpo, timeout=90)
            r.raise_for_status()
            feats = r.json()["features"]
            break
        except Exception as e:  # noqa: BLE001
            log("  STAC falhou:", e)
            time.sleep(5 + tent * 10)
    else:
        raise RuntimeError("STAC indisponível")
    # um item por data (o tile 21KXT cobre o trecho todo); descarta reprocessamentos repetidos
    vistos, cenas = set(), []
    for f in feats:
        d = f["properties"]["datetime"][:10]
        if d in vistos:
            continue
        vistos.add(d)
        cenas.append(f)
    return cenas


def janela_banda(url, grade, reamostrar=False):
    """Lê uma banda COG na janela da grade (mesmo UTM). Bandas de 20 m são ampliadas para 10 m."""
    import rasterio
    from rasterio.windows import from_bounds
    from rasterio.enums import Resampling

    x0, y0, x1, y1 = grade["bounds"]
    with rasterio.open(url) as src:
        if src.crs.to_epsg() != EPSG_UTM:
            raise RuntimeError(f"CRS inesperado {src.crs}")
        win = from_bounds(x0, y0, x1, y1, src.transform)
        out = src.read(
            1, window=win, out_shape=(grade["h"], grade["w"]), boundless=True, fill_value=0,
            resampling=Resampling.bilinear if reamostrar else Resampling.nearest,
        )
    return out


def le_cena(f, grade):
    a = f["assets"]
    href = lambda k: a[k]["href"]  # noqa: E731
    scl = janela_banda(href("scl"), grade)
    return scl


def le_bandas(f, grade):
    a = f["assets"]
    b = {}
    for k in ("blue", "green", "red", "nir", "swir16"):
        b[k] = janela_banda(a[k]["href"], grade, reamostrar=(k == "swir16")).astype(np.float32)
    # L2A (baseline >= 04.00) tem offset de -1000 nas reflectâncias
    base = f["properties"].get("s2:processing_baseline", "05.00")
    try:
        precisa_offset = float(base) >= 4.0 and not f["properties"].get("earthsearch:boa_offset_applied", False)
    except ValueError:
        precisa_offset = True
    for k in b:
        v = b[k]
        nod = v == 0
        if precisa_offset:
            v = v - 1000.0
        v = np.clip(v / 10000.0, 0, 1.5)
        v[nod] = np.nan
        b[k] = v
    return b


SCL_RUIM = {0, 1, 3, 8, 9, 10, 11}  # sem dado, saturado, sombra de nuvem, nuvens, cirrus, neve


def compoe_satelite(cenas, grade, corredor):
    """
    Mosaico 'mais recente primeiro': cada pixel da água/margem vem da cena mais nova em que está limpo.
    A máscara de nuvem do SCL deixa passar bordas de nuvem e névoa, então ela é engordada (~150 m) e
    completada por um teste de brilho no azul. A cor do chão vem da cena mais limpa (sem emendas).
    """
    H, W = grade["h"], grade["w"]
    BANDAS = ("blue", "green", "red", "nir", "swir16")
    comp = {k: np.full((H, W), np.nan, np.float32) for k in BANDAS}
    origem = np.full((H, W), -1, np.int16)
    usadas = []
    melhor = None  # (fração limpa no corredor, bandas, máscara)
    alvo = corredor
    for f in cenas:
        data = f["properties"]["datetime"][:10]
        try:
            scl = le_cena(f, grade)
        except Exception as e:  # noqa: BLE001
            log("  SCL falhou", f["id"], e)
            continue
        # nuvem e sombra engordadas ~150 m; sem dado/saturado ficam como estão
        ruim = ndimage.binary_dilation(np.isin(scl, [3, 8, 9, 10]), iterations=15) | np.isin(scl, [0, 1, 11])
        limpo = ~ruim
        falta = alvo & (origem < 0)
        ganho = falta & limpo
        frac_limpa = limpo[alvo].mean()
        log(f"  {data}: {100 * frac_limpa:5.1f}% limpo no corredor, preencheria {100 * ganho.sum() / max(1, alvo.sum()):5.1f}%")
        if ganho.sum() < 0.01 * alvo.sum():
            continue
        try:
            b = le_bandas(f, grade)
        except Exception as e:  # noqa: BLE001
            log("  bandas falharam", f["id"], e)
            continue
        bb, rr = np.nan_to_num(b["blue"], nan=1), np.nan_to_num(b["red"], nan=1)
        nevoa = (bb > 0.10) & (bb > 0.85 * rr) & (scl != 6)  # nuvem/névoa é branca; solo nu é avermelhado
        nevoa = ndimage.binary_dilation(ndimage.binary_opening(nevoa, iterations=1), iterations=8)
        limpo &= ~nevoa & np.isfinite(b["green"])
        frac_limpa = limpo[alvo].mean()
        if melhor is None or frac_limpa > melhor[0] + 0.02:
            melhor = (frac_limpa, b, limpo, data)
        enche = limpo & (origem < 0)
        if (enche & alvo).sum() < 0.01 * alvo.sum():
            continue
        for k in comp:
            comp[k][enche] = b[k][enche]
        origem[enche] = len(usadas)
        usadas.append({"id": f["id"], "data": data, "nuvem_tile": f["properties"].get("eo:cloud_cover"),
                       "fracao_corredor": round(float((enche & alvo).sum()) / max(1, alvo.sum()), 4)})
        log(f"     usada: {100 * usadas[-1]['fracao_corredor']:.1f}% do corredor")
        if (origem[alvo] >= 0).mean() > 0.995 or len(usadas) >= MAX_CENAS:
            break
    cor = {k: comp[k].copy() for k in ("red", "green", "blue")}
    if melhor is not None:
        _, b, limpo, data_cor = melhor
        for k in cor:
            cor[k] = np.where(limpo, b[k], cor[k])
    else:
        data_cor = usadas[0]["data"] if usadas else None
    return comp, origem, usadas, cor, data_cor


# ---------------------------------------------------------------- relevo (terrarium)
def relevo(grade, to_ll, z=13):
    from pyproj import Transformer as T

    x0, y0, x1, y1 = grade["bounds"]
    cantos = [to_ll.transform(x, y) for x in (x0, x1) for y in (y0, y1)]
    lons = [c[0] for c in cantos]
    lats = [c[1] for c in cantos]

    def tile(lon, lat):
        n = 2 ** z
        xt = (lon + 180) / 360 * n
        yt = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
        return xt, yt

    tx0, ty0 = tile(min(lons), max(lats))
    tx1, ty1 = tile(max(lons), min(lats))
    ix0, iy0, ix1, iy1 = int(tx0), int(ty0), int(tx1), int(ty1)
    mosaico = np.zeros(((iy1 - iy0 + 1) * 256, (ix1 - ix0 + 1) * 256), np.float32)
    for ty in range(iy0, iy1 + 1):
        for tx in range(ix0, ix1 + 1):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{tx}/{ty}.png"
            for tent in range(3):
                try:
                    r = S.get(url, timeout=60)
                    r.raise_for_status()
                    im = np.asarray(Image.open(io.BytesIO(r.content)).convert("RGB")).astype(np.float32)
                    break
                except Exception as e:  # noqa: BLE001
                    log("  tile falhou", url, e)
                    time.sleep(2)
            else:
                im = np.zeros((256, 256, 3), np.float32) + [128, 0, 0]
            h = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
            mosaico[(ty - iy0) * 256:(ty - iy0 + 1) * 256, (tx - ix0) * 256:(tx - ix0 + 1) * 256] = h
    # amostra no centro de cada célula da grade
    xs = x0 + (np.arange(grade["w"]) + 0.5) * CELULA
    ys = y1 - (np.arange(grade["h"]) + 0.5) * CELULA
    X, Y = np.meshgrid(xs, ys)
    lon, lat = to_ll.transform(X, Y)
    n = 2 ** z
    px = ((lon + 180) / 360 * n - ix0) * 256 - 0.5
    lr = np.radians(lat)
    py = ((1 - np.log(np.tan(lr) + 1 / np.cos(lr)) / math.pi) / 2 * n - iy0) * 256 - 0.5
    return ndimage.map_coordinates(mosaico, [py, px], order=1, mode="nearest").astype(np.float32)


# ---------------------------------------------------------------- ANA
def nivel_ana():
    """Série de nível (cm) da telemetria da ANA. A estação às vezes fica dias sem transmitir."""
    hoje = dt.date.today()
    url = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos"
    serie = []
    # pedidos de ~30 dias (a API recusa períodos longos com frequência)
    for k in range(13, -1, -1):
        fim = hoje - dt.timedelta(days=30 * k)
        ini = fim - dt.timedelta(days=29)
        try:
            r = S.get(url, params={"codEstacao": ESTACAO_ANA, "dataInicio": f"{ini:%d/%m/%Y}", "dataFim": f"{fim:%d/%m/%Y}"}, timeout=90)
            root = ET.fromstring(r.content)
        except Exception as e:  # noqa: BLE001
            log("  ANA falhou", ini, e)
            continue
        for el in root.iter():
            if el.tag.endswith("DadosHidrometereologicos") or el.tag.endswith("DadosHidrometeorologicos"):
                dh = el.findtext("DataHora")
                nv = el.findtext("Nivel")
                if dh and nv and nv.strip():
                    try:
                        serie.append((dt.datetime.strptime(dh.strip(), "%Y-%m-%d %H:%M:%S"), float(nv)))
                    except ValueError:
                        pass
    if not serie:
        return None
    serie.sort()
    # mediana diária (a telemetria tem picos espúrios)
    dias = {}
    for t, v in serie:
        dias.setdefault(t.date(), []).append(v)
    d = sorted((k, float(np.median(v))) for k, v in dias.items())
    datas = [k for k, _ in d]
    vals = np.array([v for _, v in d])
    # filtro de mediana de 5 dias para tirar leituras malucas
    filt = np.array([np.median(vals[max(0, i - 2):i + 3]) for i in range(len(vals))])
    ultimo = filt[-1]
    data_ult = datas[-1]
    ano = filt[[i for i, k in enumerate(datas) if (data_ult - k).days <= 365]]
    pct = float((ano < ultimo).mean()) if len(ano) > 10 else 0.5
    # tendência: últimos 7 dias com dado
    j = [i for i, k in enumerate(datas) if (data_ult - k).days <= 7]
    delta = float(filt[-1] - filt[j[0]]) if j else 0.0
    if delta > 12:
        fase = "subindo"
    elif delta < -12:
        fase = "baixando"
    elif pct >= 0.65:
        fase = "cheio"
    else:
        fase = "seco"
    return {
        "estacao": ESTACAO_ANA,
        "nome": "Aquidauana (ANA/SGB)",
        "cm": round(float(ultimo), 1),
        "data": data_ult.isoformat(),
        "variacao_7d_cm": round(delta, 1),
        "percentil_ano": round(pct, 3),
        "min_ano_cm": round(float(ano.min()), 1) if len(ano) else None,
        "max_ano_cm": round(float(ano.max()), 1) if len(ano) else None,
        "fase": fase,
        "serie_30d": [[k.isoformat(), round(float(v), 1)] for k, v in zip(datas, filt) if (data_ult - k).days <= 30],
    }


# ---------------------------------------------------------------- clima (instantâneo)
def clima_agora(lat, lon):
    url = ("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f"
           "&current=temperature_2m,relative_humidity_2m,precipitation,rain,cloud_cover,wind_speed_10m,wind_direction_10m,is_day,weather_code,surface_pressure"
           "&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=America%%2FCampo_Grande") % (lat, lon)
    try:
        d = get_json(url, timeout=60)
        return {"atual": d.get("current"), "chuva_7d_mm": round(float(sum(x or 0 for x in d["daily"]["precipitation_sum"][:-1])), 1)}
    except Exception as e:  # noqa: BLE001
        log("  Open-Meteo falhou", e)
        return None


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default=SAIDA_PADRAO)
    ap.add_argument("--cache", default=os.path.join(RAIZ, "ferramentas", "rios", "cache"))
    ap.add_argument("--sem-satelite", action="store_true", help="reaproveita o satélite anterior (testes)")
    args = ap.parse_args()
    os.makedirs(args.saida, exist_ok=True)
    os.makedirs(args.cache, exist_ok=True)
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
    os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "4")
    os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")
    os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF")

    to_utm = Transformer.from_crs("EPSG:4326", f"EPSG:{EPSG_UTM}", always_xy=True)
    to_ll = Transformer.from_crs(f"EPSG:{EPSG_UTM}", "EPSG:4326", always_xy=True)

    # 1) linha do rio (OSM), recortada da cidade até além do Pindó
    ll, ways = linha_do_rio(args.cache)
    E, N = to_utm.transform(ll[:, 1], ll[:, 0])
    P = np.stack([E, N], 1)
    s = abscissa(P)
    cE, cN = to_utm.transform(CIDADE[1], CIDADE[0])
    pE, pN = to_utm.transform(PINDO[1], PINDO[0])
    i_c = int(np.argmin(np.hypot(P[:, 0] - cE, P[:, 1] - cN)))
    i_p = int(np.argmin(np.hypot(P[:, 0] - pE, P[:, 1] - pN)))
    s_ini = s[i_c] - 1500  # começa rio acima da Ponte da Amizade, no meio da cidade
    s_fim = s[i_p] + KM_ALEM_DO_PINDO * 1000
    m = (s >= s_ini - 50) & (s <= s_fim + 50)
    L = reamostra(P[m], 20.0)
    log(f"trecho: {(s_fim - s_ini) / 1000:.1f} km de rio (cidade -> Pindó = {(s[i_p] - s[i_c]) / 1000:.1f} km)")

    # 2) grade UTM alinhada aos pixels de 20 m do Sentinel-2
    x0 = math.floor((L[:, 0].min() - MARGEM_M) / 20) * 20
    x1 = math.ceil((L[:, 0].max() + MARGEM_M) / 20) * 20
    y0 = math.floor((L[:, 1].min() - MARGEM_M) / 20) * 20
    y1 = math.ceil((L[:, 1].max() + MARGEM_M) / 20) * 20
    grade = {"bounds": (x0, y0, x1, y1), "w": int((x1 - x0) / CELULA), "h": int((y1 - y0) / CELULA)}
    W, H = grade["w"], grade["h"]
    log(f"grade {W}x{H} de {CELULA:.0f} m")

    def para_px(e, n):
        return (e - x0) / CELULA - 0.5, (y1 - n) / CELULA - 0.5

    # corredor: perto da linha do OSM
    lin = np.zeros((H, W), bool)
    Ld = reamostra(L, 5.0)
    cx, cy = para_px(Ld[:, 0], Ld[:, 1])
    ok = (cx >= 0) & (cx < W) & (cy >= 0) & (cy < H)
    lin[np.round(cy[ok]).astype(int), np.round(cx[ok]).astype(int)] = True
    dist_lin = ndimage.distance_transform_edt(~lin) * CELULA
    corredor = dist_lin < MARGEM_M - 100

    # 3) satélite
    lat_min, lon_min = to_ll.transform(x0, y0)[::-1]
    lat_max, lon_max = to_ll.transform(x1, y1)[::-1]
    bbox_ll = (lon_min, lat_min, lon_max, lat_max)
    cache_sat = os.path.join(args.cache, "satelite.npz")
    if args.sem_satelite and os.path.exists(cache_sat):
        z = np.load(cache_sat, allow_pickle=True)
        comp = {k: z[k] for k in ("blue", "green", "red", "nir", "swir16")}
        usadas = json.loads(str(z["usadas"]))
        cor_ch = {k: z["cor_" + k] for k in ("red", "green", "blue")}
        data_cor = str(z["data_cor"])
    else:
        cenas = busca_cenas(bbox_ll)
        log(f"Sentinel-2: {len(cenas)} cenas nos últimos {DIAS_STAC} dias")
        foco = corredor & (dist_lin < 400)  # o que importa de verdade: a água e as margens
        comp, origem, usadas, cor_ch, data_cor = compoe_satelite(cenas, grade, foco)
        np.savez_compressed(cache_sat, usadas=json.dumps(usadas), data_cor=data_cor, **comp,
                            **{"cor_" + k: v for k, v in cor_ch.items()})
    if not usadas:
        raise RuntimeError("nenhuma cena utilizável")
    log("cenas usadas:", ", ".join(f"{u['data']} ({100 * u['fracao_corredor']:.0f}%)" for u in usadas))

    G, NIR, SW, RED, BLU = (np.nan_to_num(comp[k], nan=0.0) for k in ("green", "nir", "swir16", "red", "blue"))
    valido = np.isfinite(comp["green"])
    ndwi = (G - NIR) / np.maximum(G + NIR, 1e-4)
    mndwi = (G - SW) / np.maximum(G + SW, 1e-4)
    ndvi = (NIR - RED) / np.maximum(NIR + RED, 1e-4)
    # água barrenta reflete bastante no vermelho/NIR: o MNDWI (SWIR) separa melhor que o NDWI
    agua_ind = np.maximum(ndwi + 0.08, mndwi - 0.05)
    agua_ind = ndimage.gaussian_filter(agua_ind, 0.6)
    # rio estreito e barrento debaixo das copas: pixels misturados com NDVI baixo, NIR e SWIR baixos
    # (a mata tem NIR ~0,3 e o pasto tem SWIR ~0,28)
    barrento = (ndvi < 0.32) & (SW < 0.095) & (NIR < 0.16)
    agua = ((agua_ind > 0.0) & (SW < 0.12) | barrento) & valido
    # só a água ligada ao rio (o canal) + lagoas grandes no corredor
    rot, nrot = ndimage.label(agua)
    tam = ndimage.sum(np.ones_like(rot), rot, index=np.arange(1, nrot + 1))
    toca = np.zeros(nrot + 1, bool)
    toca[np.unique(rot[lin & agua])] = True
    toca[0] = False
    manter = toca.copy()
    manter[1:] |= tam * CELULA * CELULA > 40000  # lagoas acima de 4 ha
    # lagoas que encostam no corredor entram inteiras (sem corte reto na borda do corredor)
    toca_c = np.zeros(nrot + 1, bool)
    toca_c[np.unique(rot[corredor & agua])] = True
    toca_c[0] = False
    agua = manter[rot] & toca_c[rot]
    # fecha furos (reflexo do sol, barcos) e tira pontes finas
    agua = ndimage.binary_closing(agua, iterations=1)
    furos = ndimage.binary_fill_holes(agua) & ~agua
    rf, nf = ndimage.label(furos)
    if nf:
        tf = ndimage.sum(np.ones_like(rf), rf, index=np.arange(1, nf + 1))
        agua |= np.concatenate([[False], tf <= 4])[rf]  # furos minúsculos; ilhas de verdade ficam
    # garante continuidade do canal ao longo da linha do OSM (pontes e sombras cortam a máscara)
    canal_min = dist_lin < 9
    agua_rio = agua | (canal_min & (agua_ind > -0.12))
    # banco de areia: solo claro e sem vegetação, colado na água do rio
    claro = (RED + G + BLU) / 3
    areia_raw = valido & ~agua_rio & (ndvi < 0.2) & (claro > 0.09) & (RED > G) & (dist_lin < 350)
    perto = ndimage.binary_dilation(agua_rio, iterations=3)
    areia = areia_raw & perto
    rot, nrot = ndimage.label(areia)
    if nrot:
        tam = ndimage.sum(np.ones_like(rot), rot, index=np.arange(1, nrot + 1))
        ok_t = np.concatenate([[False], tam >= 3])
        areia = ok_t[rot]
    log(f"água: {agua_rio.sum() * CELULA * CELULA / 1e6:.2f} km², areia: {areia.sum() * CELULA * CELULA / 1e4:.1f} ha")

    # 4) distância com sinal até a beira (m): <0 dentro d'água
    d_fora = ndimage.distance_transform_edt(~agua_rio) * CELULA
    d_dentro = ndimage.distance_transform_edt(agua_rio) * CELULA
    sdf = np.where(agua_rio, -(d_dentro - CELULA / 2), d_fora - CELULA / 2)
    sdf = ndimage.gaussian_filter(sdf, 0.7)

    # 5) linha central do canal atual: caminho mais barato pela água (Dijkstra) numa faixa em volta da
    #    linha do OSM. Assim ela segue o canal que o satélite vê hoje, e não o desenho antigo do OSM.
    def amostra(img, e, n):
        px, py = para_px(e, n)
        return ndimage.map_coordinates(img, [np.atleast_1d(py), np.atleast_1d(px)], order=1, mode="nearest")

    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra

    faixa = dist_lin < 400
    iy_f, ix_f = np.nonzero(faixa)
    idx = -np.ones((H, W), np.int64)
    idx[iy_f, ix_f] = np.arange(len(iy_f))
    # custo por pixel: barato no meio da água, caro em terra (atravessar terra só onde não tem jeito)
    custo = np.where(sdf < 0, 1.0 + 6.0 * np.exp(sdf / 5.0), 400.0 + 20.0 * sdf)
    ii, jj, ww = [], [], []
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        y2, x2 = iy_f + dy, ix_f + dx
        ok = (y2 >= 0) & (y2 < H) & (x2 >= 0) & (x2 < W)
        y1_, x1_, y2, x2 = iy_f[ok], ix_f[ok], y2[ok], x2[ok]
        j2 = idx[y2, x2]
        ok2 = j2 >= 0
        passo = math.hypot(dx, dy)
        ii.append(idx[y1_[ok2], x1_[ok2]])
        jj.append(j2[ok2])
        ww.append(0.5 * (custo[y1_[ok2], x1_[ok2]] + custo[y2[ok2], x2[ok2]]) * passo)
    ii, jj, ww = np.concatenate(ii), np.concatenate(jj), np.concatenate(ww)
    grafo = coo_matrix((np.concatenate([ww, ww]), (np.concatenate([ii, jj]), np.concatenate([jj, ii]))), shape=(len(iy_f),) * 2).tocsr()

    def no_mais_perto(e, n):
        px, py = para_px(e, n)
        d = np.hypot(ix_f - px, iy_f - py) + np.where(sdf[iy_f, ix_f] < 0, 0, 30)
        return int(np.argmin(d))

    n_ini = no_mais_perto(*L[0])
    n_fim = no_mais_perto(*L[-1])
    _, pred = dijkstra(grafo, indices=n_ini, return_predecessors=True)
    cam = [n_fim]
    while cam[-1] != n_ini and pred[cam[-1]] >= 0:
        cam.append(pred[cam[-1]])
    cam = cam[::-1]
    cy_, cx_ = iy_f[cam], ix_f[cam]
    cen = np.stack([x0 + (cx_ + 0.5) * CELULA, y1 - (cy_ + 0.5) * CELULA], 1).astype(np.float64)
    cen = suaviza(reamostra(cen, 10.0), 3)
    T = np.gradient(cen, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-6)
    Nrm = np.stack([-T[:, 1], T[:, 0]], 1)
    offs = np.arange(-200, 201, 5.0)
    larg = np.zeros(len(cen))
    for i in range(len(cen)):
        v = amostra(sdf, cen[i, 0] + Nrm[i, 0] * offs, cen[i, 1] + Nrm[i, 1] * offs)
        dentro = v < 0
        k = len(offs) // 2
        a_ = b_ = k
        while a_ > 0 and dentro[a_ - 1]:
            a_ -= 1
        while b_ < len(offs) - 1 and dentro[b_ + 1]:
            b_ += 1
        larg[i] = (offs[b_] - offs[a_] + 5.0) if dentro[k] else 8.0
    cen = suaviza(reamostra(cen, 20.0), 2)
    sc = abscissa(cen)
    larg = np.interp(np.linspace(0, 1, len(cen)), np.linspace(0, 1, len(larg)), ndimage.median_filter(larg, 9))
    larg = np.clip(larg, 10, 400)
    # garante um canal navegável contínuo ao longo da linha central (copas, pontes e sombras cortam a
    # máscara de água em alguns pontos): pelo menos 22 m de largura
    marca_c = np.zeros((H, W), bool)
    cd = reamostra(cen, 4.0)
    qx, qy = para_px(cd[:, 0], cd[:, 1])
    okc = (qx >= 0) & (qx < W) & (qy >= 0) & (qy < H)
    marca_c[np.round(qy[okc]).astype(int), np.round(qx[okc]).astype(int)] = True
    d_cen = ndimage.distance_transform_edt(~marca_c) * CELULA
    cortes = int(((amostra(sdf, cd[:, 0], cd[:, 1]) > -4)).sum())
    sdf = np.minimum(sdf, d_cen - 11.0)
    agua_rio |= d_cen < 11.0
    log(f"canal garantido: {cortes} pontos (de {len(cd)}) estavam fechados na máscara do satélite")
    log(f"largura do canal: mediana {np.median(larg):.0f} m (p10 {np.percentile(larg, 10):.0f}, p90 {np.percentile(larg, 90):.0f})")

    # 6) relevo relativo ao rio
    try:
        dem = relevo(grade, to_ll)
        # superfície do rio: mínimo do DEM perto do canal, suavizado ao longo da linha e propagado
        cx, cy = para_px(cen[:, 0], cen[:, 1])
        h_canal = ndimage.map_coordinates(ndimage.minimum_filter(dem, 7), [cy, cx], order=1, mode="nearest")
        h_canal = np.minimum.accumulate(ndimage.median_filter(h_canal, 31))  # o rio só desce
        idx_lin = np.zeros((H, W), np.int32)
        marca = np.zeros((H, W), bool)
        ix = np.clip(np.round(cx).astype(int), 0, W - 1)
        iy = np.clip(np.round(cy).astype(int), 0, H - 1)
        marca[iy, ix] = True
        idx_lin[iy, ix] = np.arange(len(cen))
        _, (ny_, nx_) = ndimage.distance_transform_edt(~marca, return_indices=True)
        base = h_canal[idx_lin[ny_, nx_]]
        rel = ndimage.gaussian_filter(dem - base, 1.2)
        rel = np.clip(rel, 0, 25.5)
        relevo_ok = True
    except Exception as e:  # noqa: BLE001
        log("  relevo indisponível:", e)
        rel = np.zeros((H, W), np.float32)
        relevo_ok = False

    # 7) nível e clima
    nivel = None
    try:
        nivel = nivel_ana()
    except Exception as e:  # noqa: BLE001
        log("  ANA falhou:", e)
    log("nível ANA:", {k: v for k, v in (nivel or {}).items() if k != "serie_30d"})
    meio = cen[len(cen) // 2]
    mlon, mlat = to_ll.transform(*meio)
    clima = clima_agora(mlat, mlon)

    # cor da água no canal (centro do rio, longe das margens)
    nucleo = agua_rio & (sdf < -15)
    if nucleo.sum() < 50:
        nucleo = agua_rio
    cor_agua = [float(np.median(c[nucleo])) for c in (RED, G, BLU)]
    turbidez = float(np.median(RED[nucleo]) / max(1e-4, np.median(BLU[nucleo])))

    # 8) imagens
    def u8(v):
        return np.clip(np.round(v), 0, 255).astype(np.uint8)

    R_ = u8(128 + sdf / 0.75)
    G_ = u8(ndimage.gaussian_filter(areia.astype(np.float32), 0.6) * 255)
    B_ = u8(rel * 10)
    # RGB sem alfa: o canvas do navegador perde a cor onde o alfa é zero (alfa pré-multiplicado)
    Image.fromarray(np.stack([R_, G_, B_], -1), "RGB").save(os.path.join(args.saida, "campo.png"), optimize=True)

    def tom(v):
        return np.clip((np.nan_to_num(v, nan=0.06) / 0.20) ** (1 / 2.2), 0, 1) * 255

    falta = ~np.isfinite(cor_ch["red"])
    if falta.any() and (~falta).any():
        _, (iy_, ix_) = ndimage.distance_transform_edt(falta, return_indices=True)
        for k in cor_ch:
            cor_ch[k] = np.nan_to_num(cor_ch[k][iy_, ix_], nan=0.06)
    rgb = np.stack([tom(cor_ch["red"]), tom(cor_ch["green"]), tom(cor_ch["blue"])], -1).astype(np.uint8)
    im = Image.fromarray(rgb, "RGB")
    im.save(os.path.join(args.saida, "cor.webp"), "WEBP", quality=70, method=6)
    # imagem de conferência (máscara sobre a cor), fica só no cache
    conf = rgb.copy()
    conf[agua_rio] = (conf[agua_rio] * 0.4 + np.array([0, 90, 255]) * 0.6).astype(np.uint8)
    conf[areia] = [255, 220, 40]
    Image.fromarray(conf).save(os.path.join(args.cache, "conferencia.png"))

    # 9) georreferência: UTM <-> lat/lon por ajuste afim no trecho (erro < 1 m), e o centro local
    E0 = round((x0 + x1) / 2 / 10) * 10
    N0 = round((y0 + y1) / 2 / 10) * 10
    gx = np.linspace(x0, x1, 15)
    gy = np.linspace(y0, y1, 15)
    GX, GY = np.meshgrid(gx, gy)
    LON, LAT = to_ll.transform(GX, GY)
    # coordenadas do jogo em km: x = (E - E0), z = -(N - N0)
    xk, zk = (GX.ravel() - E0) / 1000, -(GY.ravel() - N0) / 1000

    def base2(u, v):
        return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], 1)

    lon0, lat0 = float(LON.mean()), float(LAT.mean())
    A = base2(xk, zk)
    c_lon = np.linalg.lstsq(A, LON.ravel() - lon0, rcond=None)[0]
    c_lat = np.linalg.lstsq(A, LAT.ravel() - lat0, rcond=None)[0]
    du, dv = (LON.ravel() - lon0) * 100, (LAT.ravel() - lat0) * 100
    B = base2(du, dv)
    c_x = np.linalg.lstsq(B, xk * 1000, rcond=None)[0]
    c_z = np.linalg.lstsq(B, zk * 1000, rcond=None)[0]
    err = np.max(np.hypot(B @ c_x - xk * 1000, B @ c_z - zk * 1000))
    elon = np.max(np.abs(A @ c_lon - (LON.ravel() - lon0))) * 111000
    log(f"ajuste lat/lon quadrático: erro máx {err:.2f} m (ida) / {elon:.2f} m (volta)")

    # coordenadas do jogo: x = E - E0 (leste), z = -(N - N0) (norte = -Z)
    def jogo(e, n):
        return [round(float(e - E0), 1), round(float(-(n - N0)), 1)]

    pontos = []
    for nome, la, lo, tipo, desc in PONTOS_EXTRA:
        e, n = to_utm.transform(lo, la)
        k = int(np.argmin(np.hypot(cen[:, 0] - e, cen[:, 1] - n)))
        pontos.append({"nome": nome, "tipo": tipo, "lat": la, "lon": lo, "xz": jogo(e, n), "s": round(float(sc[k]), 1), "desc": desc})
    # cidade: ponto do rio mais perto do centro de Aquidauana
    k = int(np.argmin(np.hypot(cen[:, 0] - cE, cen[:, 1] - cN)))
    lo, la = to_ll.transform(*cen[k])
    pontos.insert(0, {"nome": "Aquidauana", "tipo": "cidade", "lat": round(la, 6), "lon": round(lo, 6), "xz": jogo(*cen[k]), "s": round(float(sc[k]), 1),
                      "desc": "Cidade de Aquidauana: saída do passeio"})
    # nomes do OSM perto do rio (fazendas, lugares, pesqueiros) e lagoas grandes
    feicoes = feicoes_osm(args.cache, bbox_ll)
    lagoas = []
    for el in feicoes:
        tags = el.get("tags", {})
        if el["type"] == "node" and tags.get("name"):
            e, n = to_utm.transform(el["lon"], el["lat"])
            dmin = float(np.min(np.hypot(cen[:, 0] - e, cen[:, 1] - n)))
            if dmin < 2500 and not any(p["nome"] == tags["name"] for p in pontos):
                k = int(np.argmin(np.hypot(cen[:, 0] - e, cen[:, 1] - n)))
                pontos.append({"nome": tags["name"], "tipo": tags.get("place") or tags.get("tourism") or tags.get("leisure") or "lugar",
                               "lat": el["lat"], "lon": el["lon"], "xz": jogo(e, n), "s": round(float(sc[k]), 1), "dist_rio": round(dmin)})
        elif el["type"] == "way" and tags.get("natural") == "water" and tags.get("name") and tags["name"] != "Rio Aquidauana":
            g = np.array([(p["lon"], p["lat"]) for p in el["geometry"]])
            e, n = to_utm.transform(g[:, 0].mean(), g[:, 1].mean())
            lagoas.append({"nome": tags["name"], "xz": jogo(e, n)})
    pontos.sort(key=lambda p: p["s"])

    # nível -> parâmetros do jogo
    fase = (nivel or {}).get("fase")
    pct = (nivel or {}).get("percentil_ano", 0.4)
    agora = dt.datetime.now(dt.timezone.utc)
    pacote = {
        "versao": 1,
        "rio": "Rio Aquidauana",
        "trecho": "Aquidauana (MS) até %.0f km abaixo do Pindó" % KM_ALEM_DO_PINDO,
        "gerado_em": agora.isoformat(timespec="seconds"),
        "satelite": {
            "fonte": "Copernicus Sentinel-2 L2A (Element84 Earth Search / AWS)",
            "cenas": usadas,
            "data_principal": usadas[0]["data"],
            "data_cor_do_chao": data_cor,
            "data_mais_antiga": min(u["data"] for u in usadas),
            "agua_km2": round(float(agua_rio.sum()) * CELULA * CELULA / 1e6, 3),
            "areia_ha": round(float(areia.sum()) * CELULA * CELULA / 1e4, 1),
            "cor_agua_rgb": [round(c, 4) for c in cor_agua],
            "razao_vermelho_azul": round(turbidez, 3),
        },
        "nivel": nivel,
        "fase_rio": fase or "seco",
        "percentil_nivel": pct,
        "clima_no_pacote": clima,
        "geo": {
            "epsg": EPSG_UTM, "E0": E0, "N0": N0, "celula": CELULA,
            "grade": {"x0": x0 - E0, "z0": -(y1 - N0), "w": W, "h": H},  # canto noroeste em coordenadas do jogo
            # polinômio de 2º grau em [1, u, v, u², uv, v²]
            "lonlat_de_xz": {"lon0": lon0, "lat0": lat0, "escala_xz": 0.001, "lon": [float(c) for c in c_lon], "lat": [float(c) for c in c_lat]},
            "xz_de_lonlat": {"lon0": lon0, "lat0": lat0, "escala_ll": 100.0, "x": [float(c) for c in c_x], "z": [float(c) for c in c_z]},
        },
        "campo": {"arquivo": "campo.png", "sdf_m_por_unidade": 0.75, "relevo_m_por_unidade": 0.1, "relevo_ok": relevo_ok},
        "cor": {"arquivo": "cor.webp", "celula": CELULA},
        "linha": {
            "passo_m": 20,
            "comprimento_m": round(float(sc[-1]), 1),
            # [x, z, largura]
            "pontos": [[round(float(p[0] - E0), 1), round(float(-(p[1] - N0)), 1), round(float(w), 1)] for p, w in zip(cen, larg)],
        },
        "pontos": pontos,
        "lagoas": lagoas,
        "osm_ways": ways,
        "creditos": [
            "© OpenStreetMap contributors (ODbL)",
            "Contém dados modificados do Copernicus Sentinel %s" % usadas[0]["data"][:4],
            "Relevo: Terrain Tiles (Mapzen/AWS Open Data, SRTM)",
            "Nível: ANA — Agência Nacional de Águas e Saneamento Básico (estação %s)" % ESTACAO_ANA,
            "Clima: Open-Meteo.com (CC BY 4.0)",
        ],
    }
    with open(os.path.join(args.saida, "rio.json"), "w", encoding="utf-8") as f:
        json.dump(pacote, f, ensure_ascii=False, separators=(",", ":"))
    tam = sum(os.path.getsize(os.path.join(args.saida, a)) for a in ("rio.json", "campo.png", "cor.webp"))
    log(f"ok: {args.saida} ({tam / 1e6:.2f} MB)")


if __name__ == "__main__":
    sys.exit(main())
