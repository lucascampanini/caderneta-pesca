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

  /* ---------- Mochila: na conta (Firebase) quando a pessoa entra, senão neste aparelho ---------- */
  const Store = {
    items: lsGet(KEY_INV) || [], mode: 'local', timer: null, uid: null,
    chave() { return this.uid ? KEY_INV + '.' + this.uid : KEY_INV; },
    saveLocal() { lsSet(this.chave(), this.items); },
    async conta(u) {
      if (!u) { this.uid = null; this.mode = 'local'; this.items = lsGet(KEY_INV) || []; onInv(); return; }
      this.uid = u.uid;
      const anon = (lsGet(KEY_INV) || []).filter(i => !i.exemplo);
      try {
        const d = await Conta.lerUsuario();
        const nuvem = d && Array.isArray(d.mochila) ? d.mochila : [];
        const ids = new Set(nuvem.map(i => i.id));
        const novos = anon.filter(i => !ids.has(i.id));
        this.items = nuvem.concat(novos);
        if (novos.length || !d) await Conta.salvar({ mochila: this.items });
        try { localStorage.removeItem(KEY_INV); } catch (e) { /* sem armazenamento */ }
        this.mode = 'conta'; this.saveLocal();
        if (novos.length) toast(novos.length + (novos.length === 1 ? ' item deste aparelho foi para a sua conta.' : ' itens deste aparelho foram para a sua conta.'));
      } catch (e) {
        console.warn(e);
        this.items = lsGet(this.chave()) || anon; this.mode = 'offline';
        toast('Sem conexão com a conta agora. Mostrando a última cópia salva neste aparelho.');
      }
      onInv();
    },
    set(items) {
      this.items = items; this.saveLocal(); onInv();
      clearTimeout(this.timer);
      if (this.mode === 'conta') this.timer = setTimeout(() => this.push(), 400);
    },
    async push() {
      try { await Conta.salvar({ mochila: this.items }); }
      catch (e) { this.mode = 'offline'; onInv(); toast('Não deu para salvar na conta agora. A mochila ficou guardada neste aparelho.'); }
    }
  };
  function onInv() {
    if (view === 'equip') renderEquip();
    renderMatch();
  }

  /* ---------- Login no topo ---------- */
  const G_ICON = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  let entrando = false;
  function renderConta() {
    const el = $('#conta');
    if (!el) return;
    if (!Conta.disponivel()) { el.hidden = true; return; }
    el.hidden = false;
    const u = Conta.usuario();
    if (!Conta.pronto() || entrando) { el.innerHTML = '<span class="conta-load">Carregando…</span>'; return; }
    if (!u) { el.innerHTML = `<button class="btn-google" data-entrar>${G_ICON}<span>Entrar com Google</span></button>`; return; }
    const nome = esc((u.displayName || u.email || 'Você').split(' ')[0]);
    el.innerHTML = `<span class="conta-user">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<b>${nome}</b>${Conta.admin() ? '<span class="tag">admin</span>' : ''}</span><button class="btn ghost small" data-sair>Sair</button>`;
  }
  async function entrar() {
    entrando = true; renderConta();
    try { await Conta.entrar(); }
    catch (e) { console.warn(e); toast(e && e.code === 'auth/unauthorized-domain' ? 'Este endereço ainda não está autorizado no login.' : 'Não deu para entrar agora. Tente de novo.'); }
    entrando = false; renderConta();
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
    equip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18"/></svg>',
    jogo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1"/><circle cx="18" cy="13.5" r="1"/></svg>',
  };
  const TABS = [['pescar', 'Pescar agora'], ['peixes', 'Peixes'], ['montagens', 'Montagens'], ['nos', 'Nós'], ['equip', 'Minha mochila'], ['jogo', 'Jogo']];
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
    if (id === 'jogo') renderJogo();
    else pausaJogo();
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
    const o = (mapa, v) => (mapa && mapa[v]) || '';
    const opcao = (cat, k) => { const c = CATS.find(x => x.id === cat); const f = c && c.f.find(x => x[0] === k); return f && f[2] === 'sel' ? o(f[3], i[k]) : ''; };
    const extra = [];
    switch (i.cat) {
      case 'vara': extra.push(i.tipo === 'molinete' ? 'molinete' : i.tipo === 'canico' ? 'caniço' : 'carretilha', i.comp ? fmtN(i.comp) + ' m' : '', (i.lbMin || '?') + '–' + (i.lbMax || '?') + ' lb', opcao('vara', 'acao').toLowerCase(), i.partes ? opcao('vara', 'partes').toLowerCase() : ''); break;
      case 'carretilha': extra.push(i.perfil === 'redonda' ? 'redonda' : 'perfil baixo', 'tamanho ' + (i.tam || '?'), i.mao ? 'manivela ' + i.mao : '', i.drag ? 'drag ' + fmtN(i.drag) + ' kg' : ''); break;
      case 'molinete': extra.push('tamanho ' + (i.tam || '?'), i.drag ? 'drag ' + fmtN(i.drag) + ' kg' : ''); break;
      case 'linha': extra.push(o({ multi: 'multifilamento', mono: 'monofilamento', fluor: 'fluorcarbono' }, i.tipo), i.unid === 'mm' ? fmtN(i.res) + ' mm (≈' + lbOf(i) + ' lb)' : i.res + ' lb', i.metros ? i.metros + ' m' : ''); break;
      case 'empate': extra.push(opcao('empate', 'material').toLowerCase() || 'aço', (i.lb || '?') + ' lb', i.compCm ? i.compCm + ' cm' : ''); break;
      case 'anzol': extra.push(opcao('anzol', 'modelo').toLowerCase(), (i.min || '?') + (i.max ? ' a ' + i.max : ''), i.reforco && i.reforco !== 'normal' ? 'reforço ' + opcao('anzol', 'reforco') : ''); break;
      case 'garateia': extra.push(i.tam ? 'nº ' + i.tam : '', i.reforco && i.reforco !== 'normal' ? 'reforço ' + opcao('garateia', 'reforco') : ''); break;
      case 'chumbada': extra.push(i.tipo, (i.gMin || '?') + (i.gMax ? '–' + i.gMax : '') + ' g'); break;
      case 'girador': case 'micanga': case 'boia': extra.push(opcao(i.cat, 'tipo').toLowerCase(), i.tam ? (i.cat === 'micanga' ? i.tam + ' mm' : 'nº ' + i.tam) : '', i.g ? i.g + ' g' : ''); break;
      case 'isca': extra.push(ART_TIPOS[i.art] || '', CORES_ISCA[i.cor] ? CORES_ISCA[i.cor].nome : '', i.cm ? fmtN(i.cm) + ' cm' : '', i.g ? fmtN(i.g) + ' g' : ''); break;
      case 'acessorio': case 'eletronico': extra.push(opcao(i.cat, 'tipo')); break;
    }
    return extra.filter(Boolean).join(' · ');
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
  /* ---------- Nós: vídeo de referência com os passos sincronizados (quando há internet), senão os desenhos ---------- */
  const NOS_YT = !!window.NOS_YT;
  const ICO = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function knotPlayer(n) {
    const T = n.video.tempos, t0 = T[0][0], t1 = T[T.length - 1][1], span = t1 - t0;
    const marks = T.map(t => `<i style="left:${((t[0] - t0) / span * 100).toFixed(2)}%"></i>`).join('');
    return `<div class="kp" data-kp="${n.id}">
        <div class="kp-stage"><img class="kp-thumb" src="https://i.ytimg.com/vi/${n.video.yt}/hqdefault.jpg" alt="" loading="lazy"><div class="kp-yt"></div>
          <button class="kp-big" data-kp-act="play" aria-label="Reproduzir o vídeo do nó ${n.nome}">${ICO.play}</button>
          <div class="kp-cap" aria-live="polite"></div></div>
        <div class="kp-bar">
          <button class="kp-btn" data-kp-act="prev" aria-label="Passo anterior">${ICO.prev}</button>
          <button class="kp-btn kp-pp" data-kp-act="play" aria-label="Reproduzir">${ICO.play}</button>
          <button class="kp-btn" data-kp-act="next" aria-label="Próximo passo">${ICO.next}</button>
          <div class="kp-track"><div class="kp-marks">${marks}</div><input type="range" min="${t0}" max="${t1}" step="0.1" value="${t0}" aria-label="Arraste para avançar ou voltar"></div>
          <button class="kp-btn kp-speed" data-kp-act="speed" aria-label="Velocidade">1×</button>
        </div>
        <ol class="kp-steps">${n.passos.map((txt, i) => `<li><button data-kp-step="${i}"><b>${i + 1}</b><span>${txt}</span></button></li>`).join('')}</ol>
        <p class="kp-src">Vídeo: <a href="https://www.youtube.com/watch?v=${n.video.yt}" target="_blank" rel="noopener">${n.video.fonte} no YouTube</a>. Passos em português da Caderneta.</p>
      </div>`;
  }
  function renderNos() {
    $('#v-nos').innerHTML = `<div class="sec" style="margin-bottom:14px"><h2>Nós</h2><p class="muted" style="margin:0;max-width:70ch">Seis nós resolvem quase todas as situações. ${NOS_YT ? 'Toque num passo para ver só aquele movimento no vídeo, ou use a barra e a velocidade ½× para acompanhar no seu ritmo.' : ''} Molhe sempre antes de apertar e corte a sobra rente.</p>
      ${NOS_YT ? '' : '<div class="legend"><span><i style="background:var(--l1)"></i>Linha principal</span><span><i style="background:var(--l1b)"></i>Ponta (sobra) da linha</span><span><i style="background:var(--l2)"></i>Líder</span><span><i style="background:var(--accent)"></i>Próximo movimento</span></div>'}</div>
      <div class="knots">${NOS.map(n => `<section class="panel knot-card" id="no-${n.id}"><div class="row" style="justify-content:space-between"><h3 style="font-size:26px">${n.nome}</h3><a href="${YT_URL('nó ' + n.nome + ' pesca')}" target="_blank" rel="noopener">Mais vídeos</a></div>
        <div class="row" style="gap:6px"><span class="tag">${n.uso}</span><span class="tag">Resistência: ${n.forca}</span><span class="tag">${n.linhas}</span></div>
        ${NOS_YT && n.video ? knotPlayer(n) : `<div class="steps">${n.passos.slice(0, 3).map((p, i) => `<div class="step">${knotStep(n.id, i + 1)}<p>${p}</p></div>`).join('')}</div>`}</section>`).join('')}</div>`;
    if (NOS_YT) document.querySelectorAll('#v-nos .kp').forEach(initKnotPlayer);
  }
  let ytApi = null;
  function loadYT() {
    if (ytApi) return ytApi;
    ytApi = new Promise(res => {
      if (window.YT && window.YT.Player) return res(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(window.YT); };
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
    });
    return ytApi;
  }
  const kpPlayers = new Set();
  function initKnotPlayer(root) {
    const n = NOS.find(x => x.id === root.dataset.kp), T = n.video.tempos;
    const t0 = T[0][0], t1 = T[T.length - 1][1];
    const rng = $('input[type=range]', root), steps = [...root.querySelectorAll('[data-kp-step]')];
    const cap = $('.kp-cap', root), pp = $('.kp-pp', root), big = $('.kp-big', root), host = $('.kp-yt', root);
    let player = null, ready = null, stopAt = null, timer = 0, cur = -1, rate = 1, playing = false;
    const stepAt = (t) => { let k = -1; T.forEach((st, i) => { if (t >= st[0] - 0.2) k = i; }); return k; };
    function paint(t) {
      rng.value = t;
      rng.style.setProperty('--p', Math.max(0, Math.min(100, (t - t0) / (t1 - t0) * 100)).toFixed(2) + '%');
      const k = stepAt(t);
      if (k !== cur) {
        cur = k;
        steps.forEach((b, i) => { b.classList.toggle('on', i === k); b.classList.toggle('done', i < k); });
        cap.textContent = k >= 0 ? (k + 1) + '. ' + n.passos[k] : '';
        cap.classList.toggle('show', k >= 0);
      }
    }
    function sync() {
      pp.innerHTML = playing ? ICO.pause : ICO.play;
      pp.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
      big.hidden = !!player;
    }
    function tick() {
      if (!player || !player.getCurrentTime) return;
      const t = player.getCurrentTime();
      paint(t);
      if (stopAt !== null && t >= stopAt) { player.pauseVideo(); stopAt = null; }
      else if (playing && t >= t1 + 0.4) { player.pauseVideo(); }
    }
    function ensure() {
      if (ready) return ready;
      ready = loadYT().then(YT => new Promise(res => {
        root.classList.add('loaded');
        player = new YT.Player(host, {
          videoId: n.video.yt, host: 'https://www.youtube-nocookie.com',
          playerVars: { start: Math.floor(t0), controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, iv_load_policy: 3, fs: 0, mute: 1 },
          events: {
            onReady: () => { player.mute(); player.setPlaybackRate(rate); kpPlayers.add(player); res(player); },
            onStateChange: (e) => {
              playing = e.data === 1;
              if (playing) { kpPlayers.forEach(o => { if (o !== player && o.pauseVideo) o.pauseVideo(); }); clearInterval(timer); timer = setInterval(tick, 120); }
              else { clearInterval(timer); tick(); }
              sync();
            }
          }
        });
        sync();
      }));
      return ready;
    }
    const seek = (t) => { player.seekTo(t, true); paint(t); };
    function goStep(i) {
      i = Math.max(0, Math.min(T.length - 1, i));
      ensure().then(() => { seek(Math.max(0, T[i][0] - 0.2)); stopAt = T[i][1] - 0.3; player.playVideo(); });
    }
    root.addEventListener('click', (ev) => {
      const sb = ev.target.closest('[data-kp-step]');
      if (sb) { goStep(+sb.dataset.kpStep); return; }
      const b = ev.target.closest('[data-kp-act]');
      if (!b) return;
      const act = b.dataset.kpAct;
      if (act === 'play') ensure().then(() => {
        if (playing) { player.pauseVideo(); return; }
        stopAt = null;
        const t = player.getCurrentTime();
        if (t < t0 - 0.5 || t >= t1) seek(t0);
        player.playVideo();
      });
      else if (act === 'next') goStep(cur + 1);
      else if (act === 'prev') goStep(cur < 0 ? 0 : cur - 1);
      else if (act === 'speed') { rate = rate === 1 ? 0.5 : 1; b.textContent = rate === 1 ? '1×' : '½×'; if (player && player.setPlaybackRate) player.setPlaybackRate(rate); }
    });
    rng.addEventListener('input', () => { stopAt = null; ensure().then(() => { player.pauseVideo(); seek(+rng.value); }); });
    paint(t0); sync();
  }

  /* ---------- Jogo (só com login) ---------- */
  function renderJogo() {
    const box = $('#v-jogo'), u = Conta.usuario();
    if (!u) {
      box.innerHTML = `<section class="panel jogo-gate"><div class="sec"><div class="eyebrow">Para quem entra com Google</div><h2>Pesca Pantaneira, o jogo</h2>
        <p style="margin:0;max-width:56ch">Arremesse, fisgue e brigue com os peixes do Pantanal: piauçu, pacu, pintado, cachara, jaú e o dourado (que é solto, como manda a lei). Libere a baía, o rio de água clara, o barranco do Rio Paraguai e o canal de barco. Seu progresso fica salvo na sua conta.</p>
        <div class="row">${Conta.pronto() ? `<button class="btn-google" data-entrar>${G_ICON}<span>Entrar com Google para jogar</span></button>` : Conta.disponivel() ? '<span class="muted">Carregando…</span>' : '<span class="muted">O login ainda está sendo configurado.</span>'}</div></div></section>`;
      return;
    }
    if (!$('#jogo-frame')) {
      box.innerHTML = `<div class="jogo-wrap"><iframe id="jogo-frame" src="jogo/index.html" title="Pesca Pantaneira, o jogo" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
        <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted" style="font-size:13px">Progresso salvo na sua conta. Clique no jogo para usar o teclado; no celular, use na horizontal.</span><button class="btn ghost small" data-tela-cheia>Tela cheia</button></div>
        <p class="muted" style="font-size:12px;margin:6px 0 0">Baseado no TIDELINE, da BridgeMind (licença MIT).</p>`;
    }
  }
  function pausaJogo() {
    const f = $('#jogo-frame');
    if (!f) return;
    try { f.contentWindow.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); } catch (e) { /* jogo ainda carregando */ }
  }

  /* ---------- Mochila (meu equipamento) ---------- */
  let catAprovado = [], busca = '', prefill = null, pendentesAdmin = null, minhasSug = null, carregandoSug = false;
  const catTodos = () => CATALOGO_BASE.concat(catAprovado);
  const umDe = (c) => (CATS.find(x => x.id === c) || {}).um || 'Item';
  const nomeItem = (i) => i.nome || [i.marca, i.produto].filter(Boolean).join(' ') || umDe(i.cat);
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function achaCatalogo(q) {
    const termos = norm(q).split(/\s+/).filter(Boolean);
    if (!termos.length) return [];
    return catTodos().filter(c => { const t = norm(c.marca + ' ' + c.produto + ' ' + umDe(c.cat)); return termos.every(x => t.includes(x)); }).slice(0, 10);
  }
  function campoHTML(cat, [k, label, tipo, x], val) {
    const id = `f-${cat.id}-${k}`, v = val === undefined || val === null ? '' : String(val);
    if (tipo === 'sel') return `<div class="field"><label for="${id}">${label}</label><select id="${id}" name="${k}">${Object.entries(x).map(([ov, n]) => `<option value="${ov}"${ov === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;
    if (tipo === 'marca') return `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${k}" list="dl-marca-${cat.id}" value="${esc(v)}" placeholder="Escolha ou digite" autocomplete="off"><datalist id="dl-marca-${cat.id}">${(MARCAS[cat.id] || []).map(m => `<option value="${esc(m)}">`).join('')}</datalist></div>`;
    const produtos = k === 'produto' ? [...new Set(catTodos().filter(c => c.cat === cat.id).map(c => c.produto))] : [];
    return `<div class="field"${k === 'produto' ? ' style="grid-column:1/-1"' : ''}><label for="${id}">${label}</label><input id="${id}" name="${k}" ${tipo === 'num' ? 'inputmode="decimal"' : ''} value="${esc(v)}" placeholder="${esc(x || '')}" autocomplete="off"${produtos.length ? ` list="dl-prod-${cat.id}"` : ''}>${produtos.length ? `<datalist id="dl-prod-${cat.id}">${produtos.map(m => `<option value="${esc(m)}">`).join('')}</datalist>` : ''}</div>`;
  }
  function renderEquip() {
    const inv = Store.items, cat = CATS.find(c => c.id === catForm), logado = !!Conta.usuario();
    const salvo = Store.mode === 'conta' ? '<span class="save-state cloud">Salvo na sua conta</span>' : Store.mode === 'offline' ? '<span class="save-state">Sem conexão: cópia deste aparelho</span>' : '<span class="save-state">Salvo neste aparelho</span>';
    const temEx = inv.some(i => i.exemplo);
    const lista = inv.length ? CATS.filter(c => inv.some(i => i.cat === c.id)).map(c => `<div class="cat"><h3>${c.nome}</h3>${inv.filter(i => i.cat === c.id).map(i => `<div class="item"><div><b>${esc(nomeItem(i))}</b>${i.exemplo ? '<span class="ex">exemplo</span>' : ''}<div class="d">${esc(descItem(i))}</div></div><button class="x" data-del="${i.id}" aria-label="Remover ${esc(nomeItem(i))}">Remover</button></div>`).join('')}</div>`).join('')
      : `<div class="empty"><h3>Sua mochila aparece aqui</h3><p class="muted" style="margin:0;max-width:44ch">Cadastre o que você tem: varas, carretilhas, molinetes, linhas, anzóis, iscas e acessórios. Com isso, a aba Pescar agora mostra o melhor conjunto que você já tem e o que falta.</p><button class="btn ghost" data-exemplo>Carregar kit de exemplo</button></div>`;
    const cov = inv.length ? cobertura(inv) : [];
    const pf = prefill && prefill.cat === cat.id ? prefill : null;
    const valores = pf ? Object.assign({ marca: pf.marca, produto: pf.produto }, pf.campos) : {};
    const resultados = achaCatalogo(busca);
    $('#v-equip').innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="sec"><h2>Minha mochila</h2><p class="muted" style="margin:0">${inv.length} ${inv.length === 1 ? 'item' : 'itens'}${Conta.disponivel() && !logado ? ' · entre com Google para guardar na sua conta e ver em qualquer aparelho' : ''}</p></div>${salvo}</div>
      <div class="inv">
        <div class="sec" style="gap:16px">
          <section class="panel items" aria-label="Itens da mochila">${lista}${temEx ? `<div><button class="btn danger small" data-limpa-ex>Remover itens de exemplo</button></div>` : ''}</section>
          ${cov.length ? `<section class="panel sec"><h3>O que dá para pescar com o que você tem</h3><p class="muted" style="margin:0;font-size:14px">Aderência ao conjunto indicado para cada espécie, em condição boa de pesca. Toque para montar.</p><div class="cov">${cov.map(c => `<button class="cov-row" data-montar="${c.sp.id}"><b>${c.sp.nome}</b><span class="bar"><i class="${c.pct < 55 ? 'low' : c.pct < 85 ? 'mid' : ''}" style="width:${c.pct}%"></i></span><span class="mono">${c.pct}%</span></button>`).join('')}</div></section>` : ''}
        </div>
        <div class="sec" style="gap:16px">
          <section class="panel sec busca-cat"><h3>Buscar no catálogo</h3>
            <div class="field"><label for="busca-cat">Marca e modelo</label><input id="busca-cat" type="search" value="${esc(busca)}" placeholder="Ex.: FX 2500, Black Max, Skitter Walk" autocomplete="off"></div>
            <div id="busca-res" class="busca-res">${busca ? (resultados.length ? resultados.map(c => `<button class="res" data-cata="${esc(c.id)}"><b>${esc(c.marca + ' ' + c.produto)}</b><span>${esc(umDe(c.cat))}${c.fonte === 'aprovado' ? ' · enviado por pescador' : ''}</span></button>`).join('') : '<p class="muted" style="margin:0;font-size:14px">Não achei no catálogo. Cadastre abaixo e, se quiser, envie para o catálogo.</p>') : ''}</div>
          </section>
          <form class="panel form" id="f-add" novalidate><h3>${pf ? 'Conferir e adicionar' : 'Adicionar à mochila'}</h3>
            <div class="chips" role="group" aria-label="Categoria">${CATS.map(c => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === catForm}">${c.um}</button>`).join('')}</div>
            ${pf ? `<p class="muted" style="margin:0;font-size:13.5px">Preenchido pelo catálogo. Confira na etiqueta o que estiver em branco (libragem, comprimento, drag) e ajuste se precisar.</p>` : ''}
            <div class="fields">${cat.f.map(f => campoHTML(cat, f, valores[f[0]])).join('')}</div>
            ${logado && !pf ? `<label class="check"><input type="checkbox" name="sugerir" checked> Enviar este item para o catálogo de todos (passa por aprovação)</label>` : ''}
            <div class="row"><button class="btn" type="submit">Adicionar ${cat.um.toLowerCase()}</button>${pf ? '<button class="btn ghost small" type="button" data-limpa-pf>Limpar</button>' : ''}</div>
          </form>
          ${logado ? sugestoesHTML() : ''}
          ${Conta.admin() ? adminHTML() : ''}
          ${logado ? '' : `<section class="panel sec"><h3>Levar para outro aparelho</h3>
            <p class="muted" style="margin:0;font-size:14px">${Conta.disponivel() ? 'O jeito mais fácil é entrar com Google: a mochila fica na sua conta. Sem login, copie o código e cole no outro aparelho.' : 'Sem login, a mochila fica só neste aparelho. Copie o código e cole no outro celular ou computador.'}</p>
            <div class="row"><button class="btn ghost small" data-export>Copiar código</button></div>
            <div class="field"><label for="imp">Colar código de outro aparelho</label><textarea id="imp" rows="3" placeholder="Cole aqui o código copiado"></textarea></div>
            <div><button class="btn ghost small" data-import>Importar</button></div>
          </section>`}
        </div>
      </div>`;
    if (logado && minhasSug === null && !carregandoSug) carregaSugestoes();
  }
  const STATUS_SUG = { pendente: 'aguardando aprovação', aprovado: 'aprovado, já está no catálogo', recusado: 'não aprovado' };
  function sugestoesHTML() {
    if (!minhasSug || !minhasSug.length) return '';
    return `<section class="panel sec"><h3>Minhas sugestões para o catálogo</h3>${minhasSug.map(sg => `<div class="item"><div><b>${esc((sg.item.marca || '') + ' ' + (sg.item.produto || ''))}</b><div class="d">${esc(umDe(sg.item.cat))} · ${STATUS_SUG[sg.status] || sg.status}</div></div></div>`).join('')}</section>`;
  }
  function adminHTML() {
    const p = pendentesAdmin;
    return `<section class="panel sec admin"><h3>Aprovar itens para o catálogo</h3>
      ${p === null ? '<p class="muted" style="margin:0">Carregando…</p>' : !p.length ? '<p class="muted" style="margin:0;font-size:14px">Nenhuma sugestão esperando aprovação.</p>' : p.map(sg => `<div class="sug">
        <div><b>${esc((sg.item.marca || '') + ' ' + (sg.item.produto || ''))}</b><div class="d">${esc(umDe(sg.item.cat))} · ${esc(descItem(Object.assign({ cat: sg.item.cat }, sg.item.campos)))}</div><div class="d">Enviado por ${esc(sg.nome || sg.email || 'pescador')}</div></div>
        <div class="row"><button class="btn small" data-aprovar="${sg.id}">Aprovar</button><button class="btn ghost small" data-recusar="${sg.id}">Recusar</button></div></div>`).join('')}
      <div><button class="btn ghost small" data-recarregar-adm>Atualizar lista</button></div></section>`;
  }
  async function carregaSugestoes() {
    carregandoSug = true;
    try {
      minhasSug = await Conta.minhasSugestoes();
      if (Conta.admin()) pendentesAdmin = await Conta.pendentes();
    } catch (e) { console.warn(e); minhasSug = minhasSug || []; pendentesAdmin = pendentesAdmin || []; }
    carregandoSug = false;
    if (view === 'equip') renderEquip();
  }
  async function moderar(id, aprova) {
    const sg = (pendentesAdmin || []).find(x => x.id === id);
    if (!sg) return;
    try {
      if (aprova) { await Conta.aprovar(sg, sg.item); catAprovado = await Conta.catalogo(); toast('Aprovado: já aparece na busca do catálogo para todos.'); }
      else { await Conta.recusar(sg); toast('Sugestão recusada.'); }
      pendentesAdmin = pendentesAdmin.filter(x => x.id !== id);
    } catch (e) { console.warn(e); toast('Não deu para salvar a decisão. Confira se entrou com a conta de administrador.'); }
    renderEquip();
  }
  const num = (v) => { if (v === undefined || v === null || String(v).trim() === '') return ''; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : n; };
  function addItem(form) {
    const cat = CATS.find(c => c.id === catForm), it = { id: Math.random().toString(36).slice(2, 9), cat: cat.id };
    cat.f.forEach(([k, , tipo]) => { const el = form.elements[k]; if (!el) return; const v = el.value; it[k] = tipo === 'num' ? num(v) : v.trim(); });
    if (cat.id === 'vara' && it.lbMin !== '' && it.lbMax === '') it.lbMax = it.lbMin;
    if (cat.id === 'chumbada' && it.gMax === '') it.gMax = it.gMin;
    const faltando = (cat.obrig || []).filter(k => it[k] === '' || it[k] === undefined);
    if (faltando.length) {
      const f = cat.f.find(x => x[0] === faltando[0]);
      toast('Preencha "' + f[1] + '"' + (['lbMin', 'tam', 'res', 'min', 'gMin'].includes(faltando[0]) ? ' para cruzar com as recomendações.' : '.'));
      form.elements[faltando[0]].focus();
      return;
    }
    if (cat.id === 'anzol' && hookNum(it.min) === null) { toast('Use o formato do anzol: 2/0, 1/0, 1, 2, 4…'); form.elements.min.focus(); return; }
    Object.keys(it).forEach(k => { if (it[k] === '') delete it[k]; });
    Store.set(Store.items.concat([it]));
    const sugerir = form.elements.sugerir && form.elements.sugerir.checked && (it.marca || it.produto);
    if (sugerir) {
      const campos = {}; Object.keys(it).forEach(k => { if (!['id', 'cat', 'marca', 'produto'].includes(k)) campos[k] = it[k]; });
      Conta.sugerir({ cat: it.cat, marca: it.marca || '', produto: it.produto || '', campos })
        .then(() => { minhasSug = null; toast('Adicionado à mochila e enviado para aprovação no catálogo.'); if (view === 'equip') renderEquip(); })
        .catch((e) => { console.warn(e); toast('Adicionado à mochila. Não deu para enviar ao catálogo agora.'); });
    } else toast(cat.um + ' na mochila.');
    prefill = null;
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
    if (d.cat) { catForm = d.cat; if (prefill && prefill.cat !== d.cat) prefill = null; renderEquip(); return; }
    if (d.del) { Store.set(Store.items.filter(i => i.id !== d.del)); toast('Item removido.'); return; }
    if ('exemplo' in d) { Store.set(Store.items.concat(kitExemplo())); toast('Kit de exemplo carregado. Troque pelos seus itens quando quiser.'); return; }
    if ('limpaEx' in d) { Store.set(Store.items.filter(i => !i.exemplo)); toast('Itens de exemplo removidos.'); return; }
    if ('export' in d) { exportar(); return; }
    if ('import' in d) { importar(); return; }
    if ('entrar' in d) { entrar(); return; }
    if ('telaCheia' in d) { const f = $('#jogo-frame'); if (f && f.requestFullscreen) f.requestFullscreen().catch(() => {}); return; }
    if ('sair' in d) { Conta.sair().then(() => toast('Você saiu da conta.')); return; }
    if (d.cata) { const c = catTodos().find(x => x.id === d.cata); if (c) { prefill = c; catForm = c.cat; busca = ''; renderEquip(); const f = $('#f-add'); if (f && f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if ('limpaPf' in d) { prefill = null; renderEquip(); return; }
    if (d.aprovar) { moderar(d.aprovar, true); return; }
    if (d.recusar) { moderar(d.recusar, false); return; }
    if ('recarregarAdm' in d) { pendentesAdmin = null; renderEquip(); carregaSugestoes(); return; }
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id !== 'busca-cat') return;
    busca = ev.target.value;
    const r = achaCatalogo(busca), box = $('#busca-res');
    if (box) box.innerHTML = busca ? (r.length ? r.map(c => `<button class="res" data-cata="${esc(c.id)}"><b>${esc(c.marca + ' ' + c.produto)}</b><span>${esc(umDe(c.cat))}${c.fonte === 'aprovado' ? ' · enviado por pescador' : ''}</span></button>`).join('') : '<p class="muted" style="margin:0;font-size:14px">Não achei no catálogo. Cadastre abaixo e, se quiser, envie para o catálogo.</p>') : '';
  });
  document.addEventListener('submit', (ev) => { if (ev.target.id === 'f-add') { ev.preventDefault(); addItem(ev.target); } });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== view) go(h); });

  /* ---------- Início ---------- */
  const p = piracema();
  $('#pira').textContent = p.txt;
  $('#pira').classList.toggle('on', p.on);
  const h0 = location.hash.slice(1);
  go(TABS.some(t => t[0] === h0) ? h0 : 'pescar');
  renderConta();
  Conta.onChange((u) => { minhasSug = null; pendentesAdmin = null; renderConta(); Store.conta(u); if (!u) { const f = $('#jogo-frame'); if (f) f.remove(); } if (view === 'jogo') renderJogo(); });
  Conta.init().then((ok) => { renderConta(); if (view === 'jogo') renderJogo(); if (ok) Conta.catalogo().then(c => { catAprovado = c; if (view === 'equip') renderEquip(); }).catch(() => {}); });
})();
