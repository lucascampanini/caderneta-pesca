/* ===== Interface ===== */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const KEY_ST = 'caderneta.condicoes.v1', KEY_INV = 'caderneta.inventario.v1';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  const DEFAULT = { esp: 'pintado', agua: 'verde', nivel: 'baixando', temp: 'quente', clima: 'nublado', hora: 'entardecer', local: 'barco', variante: 'carretilha' };
  let st = Object.assign({}, DEFAULT, lsGet(KEY_ST) || {});
  if (!ESPECIES.some(e => e.id === st.esp)) st.esp = DEFAULT.esp;
  let view = 'pescar', peixeAberto = null, filtro = 'todos', catForm = 'vara';

  /* ---------- Fotos reais (recortes) quando publicadas junto do site ---------- */
  const FOTOS = window.FOTOS || {};
  const temFoto = (sp) => !!FOTOS[sp.id];
  function fishArt(sp, size) {
    if (!temFoto(sp)) return fishSVG(sp, size === 'card' ? { label: false } : undefined);
    const src = 'fotos/' + sp.id + (size === 'card' ? '-card' : '') + '.webp';
    return `<img class="fish-cut" src="${src}" alt="${sp.nome} (${sp.sci})" loading="lazy" decoding="async">`;
  }
  function creditoHTML(sp) {
    const c = FOTOS[sp.id];
    return c ? `<a href="${c.link}" target="_blank" rel="noopener">${c.txt}</a>` : '';
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800);
  }

  /* ---------- Inventário: conta (db) quando disponível, senão este aparelho ---------- */
  const Store = {
    items: lsGet(KEY_INV) || [], mode: 'local', ref: null, timer: null,
    saveLocal() { lsSet(KEY_INV, this.items); },
    async init() {
      try {
        if (!window.claude || typeof window.claude.use !== 'function') return;
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        const id = await user.id();
        if (!id) return;
        this.ref = db.collection('data/users/' + id).doc('inventario');
        const snap = await this.ref.get();
        if (snap.exists) {
          const d = snap.data();
          if (d && Array.isArray(d.itens)) { this.items = d.itens.map(x => Object.assign({}, x)); this.saveLocal(); }
        } else if (this.items.length) {
          await this.ref.set({ itens: this.items, atualizado: Date.now() });
        }
        this.mode = 'conta';
        onInv();
      } catch (e) { this.ref = null; this.mode = 'local'; onInv(); }
    },
    set(items) {
      this.items = items; this.saveLocal(); onInv();
      clearTimeout(this.timer);
      if (this.ref) this.timer = setTimeout(() => this.push(), 500);
    },
    async push() {
      try { await this.ref.set({ itens: this.items, atualizado: Date.now() }); }
      catch (e) { this.ref = null; this.mode = 'local'; onInv(); toast('Não deu para salvar na sua conta. O equipamento fica salvo neste aparelho.'); }
    }
  };
  function onInv() {
    if (view === 'equip') renderEquip();
    renderMatch();
  }

  /* ---------- Piracema ---------- */
  function piracema() {
    const now = new Date(), y = now.getFullYear();
    const leap = (yy) => (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0;
    const fimEsteAno = new Date(y, 1, leap(y) ? 29 : 28, 23, 59);
    const inicio = new Date(y, 10, 5);
    if (now <= fimEsteAno || now >= inicio) return { on: true, txt: 'Piracema em MS: pesca proibida nos rios até 28/02' };
    const dias = Math.ceil((inicio - now) / 86400000);
    return { on: false, dias, txt: 'Piracema em MS começa em ' + dias + (dias === 1 ? ' dia' : ' dias') + ' (5/11)' };
  }

  /* ---------- Abas ---------- */
  const ICONS = {
    pescar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v11a5 5 0 1 1-6-4.9"/><path d="M6 8.5 4.5 10"/></svg>',
    peixes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 12c3-5 9-6 14-3l5-3v12l-5-3c-5 3-11 2-14-3z"/><circle cx="7.5" cy="11" r=".8" fill="currentColor"/></svg>',
    montagens: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v6"/><ellipse cx="12" cy="10.5" rx="2" ry="2.8"/><path d="M12 13.5v4a3 3 0 1 0 3-3"/></svg>',
    nos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 15c4 0 6-9 10-9a4 4 0 0 1 0 8c-4 0-3-6 0-6"/><path d="M13 14c3 0 5 2 8 2"/></svg>',
    equip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18"/></svg>'
  };
  const TABS = [['pescar', 'Pescar agora'], ['peixes', 'Peixes'], ['montagens', 'Montagens'], ['nos', 'Nós'], ['equip', 'Meu equipamento']];
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([id, nome]) => `<button role="tab" id="tab-${id}" aria-selected="${view === id}" aria-controls="v-${id}" data-tab="${id}">${ICONS[id]}<span>${nome}</span></button>`).join('');
  }
  function go(id, opts) {
    view = id;
    TABS.forEach(([t]) => { $('#v-' + t).hidden = t !== id; });
    renderTabs();
    if (id === 'pescar') renderPescar();
    if (id === 'peixes') renderPeixes();
    if (id === 'montagens') renderMontagens();
    if (id === 'nos') renderNos();
    if (id === 'equip') renderEquip();
    if (location.hash !== '#' + id) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignorado */ } }
    if (opts && opts.scroll) { const el = document.getElementById(opts.scroll); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else window.scrollTo(0, 0);
  }

  /* ---------- Pescar agora ---------- */
  function chipGroup(key, titulo, lista, extra) {
    return `<fieldset class="group"><legend class="eyebrow">${titulo}</legend><div class="chips">` +
      lista.map(o => `<button type="button" class="chip" data-k="${key}" data-v="${o.id}" aria-pressed="${st[key] === o.id}">${o.sw ? `<i class="sw" style="background:${o.sw}"></i>` : ''}${o.nome}${o.dica && extra ? ` <small>${o.dica}</small>` : ''}</button>`).join('') +
      `</div></fieldset>`;
  }
  function renderControls() {
    $('#controls').innerHTML =
      `<div class="group"><span class="eyebrow">Peixe-alvo</span><div class="species-scroll" id="sp-scroll">` +
      ESPECIES.map(e => `<button type="button" class="sp-chip" data-k="esp" data-v="${e.id}" aria-pressed="${st.esp === e.id}">${fishArt(e, 'card')}<b>${e.nome}</b></button>`).join('') +
      `</div></div>` +
      chipGroup('agua', 'Cor da água', AGUAS) +
      chipGroup('nivel', 'Nível do rio', NIVEIS, true) +
      chipGroup('temp', 'Temperatura', TEMPS, true) +
      chipGroup('clima', 'Tempo', CLIMAS) +
      chipGroup('hora', 'Horário', HORAS) +
      chipGroup('local', 'De onde', LOCAIS) +
      chipGroup('variante', 'Equipamento', VARIANTES);
    const sel = $('#sp-scroll [aria-pressed="true"]'), sc = $('#sp-scroll');
    if (sel && sc) sc.scrollLeft = Math.max(0, sel.offsetLeft - sc.offsetLeft - sc.clientWidth / 2 + sel.clientWidth / 2);
  }
  function setCond(k, v) {
    st[k] = v; lsSet(KEY_ST, st);
    document.querySelectorAll(`#controls [data-k="${k}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
    renderResult();
  }

  let lastRec = null;
  function descSpec(spec) {
    const v = spec.vara;
    return fmtN(v.comp[0]) + '–' + fmtN(v.comp[1]) + ' m · ' + v.lb[0] + '–' + v.lb[1] + ' lb · ação ' + (v.acao === 'rapida' ? 'rápida' : 'moderada');
  }
  function specTable(spec, variante) {
    const rows = [
      ['Vara', descSpec(spec)],
      [variante === 'molinete' ? 'Molinete' : 'Carretilha', spec.reel.txt],
      ['Linha', spec.linha.txt],
      [spec.lider.tipo === 'aco' ? 'Empate' : 'Líder', spec.lider.txt]
    ];
    if (spec.anzol) rows.push(['Anzol', spec.anzol.txt]);
    if (spec.chumbada) rows.push(['Chumbada', spec.chumbada.txtAjustado || spec.chumbada.txt]);
    rows.push(['Nós', spec.nos.map(n => `<button class="linkbtn" data-no="${n}">${NOS.find(x => x.id === n).nome}</button>`).join(' + ')]);
    return `<table class="spec"><tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
  }
  const LEGENDA = `<div class="legend" aria-label="Legenda das linhas"><span><i style="background:var(--l1)"></i>Multifilamento</span><span><i style="background:var(--l2)"></i>Mono, fluorcarbono ou líder</span><span><i style="background:var(--metal)"></i>Aço e metal</span></div>`;

  function renderResult() {
    const r = recomenda(st), sp = r.sp;
    lastRec = r;
    const pira = piracema();
    const corIsca = r.cores ? CORES_ISCA[r.cores.lista[0]].sw : null;
    const cls = { 'Ótima': 'b-otima', 'Boa': 'b-boa', 'Média': 'b-media', 'Baixa': 'b-baixa' }[r.rotulo];
    const top = r.top;
    const html = [];
    if (pira.on) html.push(`<div class="panel" style="border-color:var(--bad);background:var(--bad-2)"><b>Período de piracema.</b> Em MS, de 5/11 a 28/02, toda pesca em rios é proibida, inclusive pesque e solte.</div>`);
    html.push(`<section class="panel hero" aria-labelledby="r-nome">
      <div class="art stage">${fishArt(sp)}</div>
      <div class="sec">
        <div><div class="eyebrow">${sp.grupo === 'couro' ? 'Peixe de couro' : 'Peixe de escama'}${sp.origem === 'exotica' ? ' · exótico em MS' : ''}</div>
        <h2 id="r-nome">${sp.nome}</h2><div class="sci">${sp.sci}</div></div>
        <div><span class="tag rule">${sp.regra}</span></div>
        <div class="meter"><div class="v"><span class="eyebrow">Índice de atividade</span><b>${r.rotulo}</b></div>
          <div class="bar ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.score}" aria-label="Índice de atividade"><i style="width:${r.score}%"></i></div>
          <ul class="fatores">${r.fatores.map(f => `<li class="${f.v < 0 ? 'neg' : ''}">${f.t}</li>`).join('')}</ul>
        </div>
      </div></section>`);
    html.push(`<section class="panel sec"><div class="eyebrow">Onde procurar hoje</div><p style="margin:0;font-size:17px">${r.onde}</p></section>`);

    // Isca
    const alts = r.alts.map((b, i) => `<div class="alt"><span class="n">${i + 2}</span><b>${b.nome} <span class="badge ${b.tipo === 'natural' ? 'nat' : ''}">${b.tipo}</span></b><span class="muted">${b.como}</span></div>`).join('');
    const sw = r.cores ? `<div class="sec" style="gap:6px"><div class="eyebrow">Cores para iscas artificiais</div><div class="swatches">${r.cores.lista.map(c => `<span class="swatch"><i style="background:${CORES_ISCA[c].sw}"></i>${CORES_ISCA[c].nome}</span>`).join('')}</div><p class="muted" style="margin:0;font-size:14px">${r.cores.pq}</p></div>` : '';
    html.push(`<div class="cols">
      <section class="panel sec bait"><div class="eyebrow">Isca principal</div>
        <div class="bait-main"><h3>${top.nome}</h3><span class="badge ${top.tipo === 'natural' ? 'nat' : ''}">${top.tipo === 'natural' ? 'isca natural' : 'isca artificial'}</span><p style="margin:6px 0 0">${top.como}</p></div>
        ${sw}
        ${alts ? `<div class="eyebrow">Alternativas</div><div class="alts">${alts}</div>` : ''}
      </section>
      <section class="panel sec"><div class="eyebrow">Ajustes do dia</div>
        ${r.notas.length ? `<ul class="notes">${r.notas.map(n => `<li>${n}</li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Condição padrão: siga a montagem abaixo.</p>'}
        <div class="eyebrow" style="margin-top:6px">Dicas para ${sp.nome.toLowerCase()}</div>
        <ul class="notes">${sp.dicas.map(d => `<li>${d}</li>`).join('')}</ul>
      </section></div>`);

    // Montagem
    html.push(`<section class="panel sec" aria-labelledby="r-mont"><div class="row" style="justify-content:space-between"><h2 id="r-mont">Montagem com ${st.variante}</h2><span class="tag">${r.perfil.nome}</span></div>
      <div class="rigbox"><div class="rig-wrap">${rigSVG(r.rigId, r.spec, top, st.variante, corIsca)}</div>
      <div class="sec">${specTable(r.spec, st.variante)}${LEGENDA}</div></div></section>`);
    html.push(`<section class="panel sec" id="match" aria-label="Com o seu equipamento"></section>`);
    $('#result').innerHTML = html.join('');
    renderMatch();
  }

  function descItem(i) {
    switch (i.cat) {
      case 'vara': return `${i.tipo === 'molinete' ? 'molinete' : 'carretilha'} · ${i.comp ? fmtN(i.comp) + ' m · ' : ''}${i.lbMin || '?'}–${i.lbMax || '?'} lb${i.acao ? ' · ' + ({ rapida: 'rápida', moderada: 'moderada', lenta: 'lenta' }[i.acao]) : ''}`;
      case 'carretilha': return `${i.perfil === 'redonda' ? 'redonda' : 'perfil baixo'} · tamanho ${i.tam || '?'}`;
      case 'molinete': return `tamanho ${i.tam || '?'}`;
      case 'linha': return `${{ multi: 'multifilamento', mono: 'monofilamento', fluor: 'fluorcarbono' }[i.tipo]} · ${i.unid === 'mm' ? fmtN(i.res) + ' mm (≈' + lbOf(i) + ' lb)' : i.res + ' lb'}`;
      case 'empate': return `aço · ${i.lb || '?'} lb`;
      case 'anzol': return `${{ circular: 'circular', maruseigo: 'maruseigo / chinu', offset: 'offset / wide gap', haste: 'haste longa', jcomum: 'comum' }[i.modelo] || ''} · ${i.min || '?'}${i.max ? ' a ' + i.max : ''}`;
      case 'chumbada': return `${i.tipo} · ${i.gMin || '?'}${i.gMax ? '–' + i.gMax : ''} g`;
      case 'isca': return `${ART_TIPOS[i.art] || ''} · ${CORES_ISCA[i.cor] ? CORES_ISCA[i.cor].nome : ''}${i.cm ? ' · ' + fmtN(i.cm) + ' cm' : ''}`;
      default: return '';
    }
  }

  function renderMatch() {
    const box = $('#match');
    if (!box || !lastRec) return;
    const inv = Store.items;
    if (!inv.length) {
      box.innerHTML = `<div class="eyebrow">Com o seu equipamento</div><div class="empty"><h3>Compare com o que você tem</h3><p class="muted" style="margin:0;max-width:46ch">Cadastre suas varas, carretilhas, linhas e iscas. O site mostra o melhor conjunto que você já tem para esta pescaria e o que falta comprar.</p><button class="btn" data-go="equip">Cadastrar meu equipamento</button></div>`;
      return;
    }
    const m = cruza(lastRec, inv);
    const sym = { ok: '✓', perto: '~', falta: '✕', info: 'i' };
    box.innerHTML = `<div class="eyebrow">Com o seu equipamento</div>
      <div class="match-head"><b>${m.pct}%</b><span class="muted">do conjunto indicado você já tem${m.pct >= 85 ? '. Pode ir pescar.' : m.pct >= 55 ? '. Dá para pescar com ajustes.' : '. Faltam peças importantes.'}</span></div>
      <ul class="comps">${m.comps.map(c => `<li class="comp"><span class="st ${c.status}" aria-label="${{ ok: 'tem', perto: 'serve com ajuste', falta: 'falta', info: 'informação' }[c.status]}">${sym[c.status]}</span>
        <div><b>${c.nome}:</b> ${c.tem ? esc(c.tem.nome || '') + ` <span class="muted">(${esc(descItem(c.tem))})</span>` : (c.status === 'info' ? esc(c.precisa) : '<span class="muted">não encontrado no seu equipamento</span>')}</div>
        <div class="need">Indicado: ${esc(c.precisa)}</div>
        ${c.nota || (c.buy && c.status !== 'ok') ? `<div>${c.nota ? `<span style="font-size:14px">${esc(c.nota)}</span>` : ''}${c.buy && c.status !== 'ok' ? `<div class="buy"><a href="${ML_URL(c.buy)}" target="_blank" rel="noopener">Ver no Mercado Livre</a><a href="${AMZ_URL(c.buy)}" target="_blank" rel="noopener">Ver na Amazon</a></div>` : ''}</div>` : ''}
      </li>`).join('')}</ul>`;
  }

  function renderPescar() {
    renderControls();
    renderResult();
  }

  /* ---------- Peixes ---------- */
  function renderPeixes() {
    const box = $('#v-peixes');
    if (peixeAberto) { box.innerHTML = detalhePeixe(ESPECIES.find(e => e.id === peixeAberto)); return; }
    const F = [['todos', 'Todos'], ['couro', 'Couro'], ['escama', 'Escama'], ['exotica', 'Exóticos em MS']];
    const lista = ESPECIES.filter(e => filtro === 'todos' || (filtro === 'exotica' ? e.origem === 'exotica' : e.grupo === filtro));
    box.innerHTML = `<div class="sec" style="margin-bottom:14px"><h2>Peixes do Pantanal e de MS</h2><p class="muted" style="margin:0">${ESPECIES.length} espécies com hábitos, iscas, equipamento e regras de captura.</p></div>
      <div class="chips filters">${F.map(([id, n]) => `<button class="chip" data-filtro="${id}" aria-pressed="${filtro === id}">${n}</button>`).join('')}</div>
      <div class="grid">${lista.map(e => `<button class="card" data-peixe="${e.id}"><div class="art stage">${fishArt(e, 'card')}</div><h3>${e.nome}</h3><div class="sci">${e.sci}</div><p>${e.resumo}</p></button>`).join('')}</div>`;
  }
  function perfilResumo(pk) {
    if (!pk) return '';
    const p = PERFIS[pk];
    return `<div class="sec" style="gap:6px"><b>${p.nome}</b>${['carretilha', 'molinete'].map(v => `<details${v === 'carretilha' ? ' open' : ''}><summary>Com ${v}</summary>${specTable(Object.assign({}, p[v], { chumbada: ajustaChumbada(p[v].chumbada, { nivel: 'baixando' }) }), v)}</details>`).join('')}</div>`;
  }
  function detalhePeixe(sp) {
    const maxH = 3;
    const bars = HORAS.map(h => `<div><i style="height:${Math.max(4, sp.h[h.id] / maxH * 100)}%" title="${h.nome}: ${['nenhuma', 'baixa', 'média', 'alta'][sp.h[h.id]]}"></i><span>${h.nome.split(' ')[0].slice(0, 5)}</span></div>`).join('');
    return `<div class="detail">
      <div><button class="btn ghost small" data-voltar>← Todos os peixes</button></div>
      <section class="panel hero">
        <div class="sec" style="gap:10px">
          <figure class="stage big" style="margin:0">${fishArt(sp)}${temFoto(sp) ? `<figcaption>${creditoHTML(sp)}</figcaption>` : `<figcaption>Ilustração. Ainda não há foto deste peixe com licença livre; veja os registros no iNaturalist.</figcaption>`}</figure>
          ${temFoto(sp) ? `<details class="orig"><summary>Ver a foto original</summary><figure class="photo" style="margin:0"><img src="fotos/${sp.id}.jpg" alt="Foto original de ${sp.nome}" loading="lazy"><figcaption>${creditoHTML(sp)}</figcaption></figure></details>` : ''}
        </div>
        <div class="sec">
          <div class="eyebrow">${sp.grupo === 'couro' ? 'Peixe de couro' : 'Peixe de escama'} · ${sp.origem === 'exotica' ? 'exótico em MS' : 'nativo'}</div>
          <h2>${sp.nome}</h2>
          <div class="sci">${sp.sci}${sp.outros ? ' · também chamado de ' + sp.outros : ''}</div>
          <div><span class="tag rule">${sp.regra}</span></div>
          <p style="margin:0;font-size:17px">${sp.resumo}</p>
          <p class="muted" style="margin:0">${sp.porte}</p>
          <div class="row"><a class="btn small" href="${FOTOS_URL(sp.sci)}" target="_blank" rel="noopener">Ver fotos reais</a><a class="btn ghost small" href="${INAT_URL(sp.sci)}" target="_blank" rel="noopener">Registros no iNaturalist</a><button class="btn ghost small" data-montar="${sp.id}">Montar para hoje</button></div>
        </div>
      </section>
      <div class="cols">
        <section class="panel sec"><div class="eyebrow">Onde vive</div><p style="margin:0">${sp.habitat}</p><div class="eyebrow">O que come</div><p style="margin:0">${sp.come}</p>
          <div class="eyebrow">Atividade por horário</div><div class="hbars" role="img" aria-label="Atividade por horário">${bars}</div></section>
        <section class="panel sec"><div class="eyebrow">Onde procurar conforme o nível do rio</div>
          <table class="nivtab"><tbody>${NIVEIS.map(n => `<tr><th scope="row">${n.nome}</th><td>${sp.onde[n.id]}</td></tr>`).join('')}</tbody></table></section>
      </div>
      <div class="cols">
        <section class="panel sec"><div class="eyebrow">Iscas</div><div class="alts">${sp.iscas.map((b, i) => `<div class="alt"><span class="n">${i + 1}</span><b>${b.nome} <span class="badge ${b.tipo === 'natural' ? 'nat' : ''}">${b.tipo}</span></b><span class="muted">${b.como}</span></div>`).join('')}</div></section>
        <section class="panel sec"><div class="eyebrow">Equipamento</div>${perfilResumo(sp.perfilNat)}${sp.perfilArt && sp.perfilArt !== sp.perfilNat ? perfilResumo(sp.perfilArt) : ''}</section>
      </div>
      <section class="panel sec"><div class="eyebrow">Dicas</div><ul class="notes">${sp.dicas.map(d => `<li>${d}</li>`).join('')}</ul></section>
    </div>`;
  }

  /* ---------- Montagens ---------- */
  function renderMontagens() {
    $('#v-montagens').innerHTML = `<div class="sec" style="margin-bottom:14px"><h2>Montagens</h2><p class="muted" style="margin:0;max-width:70ch">As oito montagens que cobrem as espécies deste guia, da ponta da vara até a isca. Medidas para carretilha; a versão com molinete aparece em Pescar agora.</p>${LEGENDA}</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))">${MONTAGENS.map(m => {
        const spec = Object.assign({}, PERFIS[m.perfil].carretilha);
        spec.chumbada = ajustaChumbada(spec.chumbada, { nivel: 'baixando' });
        return `<section class="panel sec" id="m-${m.id}"><h3 style="font-size:24px">${m.nome}</h3><p style="margin:0">${m.quando}</p>
          <div class="rig-wrap">${rigSVG(m.id, spec, m.isca, 'carretilha', '#d8a531')}</div>
          <p style="margin:0"><b>Ajuste:</b> ${m.ajuste}</p>
          <div class="chips">${m.especies.map(id => { const e = ESPECIES.find(x => x.id === id); return `<button class="chip" data-peixe="${id}">${e.nome}</button>`; }).join('')}</div></section>`;
      }).join('')}</div>`;
  }

  /* ---------- Nós ---------- */
  /* ---------- Nós: animações 3D com capítulos (quando publicadas), senão os desenhos ---------- */
  const NOS_VIDEO = window.NOS_VIDEO || {};
  const ICO = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function knotPlayer(n, tl) {
    const marks = tl.steps.map(st => `<i style="left:${(st.t0 / tl.duration * 100).toFixed(2)}%"></i>`).join('');
    return `<div class="kp" data-kp="${n.id}" data-dur="${tl.duration}">
        <div class="kp-stage"><video src="nos/${n.id}.mp4" poster="nos/${n.id}.jpg" muted playsinline preload="metadata" aria-label="Animação do nó ${n.nome}"></video>
          <button class="kp-big" data-kp-act="play" aria-label="Reproduzir a animação">${ICO.play}</button>
          <div class="kp-cap" aria-live="polite"></div></div>
        <div class="kp-bar">
          <button class="kp-btn" data-kp-act="prev" aria-label="Passo anterior">${ICO.prev}</button>
          <button class="kp-btn kp-pp" data-kp-act="play" aria-label="Reproduzir">${ICO.play}</button>
          <button class="kp-btn" data-kp-act="next" aria-label="Próximo passo">${ICO.next}</button>
          <div class="kp-track"><div class="kp-marks">${marks}</div><input type="range" min="0" max="${tl.duration}" step="0.01" value="0" aria-label="Arraste para avançar ou voltar a animação"></div>
          <button class="kp-btn kp-speed" data-kp-act="speed" aria-label="Velocidade">1×</button>
        </div>
        <ol class="kp-steps">${tl.steps.map((st, i) => `<li><button data-kp-step="${i}"><b>${i + 1}</b><span>${st.txt}</span></button></li>`).join('')}</ol>
      </div>`;
  }
  function renderNos() {
    const temVideo = NOS.some(n => NOS_VIDEO[n.id]);
    $('#v-nos').innerHTML = `<div class="sec" style="margin-bottom:14px"><h2>Nós</h2><p class="muted" style="margin:0;max-width:70ch">Seis nós resolvem quase todas as situações. ${temVideo ? 'Toque num passo para ver só aquele movimento, ou arraste a barra para ir e voltar no seu ritmo.' : ''} Molhe sempre antes de apertar e corte a sobra rente.</p>
      <div class="legend"><span><i style="background:var(--l1)"></i>Linha principal</span><span><i style="background:var(--l1b)"></i>Ponta (sobra) da linha</span><span><i style="background:var(--l2)"></i>Líder</span>${temVideo ? '' : '<span><i style="background:var(--accent)"></i>Próximo movimento</span>'}</div></div>
      <div class="knots">${NOS.map(n => `<section class="panel knot-card" id="no-${n.id}"><div class="row" style="justify-content:space-between"><h3 style="font-size:26px">${n.nome}</h3><a href="${YT_URL('nó ' + n.nome + ' pesca')}" target="_blank" rel="noopener">Ver no YouTube</a></div>
        <div class="row" style="gap:6px"><span class="tag">${n.uso}</span><span class="tag">Resistência: ${n.forca}</span><span class="tag">${n.linhas}</span></div>
        ${NOS_VIDEO[n.id] ? knotPlayer(n, NOS_VIDEO[n.id]) : `<div class="steps">${n.passos.map((p, i) => `<div class="step">${knotStep(n.id, i + 1)}<p>${p}</p></div>`).join('')}</div>`}</section>`).join('')}</div>`;
    document.querySelectorAll('#v-nos .kp').forEach(initKnotPlayer);
  }
  let kpObserver = null;
  function initKnotPlayer(root) {
    const id = root.dataset.kp, tl = NOS_VIDEO[id], v = $('video', root), rng = $('input[type=range]', root);
    const steps = [...root.querySelectorAll('[data-kp-step]')], cap = $('.kp-cap', root), pp = $('.kp-pp', root), big = $('.kp-big', root);
    let stopAt = null, raf = 0, cur = -1;
    const stepAt = (t) => { let k = -1; tl.steps.forEach((st, i) => { if (t >= st.t0 - 0.05) k = i; }); return k; };
    function paint() {
      const t = v.currentTime;
      rng.value = t;
      rng.style.setProperty('--p', (t / tl.duration * 100).toFixed(2) + '%');
      const k = stepAt(t);
      if (k !== cur) {
        cur = k;
        steps.forEach((b, i) => { b.classList.toggle('on', i === k); b.classList.toggle('done', i < k); });
        cap.textContent = k >= 0 ? (k + 1) + '. ' + tl.steps[k].txt : '';
        cap.classList.toggle('show', k >= 0);
      }
      if (stopAt !== null && t >= stopAt) { v.pause(); stopAt = null; }
    }
    function loop() { paint(); if (!v.paused) raf = requestAnimationFrame(loop); }
    function sync() {
      const playing = !v.paused && !v.ended;
      pp.innerHTML = playing ? ICO.pause : ICO.play;
      pp.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
      root.classList.toggle('playing', playing);
      big.hidden = playing || v.currentTime > 0.05;
    }
    v.addEventListener('play', () => { document.querySelectorAll('#v-nos video').forEach(o => { if (o !== v) o.pause(); }); sync(); cancelAnimationFrame(raf); loop(); });
    v.addEventListener('pause', () => { sync(); paint(); });
    v.addEventListener('ended', () => { sync(); paint(); });
    v.addEventListener('seeked', paint);
    v.addEventListener('loadedmetadata', paint);
    rng.addEventListener('input', () => { stopAt = null; v.pause(); v.currentTime = +rng.value; paint(); });
    const goStep = (i) => {
      i = Math.max(0, Math.min(tl.steps.length - 1, i));
      const st = tl.steps[i];
      v.currentTime = Math.max(0, st.t0 - 0.15); stopAt = st.t1 + 0.35;
      v.play().catch(() => {});
    };
    root.addEventListener('click', (ev) => {
      const sb = ev.target.closest('[data-kp-step]');
      if (sb) { goStep(+sb.dataset.kpStep); return; }
      const b = ev.target.closest('[data-kp-act]');
      if (!b) return;
      const act = b.dataset.kpAct;
      if (act === 'play') {
        if (v.paused) { stopAt = null; if (v.ended || v.currentTime >= tl.duration - 0.05) v.currentTime = 0; v.play().catch(() => {}); }
        else v.pause();
      } else if (act === 'next') goStep(cur + 1);
      else if (act === 'prev') goStep(v.currentTime - (tl.steps[Math.max(cur, 0)].t0) > 0.6 ? cur : cur - 1);
      else if (act === 'speed') { v.playbackRate = v.playbackRate === 1 ? 0.5 : 1; b.textContent = v.playbackRate === 1 ? '1×' : '½×'; }
    });
    if ('IntersectionObserver' in window) {
      kpObserver = kpObserver || new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) e.target.pause(); }), { threshold: 0.15 });
      kpObserver.observe(v);
    }
    sync(); paint();
  }

  /* ---------- Meu equipamento ---------- */
  const CATS = [
    { id: 'vara', nome: 'Varas', um: 'Vara', f: [['nome', 'Nome ou modelo', 'text', 'Ex.: Lumis Ibiza 1,80 m'], ['tipo', 'Para', 'sel', { carretilha: 'Carretilha', molinete: 'Molinete' }], ['comp', 'Comprimento (m)', 'num', '1,80'], ['lbMin', 'Libragem mín. (lb)', 'num', '12'], ['lbMax', 'Libragem máx. (lb)', 'num', '25'], ['acao', 'Ação', 'sel', { rapida: 'Rápida', moderada: 'Moderada', lenta: 'Lenta' }]] },
    { id: 'carretilha', nome: 'Carretilhas', um: 'Carretilha', f: [['nome', 'Nome ou modelo', 'text', 'Ex.: Abu Garcia Black Max'], ['perfil', 'Tipo', 'sel', { perfil: 'Perfil baixo', redonda: 'Redonda' }], ['tam', 'Tamanho', 'num', '150']] },
    { id: 'molinete', nome: 'Molinetes', um: 'Molinete', f: [['nome', 'Nome ou modelo', 'text', 'Ex.: Shimano FX 3000'], ['tam', 'Tamanho', 'num', '3000']] },
    { id: 'linha', nome: 'Linhas', um: 'Linha', f: [['nome', 'Nome ou marca', 'text', 'Ex.: Maruri Max Force 8X'], ['tipo', 'Tipo', 'sel', { multi: 'Multifilamento', mono: 'Monofilamento', fluor: 'Fluorcarbono' }], ['res', 'Resistência', 'num', '30'], ['unid', 'Unidade', 'sel', { lb: 'lb', mm: 'mm (diâmetro)' }]] },
    { id: 'empate', nome: 'Empates de aço', um: 'Empate', f: [['nome', 'Descrição', 'text', 'Ex.: Cabo flexível 25 cm'], ['lb', 'Resistência (lb)', 'num', '40']] },
    { id: 'anzol', nome: 'Anzóis', um: 'Anzol', f: [['nome', 'Descrição', 'text', 'Ex.: Circular Marine'], ['modelo', 'Modelo', 'sel', { circular: 'Circular', maruseigo: 'Maruseigo / chinu', offset: 'Offset / wide gap', haste: 'Haste longa', jcomum: 'Comum (J)' }], ['min', 'Menor tamanho', 'text', '2/0'], ['max', 'Maior tamanho', 'text', '6/0']] },
    { id: 'chumbada', nome: 'Chumbadas', um: 'Chumbada', f: [['nome', 'Descrição', 'text', 'Ex.: Oliva sortida'], ['tipo', 'Tipo', 'sel', { oliva: 'Oliva', pera: 'Pera / gota', chata: 'Chata', chumbinho: 'Chumbinho' }], ['gMin', 'Peso mín. (g)', 'num', '10'], ['gMax', 'Peso máx. (g)', 'num', '40']] },
    { id: 'isca', nome: 'Iscas artificiais', um: 'Isca', f: [['nome', 'Nome ou modelo', 'text', 'Ex.: Marine Sports Inna 90'], ['art', 'Tipo', 'sel', ART_TIPOS], ['cor', 'Cor', 'sel', Object.fromEntries(Object.entries(CORES_ISCA).map(([k, v]) => [k, v.nome]))], ['cm', 'Tamanho (cm)', 'num', '9']] }
  ];
  function renderEquip() {
    const inv = Store.items, cat = CATS.find(c => c.id === catForm);
    const salvo = Store.mode === 'conta' ? '<span class="save-state cloud">Salvo na sua conta</span>' : '<span class="save-state">Salvo neste aparelho</span>';
    const temEx = inv.some(i => i.exemplo);
    const lista = inv.length ? CATS.filter(c => inv.some(i => i.cat === c.id)).map(c => `<div class="cat"><h3>${c.nome}</h3>${inv.filter(i => i.cat === c.id).map(i => `<div class="item"><div><b>${esc(i.nome || c.um)}</b>${i.exemplo ? '<span class="ex">exemplo</span>' : ''}<div class="d">${esc(descItem(i))}</div></div><button class="x" data-del="${i.id}" aria-label="Remover ${esc(i.nome || c.um)}">Remover</button></div>`).join('')}</div>`).join('')
      : `<div class="empty"><h3>Seu equipamento aparece aqui</h3><p class="muted" style="margin:0;max-width:44ch">Cadastre cada vara, carretilha, molinete, linha, anzol, chumbada e isca. Com isso, a aba Pescar agora mostra o melhor conjunto que você já tem e o que falta.</p><button class="btn ghost" data-exemplo>Carregar kit de exemplo</button></div>`;
    const cov = inv.length ? cobertura(inv) : [];
    $('#v-equip').innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="sec"><h2>Meu equipamento</h2><p class="muted" style="margin:0">${inv.length} ${inv.length === 1 ? 'item cadastrado' : 'itens cadastrados'}</p></div>${salvo}</div>
      <div class="inv">
        <div class="sec" style="gap:16px">
          <section class="panel items" aria-label="Itens cadastrados">${lista}${temEx ? `<div><button class="btn danger small" data-limpa-ex>Remover itens de exemplo</button></div>` : ''}</section>
          ${cov.length ? `<section class="panel sec"><h3>O que dá para pescar com o que você tem</h3><p class="muted" style="margin:0;font-size:14px">Aderência ao conjunto indicado para cada espécie, em condição boa de pesca. Toque para montar.</p><div class="cov">${cov.map(c => `<button class="cov-row" data-montar="${c.sp.id}"><b>${c.sp.nome}</b><span class="bar"><i class="${c.pct < 55 ? 'low' : c.pct < 85 ? 'mid' : ''}" style="width:${c.pct}%"></i></span><span class="mono">${c.pct}%</span></button>`).join('')}</div></section>` : ''}
        </div>
        <div class="sec" style="gap:16px">
          <form class="panel form" id="f-add" novalidate><h3>Adicionar item</h3>
            <div class="chips" role="group" aria-label="Categoria">${CATS.map(c => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === catForm}">${c.um}</button>`).join('')}</div>
            <div class="fields">${cat.f.map(([k, label, tipo, x]) => `<div class="field"${k === 'nome' ? ' style="grid-column:1/-1"' : ''}><label for="f-${cat.id}-${k}">${label}</label>${tipo === 'sel' ? `<select id="f-${cat.id}-${k}" name="${k}">${Object.entries(x).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>` : `<input id="f-${cat.id}-${k}" name="${k}" ${tipo === 'num' ? 'inputmode="decimal"' : ''} placeholder="${x}" autocomplete="off">`}</div>`).join('')}</div>
            <div><button class="btn" type="submit">Adicionar ${cat.um.toLowerCase()}</button></div>
          </form>
          <section class="panel sec"><h3>Levar para outro aparelho</h3>
            <p class="muted" style="margin:0;font-size:14px">${Store.mode === 'conta' ? 'Seu equipamento já fica salvo na sua conta e aparece em qualquer aparelho em que você abrir o site com ela.' : 'Sem login, o equipamento fica só neste aparelho. Copie o código e cole no outro celular ou computador.'}</p>
            <div class="row"><button class="btn ghost small" data-export>Copiar código</button></div>
            <div class="field"><label for="imp">Colar código de outro aparelho</label><textarea id="imp" rows="3" placeholder="Cole aqui o código copiado"></textarea></div>
            <div><button class="btn ghost small" data-import>Importar</button></div>
          </section>
        </div>
      </div>`;
  }
  const num = (v) => { if (v === undefined || v === null || String(v).trim() === '') return ''; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : n; };
  function addItem(form) {
    const cat = CATS.find(c => c.id === catForm), it = { id: Math.random().toString(36).slice(2, 9), cat: cat.id };
    cat.f.forEach(([k, , tipo]) => { const v = form.elements[k].value; it[k] = tipo === 'num' ? num(v) : v.trim(); });
    if (cat.id === 'vara' && it.lbMin !== '' && it.lbMax === '') it.lbMax = it.lbMin;
    if (cat.id === 'chumbada' && it.gMax === '') it.gMax = it.gMin;
    const obrig = { vara: ['lbMin'], carretilha: ['tam'], molinete: ['tam'], linha: ['res'], empate: [], anzol: ['min'], chumbada: ['gMin'], isca: [] }[cat.id];
    const faltando = obrig.filter(k => it[k] === '' || it[k] === undefined);
    if (faltando.length) {
      const f = cat.f.find(x => x[0] === faltando[0]);
      toast('Preencha o campo "' + f[1] + '" para cruzar com as recomendações.');
      form.elements[faltando[0]].focus();
      return;
    }
    if (cat.id === 'anzol' && hookNum(it.min) === null) { toast('Use o formato do anzol: 2/0, 1/0, 1, 2, 4…'); form.elements.min.focus(); return; }
    if (!it.nome) it.nome = cat.um;
    Store.set(Store.items.concat([it]));
    toast(cat.um + ' adicionada ao seu equipamento.'.replace('adicionada', ['Anzol', 'Molinete', 'Empate'].includes(cat.um) ? 'adicionado' : 'adicionada'));
  }
  async function exportar() {
    let code;
    try { code = btoa(unescape(encodeURIComponent(JSON.stringify(Store.items)))); } catch (e) { code = ''; }
    try { await navigator.clipboard.writeText(code); toast('Código copiado. Cole no outro aparelho.'); }
    catch (e) { const t = $('#imp'); t.value = code; t.select(); toast('Selecione e copie o código que apareceu na caixa.'); }
  }
  function importar() {
    const raw = $('#imp').value.trim();
    if (!raw) { toast('Cole o código antes de importar.'); return; }
    try {
      const arr = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!Array.isArray(arr)) throw new Error('formato');
      const ok = arr.filter(i => i && typeof i === 'object' && CATS.some(c => c.id === i.cat)).map(i => Object.assign({}, i, { id: Math.random().toString(36).slice(2, 9) }));
      Store.set(Store.items.concat(ok));
      toast(ok.length + ' itens importados.');
    } catch (e) { toast('Código inválido. Copie de novo no outro aparelho.'); }
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button, a');
    if (!b) return;
    const d = b.dataset;
    if (d.tab) { if (d.tab === 'peixes') peixeAberto = null; go(d.tab); return; }
    if (d.k) { setCond(d.k, d.v); return; }
    if (d.no) { go('nos', { scroll: 'no-' + d.no }); return; }
    if (d.go) { go(d.go); return; }
    if (d.filtro) { filtro = d.filtro; renderPeixes(); return; }
    if (d.peixe) { peixeAberto = d.peixe; go('peixes'); return; }
    if ('voltar' in d) { peixeAberto = null; renderPeixes(); return; }
    if (d.montar) { st.esp = d.montar; lsSet(KEY_ST, st); go('pescar'); return; }
    if (d.cat) { catForm = d.cat; renderEquip(); return; }
    if (d.del) { Store.set(Store.items.filter(i => i.id !== d.del)); toast('Item removido.'); return; }
    if ('exemplo' in d) { Store.set(Store.items.concat(kitExemplo())); toast('Kit de exemplo carregado. Troque pelos seus itens quando quiser.'); return; }
    if ('limpaEx' in d) { Store.set(Store.items.filter(i => !i.exemplo)); toast('Itens de exemplo removidos.'); return; }
    if ('export' in d) { exportar(); return; }
    if ('import' in d) { importar(); return; }
  });
  document.addEventListener('submit', (ev) => { if (ev.target.id === 'f-add') { ev.preventDefault(); addItem(ev.target); } });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== view) go(h); });

  /* ---------- Início ---------- */
  const p = piracema();
  $('#pira').textContent = p.txt;
  $('#pira').classList.toggle('on', p.on);
  const h0 = location.hash.slice(1);
  go(TABS.some(t => t[0] === h0) ? h0 : 'pescar');
  Store.init();
})();
