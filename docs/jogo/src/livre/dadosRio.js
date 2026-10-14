// [livre] Dados de um rio do modo livre (gerados por ferramentas/rios/*.py e atualizados todo dia):
// rio.json (linha central, pontos de interesse, datas, nível, georreferência), campo.png (distância até a
// beira d'água, bancos de areia e relevo numa grade de 10 m) e cor.webp (cor verdadeira do Sentinel-2).
//
// Coordenadas "do rio" (d): metros, x para o leste e z para o sul (norte = −Z), origem no meio do trecho.
// O mundo 3D usa essas mesmas coordenadas giradas/deslocadas (ver mundoRio.js).

const BASE = new URL("../../assets/rios/", import.meta.url);

// a água do satélite fica um pouco mais estreita que a real: as copas da mata ciliar cobrem a beira
const ALARGA_M = 2.5;

async function pixels(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const blob = await r.blob();
  let bmp;
  try {
    bmp = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  } catch {
    bmp = await createImageBitmap(blob);
  }
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  const img = g.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close?.();
  return { w: img.width, h: img.height, d: img.data, canvas: c };
}

function poli(c, u, v) {
  return c[0] + c[1] * u + c[2] * v + c[3] * u * u + c[4] * u * v + c[5] * v * v;
}

export class DadosRio {
  constructor(id) {
    this.id = id;
    this.pasta = new URL(`${id}/`, BASE);
    this.meta = null;
    this.pronto = false;
  }

  /** Só o rio.json (para mostrar datas e nível na escolha do rio). */
  async carregarMeta() {
    if (this.meta) return this.meta;
    const r = await fetch(new URL("rio.json", this.pasta), { cache: "no-cache" });
    if (!r.ok) throw new Error(`rio.json: HTTP ${r.status}`);
    this.meta = await r.json();
    return this.meta;
  }

  async carregar() {
    if (this.pronto) return this;
    const m = await this.carregarMeta();
    const v = encodeURIComponent(m.gerado_em || "");
    const [campo, cor] = await Promise.all([
      pixels(new URL(`${m.campo.arquivo}?v=${v}`, this.pasta).href),
      pixels(new URL(`${m.cor.arquivo}?v=${v}`, this.pasta).href),
    ]);
    this.campo = campo;
    this.cor = cor;
    const g = m.geo.grade;
    this.gx0 = g.x0;
    this.gz0 = g.z0;
    this.cel = m.geo.celula;
    this.W = g.w;
    this.H = g.h;
    this.escSdf = m.campo.sdf_m_por_unidade;
    this.escRel = m.campo.relevo_m_por_unidade;
    this.celCor = m.cor.celula;
    // linha central
    const P = m.linha.pontos;
    const n = P.length;
    this.lx = new Float32Array(n);
    this.lz = new Float32Array(n);
    this.lw = new Float32Array(n);
    this.ls = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.lx[i] = P[i][0];
      this.lz[i] = P[i][1];
      this.lw[i] = P[i][2];
      if (i) this.ls[i] = this.ls[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    }
    this.comprimento = this.ls[n - 1];
    this.pronto = true;
    return this;
  }

  // ---------- amostragem da grade ----------

  _bil(arr, w, h, canal, px, pz, fora) {
    if (px < 0 || pz < 0 || px > w - 1 || pz > h - 1) return fora;
    const x0 = Math.floor(px), z0 = Math.floor(pz);
    const x1 = Math.min(x0 + 1, w - 1), z1 = Math.min(z0 + 1, h - 1);
    const fx = px - x0, fz = pz - z0;
    const a = arr[(z0 * w + x0) * 4 + canal], b = arr[(z0 * w + x1) * 4 + canal];
    const c = arr[(z1 * w + x0) * 4 + canal], d = arr[(z1 * w + x1) * 4 + canal];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }

  /** Distância com sinal até a beira (m): negativo dentro d'água. Fora da grade é terra. */
  sdf(x, z) {
    const v = this._bil(this.campo.d, this.W, this.H, 0, (x - this.gx0) / this.cel - 0.5, (z - this.gz0) / this.cel - 0.5, 255);
    return (v - 128) * this.escSdf - ALARGA_M;
  }

  /** 0..1: banco de areia exposto (do satélite). */
  areia(x, z) {
    return this._bil(this.campo.d, this.W, this.H, 1, (x - this.gx0) / this.cel - 0.5, (z - this.gz0) / this.cel - 0.5, 0) / 255;
  }

  /** Relevo (m) acima do nível do rio, do modelo digital de elevação (já suavizado). */
  relevo(x, z) {
    return this._bil(this.campo.d, this.W, this.H, 2, (x - this.gx0) / this.cel - 0.5, (z - this.gz0) / this.cel - 0.5, 20) * this.escRel;
  }

  /** Cor do satélite (0..1, sRGB) no ponto; escreve em out [r, g, b]. */
  corEm(x, z, out) {
    const px = (x - this.gx0) / this.celCor - 0.5, pz = (z - this.gz0) / this.celCor - 0.5;
    const d = this.cor.d, w = this.cor.w, h = this.cor.h;
    out[0] = this._bil(d, w, h, 0, px, pz, 90) / 255;
    out[1] = this._bil(d, w, h, 1, px, pz, 110) / 255;
    out[2] = this._bil(d, w, h, 2, px, pz, 70) / 255;
    return out;
  }

  /** Gradiente da distância (aponta para a terra). */
  gradSdf(x, z, out) {
    const e = 3;
    out[0] = (this.sdf(x + e, z) - this.sdf(x - e, z)) / (2 * e);
    out[1] = (this.sdf(x, z + e) - this.sdf(x, z - e)) / (2 * e);
    return out;
  }

  dentroDaGrade(x, z, margem = 0) {
    return x > this.gx0 + margem && z > this.gz0 + margem && x < this.gx0 + this.W * this.cel - margem && z < this.gz0 + this.H * this.cel - margem;
  }

  // ---------- linha central ----------

  /** Ponto da linha central mais perto de (x, z). `dica` acelera a busca (índice anterior). */
  maisPerto(x, z, dica = -1) {
    const n = this.lx.length;
    let i0 = 0, i1 = n;
    if (dica >= 0) {
      i0 = Math.max(0, dica - 60);
      i1 = Math.min(n, dica + 60);
    }
    let best = 1e18, bi = 0;
    for (let i = i0; i < i1; i++) {
      const dx = this.lx[i] - x, dz = this.lz[i] - z;
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        bi = i;
      }
    }
    // a busca local pode prender num meandro vizinho: se ficou longe, refaz em tudo
    if (dica >= 0 && best > 250 * 250) return this.maisPerto(x, z, -1);
    const j = Math.min(n - 1, bi + 1), k = Math.max(0, bi - 1);
    let tx = this.lx[j] - this.lx[k], tz = this.lz[j] - this.lz[k];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    return { i: bi, s: this.ls[bi], x: this.lx[bi], z: this.lz[bi], largura: this.lw[bi], tx, tz, dist: Math.sqrt(best) };
  }

  /** Ponto e tangente (sentido da correnteza) a `s` metros do começo do trecho. */
  emS(s) {
    const n = this.lx.length;
    s = Math.max(0, Math.min(this.comprimento, s));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.ls[m] <= s) lo = m;
      else hi = m;
    }
    const f = (s - this.ls[lo]) / Math.max(1e-6, this.ls[hi] - this.ls[lo]);
    const x = this.lx[lo] + (this.lx[hi] - this.lx[lo]) * f;
    const z = this.lz[lo] + (this.lz[hi] - this.lz[lo]) * f;
    let tx = this.lx[hi] - this.lx[lo], tz = this.lz[hi] - this.lz[lo];
    const l = Math.hypot(tx, tz) || 1;
    return { x, z, tx: tx / l, tz: tz / l, i: lo };
  }

  // ---------- geografia ----------

  lonLat(x, z) {
    const g = this.meta.geo.lonlat_de_xz;
    const u = x * g.escala_xz, v = z * g.escala_xz;
    return { lon: g.lon0 + poli(g.lon, u, v), lat: g.lat0 + poli(g.lat, u, v) };
  }

  xz(lon, lat) {
    const g = this.meta.geo.xz_de_lonlat;
    const u = (lon - g.lon0) * g.escala_ll, v = (lat - g.lat0) * g.escala_ll;
    return { x: poli(g.x, u, v), z: poli(g.z, u, v) };
  }
}
