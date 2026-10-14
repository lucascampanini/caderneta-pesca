// [livre] Clima e hora reais do ponto do rio. Clima: Open-Meteo (CC BY 4.0, CORS liberado, sem chave),
// atualizado a cada 10 minutos. Hora: relógio local de Mato Grosso do Sul (America/Campo_Grande).
// Sem internet, usa o clima gravado no pacote diário do rio.

const FUSO = "America/Campo_Grande";
const ATUALIZA_MS = 10 * 60 * 1000;

const fmtHora = (() => {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  } catch {
    return null;
  }
})();
const fmtData = (() => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return null;
  }
})();

/** Hora local de MS (0..24, fracionária). */
export function horaLocal(agora = new Date()) {
  if (fmtHora) {
    const p = Object.fromEntries(fmtHora.formatToParts(agora).map((x) => [x.type, x.value]));
    return (+p.hour % 24) + +p.minute / 60 + +p.second / 3600;
  }
  // sem Intl: MS está em UTC−4 (sem horário de verão desde 2019)
  const h = agora.getUTCHours() - 4 + agora.getUTCMinutes() / 60;
  return (h + 24) % 24;
}

/** Data local de MS: { ano, mes (1..12), dia }. */
export function dataLocal(agora = new Date()) {
  if (fmtData) {
    const [ano, mes, dia] = fmtData.format(agora).split("-").map(Number);
    return { ano, mes, dia };
  }
  const d = new Date(agora.getTime() - 4 * 3600e3);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

const CHUVA_WMO = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const DESCRICAO_WMO = {
  0: "Céu limpo", 1: "Quase limpo", 2: "Parcialmente nublado", 3: "Nublado", 45: "Neblina", 48: "Neblina",
  51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte", 61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  80: "Pancadas de chuva", 81: "Pancadas de chuva", 82: "Temporal", 95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada com granizo",
};

export class ClimaAoVivo {
  constructor(lat, lon, reserva = null) {
    this.lat = lat;
    this.lon = lon;
    this.dados = null; // último "current" do Open-Meteo
    this.pressao = []; // pressão das últimas horas (hPa)
    this.fonte = "nenhuma";
    this.atualizadoEm = 0;
    this._timer = null;
    if (reserva?.atual) {
      this.dados = reserva.atual;
      this.fonte = "pacote";
    }
  }

  iniciar() {
    this.parar();
    this.buscar();
    this._timer = setInterval(() => this.buscar(), ATUALIZA_MS);
  }

  parar() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  async buscar() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat.toFixed(4)}&longitude=${this.lon.toFixed(4)}` +
      "&current=temperature_2m,relative_humidity_2m,precipitation,rain,cloud_cover,wind_speed_10m,wind_direction_10m,is_day,weather_code,surface_pressure" +
      "&hourly=surface_pressure&past_days=1&forecast_days=1&timezone=America%2FCampo_Grande";
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12000);
      const r = await fetch(url, { signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      this.dados = d.current;
      // pressão até a hora atual
      const agora = d.current?.time;
      const hs = d.hourly?.time || [];
      const ps = d.hourly?.surface_pressure || [];
      this.pressao = hs.map((h, i) => [h, ps[i]]).filter(([h, p]) => p != null && (!agora || h <= agora)).map(([, p]) => p);
      this.fonte = "ao vivo";
      this.atualizadoEm = Date.now();
    } catch (e) {
      console.warn("[livre] clima ao vivo indisponível, usando o do pacote", e?.message || e);
    }
  }

  /** Resumo para o jogo. */
  get estado() {
    const c = this.dados || {};
    const nuvem = (c.cloud_cover ?? 30) / 100;
    const chuvaMm = Math.max(c.precipitation ?? 0, c.rain ?? 0);
    const chovendo = chuvaMm > 0.05 || CHUVA_WMO.has(c.weather_code);
    const vento = c.wind_speed_10m ?? 6; // km/h
    const ventoDir = c.wind_direction_10m ?? 0; // de onde vem, graus
    const temp = c.temperature_2m ?? 26;
    // frente fria: pressão caindo com vento norte (pré) ou subindo com vento sul e frio (pós)
    const p = this.pressao;
    const queda6 = p.length > 6 ? p[p.length - 7] - p[p.length - 1] : 0;
    const sobe12 = p.length > 12 ? p[p.length - 1] - p[p.length - 13] : 0;
    const norte = ventoDir >= 300 || ventoDir <= 60;
    const sul = ventoDir >= 120 && ventoDir <= 240;
    let condicao = "sol";
    if (chovendo) condicao = "chuva";
    else if (queda6 >= 1.5 && norte) condicao = "pre";
    else if (sobe12 >= 2 && sul && temp < 24) condicao = "pos";
    else if (nuvem >= 0.6) condicao = "nublado";
    return {
      nuvem,
      chovendo,
      chuva: chovendo ? Math.min(1, 0.25 + chuvaMm / 4) : 0,
      vento,
      ventoDir,
      temp,
      umidade: c.relative_humidity_2m ?? null,
      condicao,
      descricao: DESCRICAO_WMO[c.weather_code] || (chovendo ? "Chuva" : nuvem > 0.6 ? "Nublado" : "Tempo bom"),
      fonte: this.fonte,
      hora: c.time || null,
    };
  }
}
