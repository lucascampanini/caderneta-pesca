/* ===== Conta (Firebase): login com Google, mochila na nuvem, catálogo aprovado, sugestões e progresso do jogo =====
   Só ativa quando window.FIREBASE_CONFIG existe (o build injeta na versão do GitHub Pages).
   Sem configuração, todas as funções respondem como "sem conta" e o site segue salvando no aparelho. */
const Conta = (() => {
  const VERSAO = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + VERSAO + '/';
  const ADMIN_EMAIL = 'lucasmondinicn@gmail.com';
  let fb = null, user = null, pronto = null, primeiraVez = true;
  const ouvintes = [];
  const cfg = () => (typeof window !== 'undefined' && window.FIREBASE_CONFIG) || null;

  function init() {
    if (pronto) return pronto;
    if (!cfg()) return (pronto = Promise.resolve(false));
    pronto = Promise.all([import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')])
      .then(([app, auth, fs]) => {
        const a = app.initializeApp(cfg());
        fb = { auth: auth.getAuth(a), A: auth, db: fs.getFirestore(a), F: fs };
        fb.auth.languageCode = 'pt-BR';
        return new Promise(res => {
          fb.A.onAuthStateChanged(fb.auth, (u) => {
            user = u;
            ouvintes.forEach(f => { try { f(u); } catch (e) { console.error(e); } });
            if (primeiraVez) { primeiraVez = false; res(true); }
          });
        });
      })
      .catch((e) => { console.warn('Conta indisponível:', e); return false; });
    return pronto;
  }
  const exigeUser = () => { if (!fb || !user) throw new Error('sem-login'); };
  const doc = (...p) => fb.F.doc(fb.db, ...p);

  return {
    init,
    disponivel: () => !!cfg(),
    pronto: () => !!fb,
    usuario: () => user,
    admin: () => !!(user && user.email === ADMIN_EMAIL && user.emailVerified),
    onChange(f) { ouvintes.push(f); },

    async entrar() {
      await init();
      if (!fb) throw new Error('indisponivel');
      const prov = new fb.A.GoogleAuthProvider();
      prov.setCustomParameters({ prompt: 'select_account' });
      try { await fb.A.signInWithPopup(fb.auth, prov); }
      catch (e) {
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await fb.A.signInWithRedirect(fb.auth, prov);
        else if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return false;
        else throw e;
      }
      return true;
    },
    async sair() { if (fb) await fb.A.signOut(fb.auth); },

    /* Documento do usuário: { nome, email, mochila: [...], jogo: {...}, atualizadoEm } */
    async lerUsuario() {
      exigeUser();
      const s = await fb.F.getDoc(doc('usuarios', user.uid));
      return s.exists() ? s.data() : null;
    },
    async salvar(campos) {
      exigeUser();
      await fb.F.setDoc(doc('usuarios', user.uid), Object.assign({ nome: user.displayName || '', email: user.email || '', atualizadoEm: fb.F.serverTimestamp() }, campos), { merge: true });
    },

    /* Catálogo aprovado (todos leem) */
    async catalogo() {
      await init();
      if (!fb) return [];
      const s = await fb.F.getDocs(fb.F.collection(fb.db, 'catalogo'));
      return s.docs.map(d => Object.assign({ id: d.id, fonte: 'aprovado' }, d.data()));
    },

    /* Sugestões de itens novos */
    async sugerir(item) {
      exigeUser();
      await fb.F.addDoc(fb.F.collection(fb.db, 'sugestoes'), {
        uid: user.uid, nome: user.displayName || '', email: user.email || '', status: 'pendente', criadoEm: fb.F.serverTimestamp(), item
      });
    },
    async minhasSugestoes() {
      exigeUser();
      const q = fb.F.query(fb.F.collection(fb.db, 'sugestoes'), fb.F.where('uid', '==', user.uid));
      return (await fb.F.getDocs(q)).docs.map(d => Object.assign({ id: d.id }, d.data()));
    },
    async pendentes() {
      exigeUser();
      const q = fb.F.query(fb.F.collection(fb.db, 'sugestoes'), fb.F.where('status', '==', 'pendente'));
      return (await fb.F.getDocs(q)).docs.map(d => Object.assign({ id: d.id }, d.data()));
    },
    async aprovar(sug, item) {
      exigeUser();
      await fb.F.addDoc(fb.F.collection(fb.db, 'catalogo'), Object.assign({}, item, { aprovadoEm: fb.F.serverTimestamp(), sugeridoPor: sug.nome || '' }));
      await fb.F.updateDoc(doc('sugestoes', sug.id), { status: 'aprovado' });
    },
    async recusar(sug) { exigeUser(); await fb.F.updateDoc(doc('sugestoes', sug.id), { status: 'recusado' }); }
  };
})();
if (typeof window !== 'undefined') window.Conta = Conta;
