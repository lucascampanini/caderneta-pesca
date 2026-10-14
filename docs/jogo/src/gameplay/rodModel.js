// Modelo 3D da vara montada com o equipamento escolhido: blank de carbono envernizado em segmentos
// (para curvar de verdade), cabo de cortiça ou EVA, porta-molinete de metal escovado, passadores com
// armação de metal e anel cerâmico amarrados com linha colorida, molinete pendurado embaixo ou
// carretilha em cima com a linha enrolada visível no carretel.
// Eixo da vara = +Y local. "Em cima" da vara = +Z local; "embaixo" = -Z local.

import * as THREE from "three";
import {
  matBlank, matBambu, matNoBambu, matCortica, matEva, matEscovado, matCromo, matPintura,
  matCeramica, matAmarracao, matBorracha, matLinhaCarretel,
} from "./materiaisEquipamento.js";

const SEG = 14; // segmentos do blank: quanto mais, mais suave a curva

// aparência e ação de cada vara do jogo (id em gearData.js)
// acao: expoente da curva (1 = parabólica, curva a vara toda; 2.5 = extra-rápida, curva só a ponta)
// flex: quanto a vara curva (radianos somados) com carga máxima
// pega: cortiça ou EVA no cabo; amarra: cor da linha de amarração dos passadores
export const VARAS = {
  canico: { comp: 3.0, cabo: 0, r: [0.016, 0.004], cor: 0xc9a85c, nos: true, acao: 1.0, flex: 1.6, passadores: 0 },
  mol165: { comp: 1.65, cabo: 0.36, r: [0.0105, 0.0026], cor: 0xe8e2d0, acao: 1.35, flex: 1.45, passadores: 5, caboCor: 0xd8c39a, pega: "cortica", amarra: 0x2a5a8a },
  mol180: { comp: 1.8, cabo: 0.4, r: [0.011, 0.0027], cor: 0x2b4a7a, acao: 1.6, flex: 1.35, passadores: 6, caboCor: 0x222222, pega: "eva", amarra: 0xd8d8d8 },
  car168: { comp: 1.68, cabo: 0.3, r: [0.0098, 0.0022], cor: 0x141414, acao: 2.5, flex: 1.2, passadores: 8, caboCor: 0x1d1d1d, gatilho: true, pega: "cortica", amarra: 0xb8202a },
  car183: { comp: 1.83, cabo: 0.32, r: [0.0115, 0.003], cor: 0x5a1f1f, acao: 1.9, flex: 1.1, passadores: 8, caboCor: 0x1d1d1d, gatilho: true, pega: "eva", amarra: 0xc9a24a },
  fundo210: { comp: 2.1, cabo: 0.42, r: [0.0145, 0.0042], cor: 0x1f2a36, acao: 1.6, flex: 0.95, passadores: 7, caboCor: 0x2a2a2a, gatilho: true, pega: "eva", amarra: 0x6fa8d8 },
  jau210: { comp: 2.1, cabo: 0.46, r: [0.018, 0.006], cor: 0x2a2f22, acao: 1.4, flex: 0.75, passadores: 7, caboCor: 0x2a2a2a, gatilho: true, pega: "eva", amarra: 0xe0b030 },
};

// cor da linha: mono translúcida (verde-água), multi de cor viva; multi grossa vem multicolorida (uma cor a cada 10 m)
const MULTICOR = [0xe23b2e, 0xf2d21b, 0x2f7fe0, 0x3fc24a, 0xf4f4f0];

/** Aparência da linha conforme o tipo e a libragem. */
export function aparenciaLinha(line) {
  const lb = line?.lb ?? 15;
  if (line?.tipo === "multi") {
    const cores = lb >= 50 ? MULTICOR : null;
    return { tipo: "multi", cor: cores ? cores[1] : 0xc8ec2a, cores, opacidade: 0.95, largura: 1.35 + Math.sqrt(lb) * 0.11 };
  }
  return { tipo: "mono", cor: 0xcfe6dc, cores: null, opacidade: 0.5, largura: 1.05 + Math.sqrt(lb) * 0.12 };
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...opts });
}

/** Molinete: pé preso embaixo da vara, corpo com engrenagem, rotor, carretel virado para a ponta com a
 *  linha enrolada, botão do freio na frente, alça do pick-up (abre no arremesso) e manivela do lado direito. */
export function molinete(tam, linha = null) {
  const s = tam <= 1500 ? 0.8 : tam <= 3500 ? 1 : 1.25;
  const ap = linha || aparenciaLinha(null);
  const g = new THREE.Group();
  const grafite = matPintura(0x2b2f36, 0.34);
  const detalhe = matEscovado(tam >= 5000 ? 0xc9a24a : 0xb9bec5, 0.28);
  const cromo = matCromo();
  const preto = matBorracha();
  const C = -0.088; // eixo do carretel (z)
  // pé e haste que descem da vara
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.075, 0.006), grafite);
  pe.position.set(0, 0.0, -0.016);
  g.add(pe);
  const haste = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.06), grafite);
  haste.position.set(0, -0.012, -0.048);
  haste.rotation.x = 0.12;
  g.add(haste);
  // corpo (caixa de engrenagem): esfera achatada atrás do rotor, com tampa lateral escovada
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), grafite);
  corpo.scale.set(0.75, 1.0, 1.05);
  corpo.position.set(0, -0.02, C);
  g.add(corpo);
  for (const lado of [-1, 1]) {
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.003, 20), detalhe);
    tampa.rotation.z = Math.PI / 2;
    tampa.position.set(lado * 0.0225, -0.02, C);
    g.add(tampa);
  }
  // rotor (copo que gira em volta do carretel) com os dois braços da alça
  const rotor = new THREE.Group();
  rotor.position.set(0, 0.012, C);
  const copo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.03, 28, 1, true), grafite);
  rotor.add(copo);
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), grafite);
  fundo.rotation.x = Math.PI / 2;
  fundo.position.y = -0.015;
  rotor.add(fundo);
  for (const lado of [-1, 1]) {
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.012), grafite);
    braco.position.set(lado * 0.031, 0.012, 0);
    rotor.add(braco);
  }
  g.add(rotor);
  // carretel: saia, linha enrolada (gira quando o freio patina), borda escovada
  const saia = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.012, 28), detalhe);
  saia.position.set(0, 0.028, C);
  g.add(saia);
  const linhaNoCarretel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.026, 32), matLinhaCarretel(ap.cor, ap.tipo === "multi"));
  linhaNoCarretel.position.set(0, 0.047, C);
  g.add(linhaNoCarretel);
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(0.0305, 0.029, 0.005, 32), detalhe);
  borda.position.set(0, 0.0625, C);
  g.add(borda);
  // botão do freio: borracha recartilhada com tampa metálica
  const freio = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.014, 0.014, 14), preto);
  freio.position.set(0, 0.072, C);
  g.add(freio);
  const tampaFreio = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0105, 0.003, 20), detalhe);
  tampaFreio.position.set(0, 0.0805, C);
  g.add(tampaFreio);
  // alça do pick-up: arco de arame cromado passando pela frente do carretel, preso nos braços do rotor
  const alca = new THREE.Group();
  alca.position.set(0, 0.014, 0); // relativo ao rotor
  const arame = new THREE.Mesh(new THREE.TorusGeometry(0.0335, 0.0016, 6, 28, Math.PI), cromo);
  alca.add(arame);
  const rolete = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 8), cromo);
  rolete.rotation.z = Math.PI / 2;
  rolete.position.set(0.032, 0.002, 0);
  alca.add(rolete);
  alca.rotation.x = 0.2;
  alca.userData.fechada = 0.2;
  alca.userData.aberta = -1.9;
  rotor.add(alca);
  // manivela: gira em torno do eixo X, do lado direito
  const manivela = new THREE.Group();
  manivela.position.set(0.026, -0.02, C);
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 8), detalhe);
  eixo.rotation.z = Math.PI / 2;
  manivela.add(eixo);
  const braco = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.055), detalhe);
  braco.position.set(0.006, 0, -0.026);
  manivela.add(braco);
  const pomo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.0095, 0.026, 14), matEva(0x18191b));
  pomo.rotation.z = Math.PI / 2;
  pomo.position.set(0.02, 0, -0.052);
  manivela.add(pomo);
  g.add(manivela);
  g.scale.setScalar(s);
  return { group: g, manivela, carretel: linhaNoCarretel, rotor, alca, eixoManivela: "x" };
}

/** Carretilha: placas laterais ovais sobre a vara, carretel transversal entre elas com a linha enrolada,
 *  manivela de duas pás e estrela do freio do lado direito. Redonda = corpo cilíndrico dourado e maior. */
export function carretilha(redonda, linha = null) {
  const ap = linha || aparenciaLinha(null);
  const g = new THREE.Group();
  const corpoMat = redonda ? matEscovado(0xc0902e, 0.3) : matPintura(0x343a44, 0.32);
  const preto = matBorracha();
  const prata = matEscovado(0xb9bec5, 0.25);
  const cromo = matCromo();
  const larg = redonda ? 0.07 : 0.055; // distância entre as placas
  const raio = redonda ? 0.036 : 0.03;
  const altura = redonda ? 0.046 : 0.036; // acima da vara
  for (const lado of [-1, 1]) {
    const placa = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.012, 32), corpoMat);
    placa.rotation.z = Math.PI / 2;
    if (!redonda) placa.scale.set(1, 1, 0.78); // perfil baixo: oval
    placa.position.set(lado * larg / 2, 0, altura);
    g.add(placa);
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.55, raio * 0.6, 0.006, 24), prata);
    tampa.rotation.z = Math.PI / 2;
    tampa.position.set(lado * (larg / 2 + 0.008), 0, altura);
    g.add(tampa);
  }
  // barras que unem as placas (frame) e o pé no porta-molinete
  for (const [y, z] of [[0.022, altura - 0.018], [-0.024, altura - 0.012]]) {
    const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, larg, 8), corpoMat);
    barra.rotation.z = Math.PI / 2;
    barra.position.set(0, y, z);
    g.add(barra);
  }
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, altura - 0.012), corpoMat);
  pe.position.set(0, 0, (altura - 0.012) / 2);
  g.add(pe);
  const carretel = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.72, raio * 0.72, larg - 0.012, 32), matLinhaCarretel(ap.cor, ap.tipo === "multi"));
  carretel.rotation.z = Math.PI / 2;
  carretel.position.set(0, 0, altura);
  g.add(carretel);
  // guia de linha (level wind) na frente
  const guia = new THREE.Mesh(new THREE.BoxGeometry(larg * 0.8, 0.006, 0.01), cromo);
  guia.position.set(0, raio * 0.95, altura - 0.006);
  g.add(guia);
  // manivela de duas pás do lado direito, gira em torno de X
  const manivela = new THREE.Group();
  manivela.position.set(larg / 2 + 0.014, -0.004, altura);
  const braco = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.085, 0.008), prata);
  manivela.add(braco);
  for (const s of [-1, 1]) {
    const pa = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.012, 4, 10), matEva(0x18191b));
    pa.position.set(0.007, s * 0.042, 0);
    manivela.add(pa);
  }
  g.add(manivela);
  const estrela = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 5), prata);
  estrela.rotation.z = Math.PI / 2;
  estrela.position.set(larg / 2 + 0.01, -0.004, altura);
  g.add(estrela);
  const botao = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12), preto);
  botao.rotation.z = Math.PI / 2;
  botao.position.set(-larg / 2 - 0.009, 0.006, altura);
  g.add(botao);
  return { group: g, manivela, carretel, eixoManivela: "x" };
}

/** Passador: armação de metal em V presa ao blank, anel cerâmico e a amarração colorida nos pés. */
function passador(tam, r, lado, amarraCor, compSeg) {
  const g = new THREE.Group();
  const armacao = matEscovado(0x4a4e55, 0.22);
  const dist = r + tam + 0.004;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(tam + 0.0011, 0.0009, 6, 18), armacao);
  aro.position.z = lado * dist;
  g.add(aro);
  const anel = new THREE.Mesh(new THREE.TorusGeometry(tam, 0.0012 + tam * 0.06, 6, 18), matCeramica());
  anel.position.z = lado * dist;
  g.add(anel);
  // pernas em V (uma para cada lado do blank, abrindo para o anel)
  const compPerna = Math.hypot(tam + 0.004, 0.006);
  for (const k of [-1, 1]) {
    const perna = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, compPerna, 4), armacao);
    perna.position.set(0, k * 0.003, lado * (r + (tam + 0.004) / 2));
    perna.rotation.x = Math.PI / 2 + lado * k * Math.atan2(0.006, tam + 0.004);
    g.add(perna);
  }
  // amarração: anelzinho de linha envernizada em volta do blank
  const amarra = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.18, Math.min(0.016, compSeg * 0.15), 12), matAmarracao(amarraCor));
  g.add(amarra);
  return g;
}

/**
 * Monta a vara. Devolve { root, joints, tip, reel, linha, spec }.
 * root fica no lugar do antigo joint0 (o pescador inclina root; os joints curvam).
 */
export function montarVara(eq) {
  const spec = VARAS[eq.rod.id] || VARAS.mol180;
  const root = new THREE.Group();
  const blankMat = spec.nos ? matBambu() : matBlank(spec.cor);
  const ap = aparenciaLinha(eq.line);

  // cabo (EVA/cortiça), porta-molinete e gatilho
  let base = 0;
  if (spec.cabo) {
    const pega = spec.pega === "cortica" ? matCortica() : matEva(spec.caboCor);
    const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, spec.cabo * 0.62, 20), pega);
    cabo.position.y = spec.cabo * 0.31 - 0.18;
    root.add(cabo);
    const tampao = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.015, 0.012, 20), matBorracha(0x1a1b1d));
    tampao.position.y = -0.18 - 0.006;
    root.add(tampao);
    const assento = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 20), matEscovado(0x6f747b, 0.3));
    assento.position.y = spec.cabo * 0.62 - 0.18 + 0.045;
    root.add(assento);
    // capas do porta-molinete e anel de acabamento
    for (const dy of [-0.045, 0.045]) {
      const capa = new THREE.Mesh(new THREE.CylinderGeometry(0.0142, 0.0142, 0.012, 20), matPintura(0x1c1e22, 0.3));
      capa.position.y = assento.position.y + dy;
      root.add(capa);
    }
    const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.013, spec.cabo * 0.25, 20), pega);
    foregrip.position.y = assento.position.y + 0.045 + spec.cabo * 0.125;
    root.add(foregrip);
    const acabamento = new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0128, 0.008, 20), matEscovado(0x8a8f96, 0.25));
    acabamento.position.y = foregrip.position.y + spec.cabo * 0.125 + 0.004;
    root.add(acabamento);
    if (spec.gatilho) {
      const gat = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.025), matPintura(0x222326, 0.4));
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
  if (eq.reel.tipo === "molinete") reel = molinete({ mol1000: 1000, mol3000: 3000, mol5000: 5000 }[eq.reel.id] || 3000, ap);
  else if (eq.reel.tipo === "carretilha") reel = carretilha(eq.reel.id === "red400", ap);
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
    for (let k = 0; k < spec.passadores; k++) passadorEm.add(Math.min(SEG - 2, Math.round(SEG * (1 - Math.pow(1 - (k + 1) / (spec.passadores + 0.4), 1.25)))));
  }
  for (let i = 0; i < SEG; i++) {
    const j = new THREE.Group();
    j.position.y = i === 0 ? base : segLen;
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const r0 = spec.r[0] + (spec.r[1] - spec.r[0]) * t0;
    const r1 = spec.r[0] + (spec.r[1] - spec.r[0]) * t1;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 12), blankMat);
    seg.position.y = segLen / 2;
    seg.castShadow = true;
    j.add(seg);
    if (spec.nos && i % 2 === 1) {
      // nó do bambu
      // nó do bambu: um inchaço com a fibra mais escura, não um anel colado
      const perfil = [[r1 * 0.98, -0.02], [r1 * 1.06, -0.006], [r1 * 1.16, 0], [r1 * 1.06, 0.006], [r1 * 0.98, 0.02]].map(([x, y]) => new THREE.Vector2(x, y));
      const no = new THREE.Mesh(new THREE.LatheGeometry(perfil, 14), matNoBambu());
      no.position.y = segLen;
      j.add(no);
    }
    if (passadorEm.has(i)) {
      const tam = 0.004 + (1 - t1) * 0.016;
      const p = passador(tam, (r0 + r1) / 2, emCima ? 1 : -1, spec.amarra ?? 0x333333, segLen);
      p.position.y = segLen * 0.6;
      j.add(p);
    }
    parent.add(j);
    joints.push(j);
    parent = j;
  }
  // ponteira (tip-top): anelzinho na ponta por onde a linha sai
  if (spec.passadores) {
    const lado = emCima ? 1 : -1;
    const tt = passador(0.0032, spec.r[1], lado, spec.amarra ?? 0x333333, segLen);
    tt.position.y = segLen * 0.93;
    parent.add(tt);
  } else {
    // caniço: a linha amarrada na ponta com umas voltas
    const amarra = new THREE.Mesh(new THREE.CylinderGeometry(spec.r[1] * 1.4, spec.r[1] * 1.4, 0.03, 10), matLinhaCarretel(ap.cor, ap.tipo === "multi"));
    amarra.position.y = segLen * 0.85;
    parent.add(amarra);
  }
  const tip = new THREE.Object3D();
  tip.position.y = segLen;
  parent.add(tip);

  // pesos de curvatura: a ação decide onde a vara dobra
  const w = joints.map((_, i) => Math.pow((i + 1) / SEG, spec.acao));
  const soma = w.reduce((a, b) => a + b, 0);
  const pesos = w.map((x) => x / soma);

  return { root, joints, tip, reel, pesos, spec, linha: { ...ap, opacidade: ap.opacidade } };
}
