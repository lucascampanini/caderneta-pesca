// Modelo 3D da vara montada com o equipamento escolhido: blank em segmentos (para curvar de verdade),
// cabo, passadores, molinete pendurado embaixo ou carretilha em cima, e a linha na cor certa.
// Eixo da vara = +Y local. "Em cima" da vara = +Z local; "embaixo" = -Z local.

import * as THREE from "three";

const SEG = 14; // segmentos do blank: quanto mais, mais suave a curva

// aparência e ação de cada vara do jogo (id em gearData.js)
// acao: expoente da curva (1 = parabólica, curva a vara toda; 2.5 = extra-rápida, curva só a ponta)
// flex: quanto a vara curva (radianos somados) com carga máxima
export const VARAS = {
  canico: { comp: 3.0, cabo: 0, r: [0.016, 0.004], cor: 0xc9a85c, nos: true, acao: 1.0, flex: 1.6, passadores: 0 },
  mol165: { comp: 1.65, cabo: 0.36, r: [0.0105, 0.0026], cor: 0xe8e2d0, acao: 1.35, flex: 1.45, passadores: 5, caboCor: 0xd8c39a },
  mol180: { comp: 1.8, cabo: 0.4, r: [0.011, 0.0027], cor: 0x2b4a7a, acao: 1.6, flex: 1.35, passadores: 6, caboCor: 0x222222 },
  car168: { comp: 1.68, cabo: 0.3, r: [0.0098, 0.0022], cor: 0x141414, acao: 2.5, flex: 1.2, passadores: 8, caboCor: 0x1d1d1d, gatilho: true },
  car183: { comp: 1.83, cabo: 0.32, r: [0.0115, 0.003], cor: 0x5a1f1f, acao: 1.9, flex: 1.1, passadores: 8, caboCor: 0x1d1d1d, gatilho: true },
  fundo210: { comp: 2.1, cabo: 0.42, r: [0.0145, 0.0042], cor: 0x1f2a36, acao: 1.6, flex: 0.95, passadores: 7, caboCor: 0x2a2a2a, gatilho: true },
  jau210: { comp: 2.1, cabo: 0.46, r: [0.018, 0.006], cor: 0x2a2f22, acao: 1.4, flex: 0.75, passadores: 7, caboCor: 0x2a2a2a, gatilho: true },
};

const LINHA_COR = { mono: [0xd6e6e0, 0.55], multi: [0xd9f03a, 0.85] };

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...opts });
}

/** Molinete: pé preso embaixo da vara, corpo com engrenagem, rotor, carretel virado para a ponta,
 *  botão do freio na frente, alça do pick-up e manivela do lado direito. */
export function molinete(tam) {
  const s = tam <= 1500 ? 0.8 : tam <= 3500 ? 1 : 1.25;
  const g = new THREE.Group();
  const grafite = mat(0x30343b, { metalness: 0.65, roughness: 0.32 });
  const dourado = mat(0xc9a24a, { metalness: 0.85, roughness: 0.28 });
  const prata = mat(0xc9ced4, { metalness: 0.9, roughness: 0.2 });
  const preto = mat(0x111214, { roughness: 0.6 });
  // pé e haste que descem da vara
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.075, 0.006), grafite);
  pe.position.set(0, 0.0, -0.016);
  g.add(pe);
  const haste = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.06), grafite);
  haste.position.set(0, -0.012, -0.048);
  g.add(haste);
  // corpo (caixa de engrenagem): esfera achatada atrás do rotor
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), grafite);
  corpo.scale.set(0.75, 1.0, 1.05);
  corpo.position.set(0, -0.02, -0.088);
  g.add(corpo);
  // rotor (copo que gira em volta do carretel)
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.03, 20), grafite);
  rotor.position.set(0, 0.012, -0.088);
  g.add(rotor);
  // carretel com a linha e a borda dourada
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, 24), dourado);
  borda.position.set(0, 0.06, -0.088);
  g.add(borda);
  const linhaNoCarretel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 24), mat(0xdedcc8, { roughness: 0.85 }));
  linhaNoCarretel.position.set(0, 0.042, -0.088);
  g.add(linhaNoCarretel);
  const freio = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.014, 12), preto);
  freio.position.set(0, 0.07, -0.088);
  g.add(freio);
  // alça do pick-up passando por cima do carretel
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0022, 6, 20, Math.PI), prata);
  bail.rotation.set(0, Math.PI / 2, 0);
  bail.position.set(0, 0.028, -0.088);
  g.add(bail);
  // manivela: gira em torno do eixo X, do lado direito
  const manivela = new THREE.Group();
  manivela.position.set(0.026, -0.02, -0.088);
  const braco = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.006, 0.055), grafite);
  braco.position.set(0.004, 0, -0.026);
  manivela.add(braco);
  const pomo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.026, 10), preto);
  pomo.rotation.z = Math.PI / 2;
  pomo.position.set(0.018, 0, -0.052);
  manivela.add(pomo);
  g.add(manivela);
  g.scale.setScalar(s);
  return { group: g, manivela, carretel: linhaNoCarretel, eixoManivela: "x" };
}

/** Carretilha: placas laterais ovais sobre a vara, carretel transversal entre elas, manivela de duas pás
 *  e estrela do freio do lado direito. Redonda = corpo cilíndrico dourado e maior. */
export function carretilha(redonda) {
  const g = new THREE.Group();
  const corpoMat = mat(redonda ? 0xb8862e : 0x3a404a, { metalness: 0.75, roughness: 0.28 });
  const preto = mat(0x111214, { roughness: 0.55 });
  const prata = mat(0xb9bec5, { metalness: 0.9, roughness: 0.22 });
  const larg = redonda ? 0.07 : 0.055; // distância entre as placas
  const raio = redonda ? 0.036 : 0.03;
  const altura = redonda ? 0.046 : 0.036; // acima da vara
  for (const lado of [-1, 1]) {
    const placa = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.012, 24), corpoMat);
    placa.rotation.z = Math.PI / 2;
    if (!redonda) placa.scale.set(1, 1, 0.78); // perfil baixo: oval
    placa.position.set(lado * larg / 2, 0, altura);
    g.add(placa);
  }
  // barras que unem as placas (frame) e o pé no porta-molinete
  for (const [y, z] of [[0.022, altura - 0.018], [-0.024, altura - 0.012]]) {
    const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, larg, 6), corpoMat);
    barra.rotation.z = Math.PI / 2;
    barra.position.set(0, y, z);
    g.add(barra);
  }
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, altura - 0.012), corpoMat);
  pe.position.set(0, 0, (altura - 0.012) / 2);
  g.add(pe);
  const carretel = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.72, raio * 0.72, larg - 0.012, 20), mat(0xdedcc8, { roughness: 0.85 }));
  carretel.rotation.z = Math.PI / 2;
  carretel.position.set(0, 0, altura);
  g.add(carretel);
  // guia de linha (level wind) na frente
  const guia = new THREE.Mesh(new THREE.BoxGeometry(larg * 0.8, 0.006, 0.01), prata);
  guia.position.set(0, raio * 0.95, altura - 0.006);
  g.add(guia);
  // manivela de duas pás do lado direito, gira em torno de X
  const manivela = new THREE.Group();
  manivela.position.set(larg / 2 + 0.012, -0.004, altura);
  const braco = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.085, 0.008), corpoMat);
  manivela.add(braco);
  for (const s of [-1, 1]) {
    const pa = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.012), preto);
    pa.position.set(0.006, s * 0.042, 0);
    manivela.add(pa);
  }
  g.add(manivela);
  const estrela = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 5), prata);
  estrela.rotation.z = Math.PI / 2;
  estrela.position.set(larg / 2 + 0.008, -0.004, altura);
  g.add(estrela);
  return { group: g, manivela, carretel, eixoManivela: "x" };
}

/**
 * Monta a vara. Devolve { root, joints, tip, reel, linha, spec }.
 * root fica no lugar do antigo joint0 (o pescador inclina root; os joints curvam).
 */
export function montarVara(eq) {
  const spec = VARAS[eq.rod.id] || VARAS.mol180;
  const root = new THREE.Group();
  const blankMat = mat(spec.cor, { roughness: spec.nos ? 0.7 : 0.3, metalness: spec.nos ? 0 : 0.25 });

  // cabo (EVA/cortiça), porta-molinete e gatilho
  let base = 0;
  if (spec.cabo) {
    const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, spec.cabo * 0.62, 10), mat(spec.caboCor, { roughness: 0.9 }));
    cabo.position.y = spec.cabo * 0.31 - 0.18;
    root.add(cabo);
    const assento = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), mat(0x777c82, { metalness: 0.8, roughness: 0.3 }));
    assento.position.y = spec.cabo * 0.62 - 0.18 + 0.045;
    root.add(assento);
    const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.013, spec.cabo * 0.25, 10), mat(spec.caboCor, { roughness: 0.9 }));
    foregrip.position.y = assento.position.y + 0.045 + spec.cabo * 0.125;
    root.add(foregrip);
    if (spec.gatilho) {
      const gat = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.025), mat(0x333333));
      gat.position.set(0, assento.position.y - 0.02, -0.02);
      root.add(gat);
    }
    base = foregrip.position.y + spec.cabo * 0.125;
  } else {
    base = -0.15;
  }

  // molinete ou carretilha no porta-molinete
  let reel = null;
  const seatY = spec.cabo ? spec.cabo * 0.62 - 0.18 + 0.045 : 0;
  if (eq.reel.tipo === "molinete") reel = molinete({ mol1000: 1000, mol3000: 3000, mol5000: 5000 }[eq.reel.id] || 3000);
  else if (eq.reel.tipo === "carretilha") reel = carretilha(eq.reel.id === "red400");
  if (reel && spec.cabo) {
    reel.group.position.y = seatY;
    root.add(reel.group);
  }

  // blank em segmentos encadeados (cada joint é filho do anterior)
  const blankLen = spec.comp - (spec.cabo ? base + 0.18 : 0);
  const segLen = blankLen / SEG;
  const joints = [];
  let parent = root;
  const emCima = eq.reel.tipo === "carretilha";
  const passadorEm = new Set();
  if (spec.passadores) {
    // passadores mais espaçados perto do cabo e mais juntos na ponta
    for (let k = 0; k < spec.passadores; k++) passadorEm.add(Math.min(SEG - 1, Math.round(SEG * (1 - Math.pow(1 - (k + 1) / (spec.passadores + 0.4), 1.25)))));
  }
  for (let i = 0; i < SEG; i++) {
    const j = new THREE.Group();
    j.position.y = i === 0 ? base : segLen;
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const r0 = spec.r[0] + (spec.r[1] - spec.r[0]) * t0;
    const r1 = spec.r[0] + (spec.r[1] - spec.r[0]) * t1;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 8), blankMat);
    seg.position.y = segLen / 2;
    seg.castShadow = true;
    j.add(seg);
    if (spec.nos && i % 2 === 1) {
      // nó do bambu
      const no = new THREE.Mesh(new THREE.TorusGeometry(r1 * 1.05, r1 * 0.35, 5, 10), mat(0x8a6a34, { roughness: 0.8 }));
      no.rotation.x = Math.PI / 2;
      no.position.y = segLen;
      j.add(no);
    }
    if (passadorEm.has(i)) {
      const tam = 0.004 + (1 - t1) * 0.016;
      const lado = emCima ? 1 : -1;
      const anel = new THREE.Mesh(new THREE.TorusGeometry(tam, 0.0011, 5, 12), mat(0xc9ced4, { metalness: 0.9, roughness: 0.2 }));
      anel.position.set(0, segLen * 0.6, lado * (r1 + tam + 0.004));
      j.add(anel);
      const perna = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, tam + 0.004, 4), anel.material);
      perna.rotation.x = Math.PI / 2;
      perna.position.set(0, segLen * 0.6, lado * (r1 + (tam + 0.004) / 2));
      j.add(perna);
    }
    parent.add(j);
    joints.push(j);
    parent = j;
  }
  const tip = new THREE.Object3D();
  tip.position.y = segLen;
  parent.add(tip);

  // pesos de curvatura: a ação decide onde a vara dobra
  const w = joints.map((_, i) => Math.pow((i + 1) / SEG, spec.acao));
  const soma = w.reduce((a, b) => a + b, 0);
  const pesos = w.map((x) => x / soma);

  const [corLinha, opac] = LINHA_COR[eq.line.tipo] || LINHA_COR.mono;
  return { root, joints, tip, reel, pesos, spec, linha: { cor: corLinha, opacidade: opac } };
}
