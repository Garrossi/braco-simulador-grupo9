// braco.js · modelo 3D do braço hidráulico A-81 com a garra "Dedos em concha DC1" (grupo 9)
// Módulo compartilhado: usado pelo index.html (navegador) e pelo gerar_glb.mjs (Node).
// Unidades internas: mm, eixo Z para cima. O nó "BracoRA" converte para metros (escala 0,001)
// e para o eixo Y para cima do three.js / glTF.
import * as THREE from 'three';

const R = Math.PI / 180;

// ---------- medidas (mm) ----------
export const GEOM = {
  base: { x0: -120, x1: 120, y0: -65, y1: 65, t: 5 },
  centroGiro: [-88, 0],
  zDiscoFixo: 5, zGiro: 10,            // disco fixo 5..10, disco giratório 10..15
  ombroZ: 102,                         // no referencial do giro: 97 mm acima do disco (topo do disco = 5)
  torreY: 22, lancaY: 14.5, anteY: 20,
  lanca: 113,                          // furo do ombro -> furo do cotovelo
  antebraco: 148,                      // furo do cotovelo -> furo da cabeça
  pivoX: -24, pivoY: 27.3,             // pivôs P na cabeça (distância entre pivôs 54,6)
  dedoZ: -2.5,                         // plano médio dos dedos (chapa de 5 mm)
  pegaX: -24 - 54,                     // centro do objeto Ø40 (verificacao.json: centro_obj40_y = -54)
  D_dxf: [-17.79, 2.76],               // furo D no DXF (P na origem)
  elo: 12, pinoCorredicaY: 5,
  mestraX: 24, mestraZ: 24,
  mestraY: { giro: -40, ombro: -14, cotovelo: 14, garra: 40 },
};
export const JUNTAS = ['giro', 'ombro', 'cotovelo', 'garra'];
export const NOMES = { giro: 'Giro da base', ombro: 'Ombro', cotovelo: 'Cotovelo', garra: 'Garra' };
export const LIMITES = { giro: [-30, 60], ombro: [10, 85], cotovelo: [-150, -40], garra: [0, 1] };
export const PHI_MAX = 55;          // abertura máxima de cada dedo (graus)
export const PHI_CONTATO = 16.5;    // objeto Ø40 entra / é abraçado a partir daqui
export const AREA_SERINGA = Math.PI / 4 * 14.5 * 14.5; // mm² (Ø interno 14,5 mm)

// Tabela do verificacao.json: φ (graus) -> abertura da boca do DC1 (mm)
export const TABELA_ABERTURA = [
  [0, 2.0], [5, 13.7], [10, 25.7], [15, 37.9], [18, 45.3], [20, 50.3],
  [25, 62.7], [30, 75.0], [40, 99.1], [55, 132.5],
];
export function aberturaBoca(phi) {
  const t = TABELA_ABERTURA;
  if (phi <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (phi <= t[i][0]) {
      const [a0, b0] = t[i - 1], [a1, b1] = t[i];
      return b0 + (b1 - b0) * (phi - a0) / (a1 - a0);
    }
  }
  return t[t.length - 1][1];
}

// Pose usada para pegar/soltar o objeto Ø40 (centro a 20 mm da mesa). Calculada por
// calcularPoseDePega() e conferida no gerar_glb.mjs (node gerar_glb.mjs --pose).
export const POSE_PEGA = { ombro: 83, cotovelo: -145.5 };
export const GIRO_A = -12, GIRO_B = 42;

// ---------- materiais ----------
export function criarMateriais() {
  return {
    mdf: new THREE.MeshStandardMaterial({ name: 'MDF', color: '#e6cfa6', roughness: 0.82 }),
    borda: new THREE.MeshStandardMaterial({ name: 'MDF_Borda', color: '#6b4528', roughness: 0.9 }),
    seringa: new THREE.MeshStandardMaterial({ name: 'Seringa', color: '#eef5fa', roughness: 0.12, transparent: true, opacity: 0.32, depthWrite: false }),
    aba: new THREE.MeshStandardMaterial({ name: 'Seringa_Aba', color: '#f3f5f7', roughness: 0.35, transparent: true, opacity: 0.85 }),
    embolo: new THREE.MeshStandardMaterial({ name: 'Embolo', color: '#f6f6f4', roughness: 0.45, transparent: true, opacity: 0.92 }),
    borracha: new THREE.MeshStandardMaterial({ name: 'Borracha', color: '#1c1c1e', roughness: 0.7 }),
    agua: new THREE.MeshStandardMaterial({ name: 'Agua', color: '#3d8fe6', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
    mangueira: new THREE.MeshStandardMaterial({ name: 'Mangueira', color: '#bcdcf2', roughness: 0.2, transparent: true, opacity: 0.6, depthWrite: false }),
    metal: new THREE.MeshStandardMaterial({ name: 'Metal', color: '#b9bcc1', metalness: 0.9, roughness: 0.4 }),
    latao: new THREE.MeshStandardMaterial({ name: 'Latao', color: '#c9a24a', metalness: 0.8, roughness: 0.4 }),
    verde: new THREE.MeshStandardMaterial({ name: 'Conector_Verde', color: '#1fa65a', roughness: 0.5 }),
    garrafa: new THREE.MeshStandardMaterial({ name: 'Garrafa_PET', color: '#cfe9f7', roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false }),
    rotulo: new THREE.MeshStandardMaterial({ name: 'Garrafa_Rotulo', color: '#f26522', roughness: 0.6 }),
    tampa: new THREE.MeshStandardMaterial({ name: 'Garrafa_Tampa', color: '#151515', roughness: 0.5 }),
    aco: new THREE.MeshStandardMaterial({ name: 'Aco', color: '#a9afb5', metalness: 0.85, roughness: 0.45 }),
  };
}

// ---------- utilidades de geometria ----------
// placas extrudadas (MDF): forma 2D (u,v) + espessura w centrada; grupos: 0 = faces, 1 = bordas queimadas
const M_XY = new THREE.Matrix4();
const M_XZ = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (u,v,w)->(u,-w,v)
const M_YZ = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);  // (u,v,w)->(w,u,v)
function geoPlaca(shape, t, plano = 'XY', seg = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, -t / 2);
  g.applyMatrix4(plano === 'XZ' ? M_XZ : plano === 'YZ' ? M_YZ : M_XY);
  return g;
}
function furo(s, x, y, r = 1.7) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  s.holes.push(p);
}
function rasgo(s, x, y, w, h) {
  const p = new THREE.Path();
  p.moveTo(x - w / 2, y - h / 2); p.lineTo(x - w / 2, y + h / 2); p.lineTo(x + w / 2, y + h / 2); p.lineTo(x + w / 2, y - h / 2); p.closePath();
  s.holes.push(p);
}
function shapeBarra(x0, x1, w, furos = []) {
  const s = new THREE.Shape(), h = w / 2;
  s.moveTo(x0, -h); s.lineTo(x1, -h);
  s.absarc(x1, 0, h, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(x0, h);
  s.absarc(x0, 0, h, Math.PI / 2, Math.PI * 1.5, false);
  for (const f of furos) furo(s, f[0], f[1] || 0, f[2] || 1.7);
  return s;
}
function shapeRet(x0, y0, x1, y1, r = 0) {
  const s = new THREE.Shape();
  if (r <= 0) { s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; }
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
// cilindro de 0 a comp ao longo do eixo; r0 no início, r1 no fim
function geoCil(r0, r1, comp, eixo = 'x', seg = 20, aberto = false) {
  const g = new THREE.CylinderGeometry(r1, r0, comp, seg, 1, aberto);
  g.translate(0, comp / 2, 0);
  if (eixo === 'x') g.rotateZ(-Math.PI / 2);
  else if (eixo === 'z') g.rotateX(Math.PI / 2);
  return g;
}
function malha(geo, mat, nome, grupo, hid = false) {
  const m = new THREE.Mesh(geo, mat);
  if (nome) m.name = nome;
  m.userData.grupo = grupo;
  m.userData.hid = hid;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function parafuso(mats, pai, x, y, z, comp, eixo, grupo) {
  const g = geoCil(1.6, 1.6, comp, eixo, 10);
  const off = { x: [-comp / 2, 0, 0], y: [0, -comp / 2, 0], z: [0, 0, -comp / 2] }[eixo];
  g.translate(...off);
  const m = malha(g, mats.metal, null, grupo);
  m.position.set(x, y, z);
  pai.add(m);
  // porcas
  for (const s of [-1, 1]) {
    const p = malha(geoCil(3.2, 3.2, 2.4, eixo, 6), mats.metal, null, grupo);
    const d = (comp / 2 - 2.4) * s;
    p.position.set(x + (eixo === 'x' ? d : 0), y + (eixo === 'y' ? d : 0), z + (eixo === 'z' ? d : 0));
    pai.add(p);
  }
  return m;
}

// ---------- seringa (10 ml) ----------
// eixo local +x: do bico (x = 0) para o êmbolo. Corpo 12..97, aba em 97..99,5.
// set(s): posição da borracha (12..89); a água ocupa 12..s.
export const SER = { bico: 12, fim: 97, haste: 95, sMin: 12, sMax: 89 };
function criarSeringa(mats, nome, grupo, escrava) {
  const g = new THREE.Group(); g.name = nome;
  const add = (geo, mat, x = 0, nm) => { const m = malha(geo, mat, nm, grupo, true); m.position.x = x; g.add(m); return m; };
  add(geoCil(1.5, 1.5, 7, 'x', 10), mats.aba, 0);
  add(geoCil(2.4, 7.8, 5, 'x', 16), mats.aba, 7);
  const corpo = add(geoCil(8, 8, 85, 'x', 28, true), mats.seringa, 12, nome + '_Corpo');
  corpo.castShadow = false;
  const aba = malha(new THREE.BoxGeometry(2.5, 34, 22), mats.aba, nome + '_Aba', grupo, true);
  aba.position.x = 98.25; g.add(aba);
  // marcas de graduação (anéis finos)
  const geoMarca = geoCil(8.05, 8.05, 0.45, 'x', 20, true);
  for (let i = 0; i <= 5; i++) {
    const a = malha(geoMarca, mats.borracha, null, grupo, true);
    a.position.x = 26 + i * 12.12; a.castShadow = false; g.add(a);
  }
  const agua = add(geoCil(7, 7, 1, 'x', 20), mats.agua, 12, nome + '_Liquido');
  agua.castShadow = false;
  const emb = new THREE.Group(); emb.name = nome + '_Embolo'; g.add(emb);
  const b = malha(geoCil(7.3, 7.3, 8, 'x', 20), mats.borracha, null, grupo, true); emb.add(b);
  const h1 = malha(new THREE.BoxGeometry(87, 11, 1.6), mats.embolo, null, grupo, true); h1.position.x = 8 + 43.5; emb.add(h1);
  const h2 = malha(new THREE.BoxGeometry(87, 1.6, 11), mats.embolo, null, grupo, true); h2.position.x = 8 + 43.5; emb.add(h2);
  const pol = malha(geoCil(9.5, 9.5, 2.2, 'x', 20), mats.embolo, null, grupo, true); pol.position.x = 93; emb.add(pol);
  if (escrava) {
    const v = malha(geoCil(3.3, 3.3, 7, 'x', 12), mats.verde, null, grupo, true); v.position.x = -5; g.add(v);
  }
  let s = 50;
  return {
    grupo: g, embolo: emb, agua,
    set(v) { s = Math.min(SER.sMax, Math.max(SER.sMin, v)); emb.position.x = s; agua.scale.x = Math.max(s - SER.bico, 0.001); },
    get s() { return s; },
    get ml() { return (s - SER.bico) * AREA_SERINGA / 1000; },
  };
}

// ---------- garrafinha e engrenagem (eixo do objeto = z local, centro do corpo na origem) ----------
export function criarGarrafa(mats) {
  const g = new THREE.Group(); g.name = 'Garrafa';
  const perfil = [[0, -31], [14, -31], [17.5, -30], [20, -27], [20, 26], [18.5, 31], [14, 37], [11.2, 41], [11, 49], [12.6, 49.5], [12.6, 51]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const corpo = new THREE.LatheGeometry(perfil, 40);
  corpo.rotateX(Math.PI / 2);
  const m = malha(corpo, mats.garrafa, 'Garrafa_Corpo', 'objeto'); m.castShadow = true; g.add(m);
  const rot = malha(geoCil(20.4, 20.4, 26, 'z', 40, true), mats.rotulo, 'Garrafa_Rotulo', 'objeto'); rot.position.z = -12; g.add(rot);
  const tampa = malha(geoCil(12.4, 12.4, 11, 'z', 28), mats.tampa, 'Garrafa_Tampa', 'objeto'); tampa.position.z = 51; g.add(tampa);
  g.userData = { raio: 20, rotulo: 'Garrafinha Ø40 mm', massa_g: 28 };
  return g;
}
export function criarEngrenagem(mats) {
  const raio = 20, dentes = 16, t = raio - 3.2, n = 2 * Math.PI / dentes, s = new THREE.Shape();
  for (let o = 0; o < dentes; o++) {
    const a = o * n;
    [[t, a], [t, a + n * 0.18], [raio, a + n * 0.32], [raio, a + n * 0.58], [t, a + n * 0.72]].forEach(([l, h], u) =>
      (o === 0 && u === 0) ? s.moveTo(l * Math.cos(h), l * Math.sin(h)) : s.lineTo(l * Math.cos(h), l * Math.sin(h)));
  }
  s.closePath();
  const c = new THREE.Path(); c.absarc(0, 0, 6, 0.34, 2 * Math.PI - 0.34, false); c.lineTo(8.2, -2); c.lineTo(8.2, 2); c.closePath(); s.holes.push(c);
  for (let o = 0; o < 4; o++) { const a = o * Math.PI / 2 + Math.PI / 4; furo(s, 11 * Math.cos(a), 11 * Math.sin(a), 2.6); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 12, bevelEnabled: false, curveSegments: 16 });
  geo.translate(0, 0, -6);
  const g = new THREE.Group(); g.name = 'Engrenagem';
  g.add(malha(geo, mats.aco, 'Engrenagem_Aco', 'objeto'));
  g.userData = { raio: 20, rotulo: 'Engrenagem de aço Ø40 × 12 mm', massa_g: 0 };
  return g;
}

// ---------- dedo DC1 a partir do dedo_dc1.json ----------
function shapeDedo(dedo, espelhar) {
  // DXF (X,Y) -> plano da cabeça: x = Y (para a frente = -x), y = -X. Dedo espelhado: X -> -X.
  const sx = espelhar ? -1 : 1;
  const mapa = ([X, Y]) => new THREE.Vector2(Y, -sx * X);
  const s = new THREE.Shape(dedo.externo.map(mapa));
  for (const f of dedo.furos) {
    if (f.tipo === 'circulo') {
      const c = mapa(f.centro); furo(s, c.x, c.y, f.raio);
    } else s.holes.push(new THREE.Path(f.pts.map(mapa)));
  }
  return s;
}

// ======================================================================
export function criarBraco(dedo, opcoes = {}) {
  const mats = opcoes.materiais || criarMateriais();
  const G = GEOM;
  const raiz = new THREE.Group(); raiz.name = 'BracoRA';
  raiz.scale.setScalar(0.001); raiz.rotation.x = -Math.PI / 2;
  const MDF = [mats.mdf, mats.borda];
  const placa = (shape, t, plano, nome, grupo, pai, pos) => {
    const m = malha(geoPlaca(shape, t, plano), MDF, nome, grupo);
    if (pos) m.position.set(...pos);
    pai.add(m); return m;
  };

  // ----- base -----
  const b = G.base;
  placa(shapeRet(b.x0, b.y0, b.x1, b.y1, 6), b.t, 'XY', 'P00_Base', 'base', raiz, [0, 0, b.t / 2]);
  const [cx, cy] = G.centroGiro;
  const fixo = malha(geoCil(30, 30, 5, 'z', 48), [mats.borda, mats.mdf, mats.mdf], 'P13_Disco_Fixo', 'giro');
  fixo.position.set(cx, cy, 5); raiz.add(fixo);

  // caixa das seringas de comando (mestras)
  const ys = Object.values(G.mestraY);
  const frente = shapeRet(-56, 5, 56, 44, 0);
  for (const y of ys) furo(frente, y, G.mestraZ, 8.6);
  placa(frente, 5, 'YZ', 'P02_Caixa_Frente', 'painel', raiz, [100, 0, 0]);
  const tras = shapeRet(-56, 5, 56, 44, 0);
  for (const y of ys) furo(tras, y, G.mestraZ, 8.6);
  placa(tras, 5, 'YZ', 'P02_Caixa_Tras', 'painel', raiz, [64, 0, 0]);
  const topo = shapeRet(59, -58, 105, 58, 2);
  for (const y of ys) rasgo(topo, 82, y, 22, 3.2);
  placa(topo, 5, 'XY', 'P01_Caixa_Topo', 'painel', raiz, [0, 0, 46.5]);
  for (const s of [-1, 1]) {
    placa(shapeRet(64, 5, 100, 44, 0), 5, 'XZ', 'P17_Caixa_Lado', 'painel', raiz, [0, s * 53.5, 0]);
    for (const x of [66, 98]) {
      const p = malha(geoCil(4.5, 4.5, 1.6, 'z', 16), mats.metal, null, 'painel'); p.position.set(x, s * 50, 49); raiz.add(p);
    }
  }
  // suporte da seringa do giro
  placa(shapeRet(54, -64, 62, -50, 1), 8, 'XY', 'P22_Suporte_Giro', 'giro', raiz, [0, 0, 9]);

  // ----- giro -----
  const giro = new THREE.Group(); giro.name = 'Giro_Base'; giro.position.set(cx, cy, G.zGiro); raiz.add(giro);
  const disco = malha(geoCil(34, 34, 5, 'z', 56), [mats.borda, mats.mdf, mats.mdf], 'P07_Disco_Giro', 'giro'); giro.add(disco);
  const psi0 = -105 * R;
  const alav = new THREE.Group(); alav.rotation.z = psi0; giro.add(alav);
  placa(shapeBarra(27, 46, 12, [[40, 0]]), 5, 'XY', 'P07_Alavanca_Giro', 'giro', alav, [0, 0, 7.5]);
  const pinoGiro = malha(geoCil(1.6, 1.6, 16, 'z', 8), mats.metal, 'Pino_Alavanca_Giro', 'giro'); pinoGiro.position.set(40, 0, 1); alav.add(pinoGiro);
  // torre: 2 placas
  const tz = G.ombroZ;
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(-28, 5); sh.lineTo(28, 5); sh.lineTo(28, 12); sh.lineTo(11, 95);
    sh.absarc(0, tz, 11, -40 * R, 220 * R, false);
    sh.lineTo(-28, 12); sh.closePath();
    furo(sh, 0, tz); furo(sh, 18, 30);
    rasgo(sh, -8, 52, 4, 7); rasgo(sh, -6, 72, 4, 7); rasgo(sh, 8, 60, 4, 7);
    placa(sh, 5, 'XZ', s < 0 ? 'P09_Torre_E' : 'P09_Torre_D', 'ombro', giro, [0, s * G.torreY, 0]);
  }
  placa(shapeRet(-19.5, 5, 19.5, 40, 0), 5, 'YZ', 'P09_Travessa', 'ombro', giro, [-20, 0, 0]);
  parafuso(mats, giro, 0, 0, tz, 58, 'y', 'ombro');
  parafuso(mats, giro, 18, 0, 30, 54, 'y', 'ombro');

  // ----- ombro / lança (2 barras, 113 mm entre furos) -----
  const ombro = new THREE.Group(); ombro.name = 'Ombro'; ombro.position.set(0, 0, tz); giro.add(ombro);
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape();
    const L = G.lanca;
    sh.moveTo(-L, -7); sh.lineTo(28, -7); sh.lineTo(29, 12);
    sh.absarc(20, 14, 8, -10 * R, 180 * R, false);
    sh.lineTo(8, 7); sh.lineTo(-L, 7);
    sh.absarc(-L, 0, 7, Math.PI / 2, Math.PI * 1.5, false);
    furo(sh, 0, 0); furo(sh, -L, 0); furo(sh, -95, 0); furo(sh, 20, 14);
    rasgo(sh, -40, 0, 8, 3.2); rasgo(sh, -62, 0, 8, 3.2);
    placa(sh, 5, 'XZ', s < 0 ? 'P03_Lanca_E' : 'P03_Lanca_D', 'ombro', ombro, [0, s * G.lancaY, 0]);
  }
  parafuso(mats, ombro, -95, 0, 0, 36, 'y', 'ombro');
  parafuso(mats, ombro, 20, 0, 14, 36, 'y', 'cotovelo');

  // ----- cotovelo / antebraço (2 barras, 148 mm entre furos) -----
  const cot = new THREE.Group(); cot.name = 'Cotovelo'; cot.position.set(-G.lanca, 0, 0); ombro.add(cot);
  for (const s of [-1, 1]) {
    const sh = shapeBarra(-G.antebraco, 36, 14, [[0, 0], [30, 0], [-G.antebraco, 0]]);
    rasgo(sh, -75, 0, 10, 3.2); rasgo(sh, -95, 0, 10, 3.2);
    placa(sh, 5, 'XZ', s < 0 ? 'P05_Antebraco_E' : 'P05_Antebraco_D', 'cotovelo', cot, [0, s * G.anteY, 0]);
  }
  parafuso(mats, cot, 0, 0, 0, 50, 'y', 'cotovelo');
  parafuso(mats, cot, 30, 0, 0, 46, 'y', 'cotovelo');
  for (const x of [-50, -115]) {
    const sh = shapeRet(-22.5, -11, 22.5, 11, 2); furo(sh, 0, 0, 8.4);
    placa(sh, 5, 'YZ', 'Caixa_Garra', 'garra', cot, [x, 0, 0]);
  }

  // ----- cabeça da garra (original, sem alterações) -----
  const cab = new THREE.Group(); cab.name = 'Cabeca_Garra'; cab.position.set(-G.antebraco, 0, 0); cot.add(cab);
  parafuso(mats, cab, 0, 0, 0, 50, 'y', 'garra');
  for (const s of [-1, 1]) {
    placa(shapeRet(-6, 6, 6, 17.5, 1), 18, 'XY', 'P10_Bloco', 'garra', cab, [0, s > 0 ? 0 : -23.5, -1]);
  }
  const xP = G.pivoX, yP = G.pivoY;
  const shCab = () => {
    const sh = new THREE.Shape();
    const a = Math.atan2(-4.3, 7);
    sh.moveTo(6, -15); sh.lineTo(6, 15); sh.lineTo(-17, 23);
    sh.absarc(xP, yP, 6.5, a, 200 * R, false);
    sh.lineTo(-20, 14); sh.lineTo(-20, -14); sh.lineTo(xP + 6.5 * Math.cos(160 * R), -yP + 6.5 * Math.sin(160 * R));
    sh.absarc(xP, -yP, 6.5, 160 * R, 360 * R - a, false);
    sh.closePath();
    furo(sh, xP, yP); furo(sh, xP, -yP); furo(sh, 0, 11); furo(sh, 0, -11);
    return sh;
  };
  placa(shCab(), 5, 'XY', 'P10_Base_Garra_Sup', 'garra', cab, [0, 0, 5.5]);
  placa(shCab(), 5, 'XY', 'P10_Base_Garra_Inf', 'garra', cab, [0, 0, -7.5]);
  for (const s of [-1, 1]) {
    parafuso(mats, cab, xP, s * yP, -1, 26, 'z', 'garra');
    parafuso(mats, cab, 0, s * 11, -1, 26, 'z', 'garra');
  }
  // corrediça + elos
  const corr = new THREE.Group(); corr.name = 'Corredica'; cab.add(corr);
  corr.add(malha(geoPlaca(shapeRet(-4, -9, 6, 9, 1.5), 8, 'XY'), MDF, 'Corredica_Bloco', 'garra'));
  corr.children[0].position.z = -1;
  for (const s of [-1, 1]) { const p = malha(geoCil(1.6, 1.6, 12, 'z', 8), mats.metal, null, 'garra'); p.position.set(0, s * G.pinoCorredicaY, -4); corr.add(p); }
  const geoElo = geoPlaca(shapeBarra(0, G.elo, 6, [[0, 0], [G.elo, 0]]), 3, 'XY');
  const elos = [-1, 1].map(s => {
    const e = malha(geoElo, MDF, s < 0 ? 'Biela_Esquerda' : 'Biela_Direita', 'garra');
    e.position.z = 1.5; cab.add(e); return e;
  });
  // dedos DC1
  const dedos = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.name = s < 0 ? 'Dedo_Esquerdo' : 'Dedo_Direito';
    piv.position.set(xP, s * yP, G.dedoZ); cab.add(piv);
    const m = malha(geoPlaca(shapeDedo(dedo, s > 0), 5, 'XY', 16), MDF, s < 0 ? 'P12_Dedo_DC1_E' : 'P12_Dedo_DC1_D', 'garra');
    piv.add(m);
    const pD = malha(geoCil(1.6, 1.6, 12, 'z', 8), mats.latao, null, 'garra');
    const [X, Y] = G.D_dxf; pD.position.set(Y, -(s > 0 ? -1 : 1) * X, 1); piv.add(pD);
    piv.userData.malha = m;
    return piv;
  });
  const pontoGarra = new THREE.Object3D(); pontoGarra.name = 'Ponto_Garra';
  pontoGarra.position.set(G.pegaX, 0, G.dedoZ); cab.add(pontoGarra);

  // ----- seringas -----
  const mestras = {}, escravas = {};
  for (const j of JUNTAS) {
    const m = criarSeringa(mats, 'Mestra_' + j, j, false);
    m.grupo.position.set(G.mestraX, G.mestraY[j], G.mestraZ);
    raiz.add(m.grupo); mestras[j] = m;
    escravas[j] = criarSeringa(mats, 'Seringa_' + j, j, true);
  }
  // atuadores de dois pontos: bico fixo em "pai/ancora", polegar do êmbolo em "alvo/alvoLoc"
  const atuadores = {
    giro: { pai: raiz, ancora: new THREE.Vector3(60, -57, 18), alvo: alav, alvoLoc: new THREE.Vector3(40, 0, 8) },
    ombro: { pai: giro, ancora: new THREE.Vector3(18, 0, 30), alvo: ombro, alvoLoc: new THREE.Vector3(-95, 0, 0) },
    cotovelo: { pai: ombro, ancora: new THREE.Vector3(20, 0, 14), alvo: cot, alvoLoc: new THREE.Vector3(30, 0, 0) },
    garra: { pai: cot, ancora: new THREE.Vector3(-30, 0, 0), alvo: corr, alvoLoc: new THREE.Vector3(6, 0, 0) },
  };
  for (const j of JUNTAS) atuadores[j].pai.add(escravas[j].grupo);
  const X = new THREE.Vector3(1, 0, 0), tmp = new THREE.Vector3();
  function atualizarAtuador(j) {
    const a = atuadores[j], ser = escravas[j];
    a.alvo.localToWorld(tmp.copy(a.alvoLoc));
    a.pai.worldToLocal(tmp);
    tmp.sub(a.ancora);
    const L = tmp.length();
    ser.grupo.position.copy(a.ancora);
    ser.grupo.quaternion.setFromUnitVectors(X, tmp.divideScalar(L));
    ser.set(L - SER.haste);
    // mestra: a água sai de uma e entra na outra (Pascal, mesma seringa)
    const aguaEscrava = ser.s - SER.bico;
    mestras[j].set(SER.bico + (SER.sMax - SER.bico) - aguaEscrava);
    a.L = L;
  }

  // ----- mangueiras -----
  const P = (obj, x, y, z) => ({ obj, v: new THREE.Vector3(x, y, z) });
  const bicoM = j => [P(mestras[j].grupo, 0, 0, 0), P(mestras[j].grupo, -14, 0, 0)];
  const bicoE = j => [P(escravas[j].grupo, -14, 0, 0), P(escravas[j].grupo, -2, 0, 0)];
  const rotas = {
    giro: [...bicoM('giro'), P(raiz, 4, -52, 30), P(raiz, 36, -66, 30), P(raiz, 72, -64, 20), ...bicoE('giro')],
    ombro: [...bicoM('ombro'), P(raiz, -16, -12, 10), P(raiz, -40, -8, 8), P(giro, 44, -4, 13), P(giro, 34, 0, 16), ...bicoE('ombro')],
    cotovelo: [...bicoM('cotovelo'), P(raiz, -16, 12, 10), P(raiz, -40, 10, 8), P(giro, 44, 7, 13), P(giro, 36, 9, 45), P(giro, 26, 8, 88), P(ombro, 46, 5, 20), ...bicoE('cotovelo')],
    garra: [...bicoM('garra'), P(raiz, -16, 34, 10), P(raiz, -40, 16, 8), P(giro, 46, 12, 14), P(giro, 38, 13, 48), P(giro, 28, 12, 92), P(ombro, 44, 10, 30),
      P(ombro, -10, 6, 30), P(ombro, -80, 4, 30), P(cot, 14, 0, 18), P(cot, -6, 0, 10), ...bicoE('garra')],
  };
  const tubos = {};
  if (opcoes.mangueiras !== false) {
    for (const j of JUNTAS) {
      const m = malha(new THREE.BufferGeometry(), mats.mangueira, 'Mangueira_' + j, j, true);
      m.castShadow = true; raiz.add(m); tubos[j] = m;
    }
  }
  const pts = [];
  function atualizarMangueiras() {
    for (const j of Object.keys(tubos)) {
      pts.length = 0;
      for (const p of rotas[j]) pts.push(raiz.worldToLocal(p.obj.localToWorld(p.v.clone())));
      const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      tubos[j].geometry.dispose();
      tubos[j].geometry = new THREE.TubeGeometry(curva, 72, 2.2, 7, false);
    }
  }

  // ----- estado -----
  const estado = { giro: 0, ombro: 55, cotovelo: -105, garra: 0.3 };
  const limitar = (j, v) => Math.min(LIMITES[j][1], Math.max(LIMITES[j][0], v));
  function posDedos(phi) {
    const [X, Y] = G.D_dxf;
    const res = { phi, D: [], corr: 0 };
    for (const s of [-1, 1]) {
      // D no plano da cabeça (dedo -1: rot +phi; dedo +1: espelhado, rot -phi)
      const a = s < 0 ? phi : -phi;
      const lx = Y, ly = s < 0 ? -X : X;
      res.D.push([xP + lx * Math.cos(a) - ly * Math.sin(a), s * yP + lx * Math.sin(a) + ly * Math.cos(a)]);
    }
    const [Dx, Dy] = res.D[0];
    const dy = Math.abs(Dy) - G.pinoCorredicaY;
    res.corr = Dx + Math.sqrt(Math.max(G.elo * G.elo - dy * dy, 0));
    return res;
  }
  function aplicarJuntas() {
    giro.rotation.z = estado.giro * R;
    ombro.rotation.y = estado.ombro * R;
    cot.rotation.y = estado.cotovelo * R;
    const phi = estado.garra * PHI_MAX * R;
    dedos[0].rotation.z = phi; dedos[1].rotation.z = -phi;
    const pd = posDedos(phi);
    corr.position.x = pd.corr;
    elos.forEach((e, i) => {
      const s = i === 0 ? -1 : 1;
      const px = pd.corr, py = s * G.pinoCorredicaY, [dx, dy] = pd.D[i];
      e.position.set(px, py, 1.5);
      e.rotation.z = Math.atan2(dy - py, dx - px);
    });
  }
  function definir(novo = {}, rapido = false) {
    for (const j of JUNTAS) if (novo[j] !== undefined && Number.isFinite(novo[j])) estado[j] = limitar(j, novo[j]);
    aplicarJuntas();
    raiz.updateMatrixWorld(true);
    if (rapido) return estado;
    for (const j of JUNTAS) atualizarAtuador(j);
    raiz.updateMatrixWorld(true);
    atualizarMangueiras();
    return estado;
  }

  // pontos úteis no referencial do modelo (mm, Z para cima)
  const vtmp = new THREE.Vector3();
  const noModelo = (obj, v = new THREE.Vector3()) => raiz.worldToLocal(obj.localToWorld(v));
  function amostrasDedos() {
    const out = [];
    for (const d of dedos) {
      const pos = d.userData.malha.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 7) {
        vtmp.fromBufferAttribute(pos, i);
        out.push(raiz.worldToLocal(d.userData.malha.localToWorld(vtmp.clone())));
      }
    }
    return out;
  }
  const menorZDedos = () => Math.min(...amostrasDedos().map(p => p.z));
  const eixoCabeca = () => {
    const o = noModelo(cab, new THREE.Vector3(0, 0, 0)), z = noModelo(cab, new THREE.Vector3(0, 0, 1));
    return z.sub(o).normalize();
  };

  const braco = {
    raiz, mats, estado, definir, posDedos, noModelo, menorZDedos, eixoCabeca,
    no: { giro, ombro, cotovelo: cot, cabeca: cab, dedos, pontoGarra, corredica: corr, alavanca: alav },
    seringas: { mestras, escravas }, atuadores,
    phi: () => estado.garra * PHI_MAX,
    abertura: () => aberturaBoca(estado.garra * PHI_MAX),
  };
  definir({});
  return braco;
}

// Procura (ombro, cotovelo) que põe o centro da concha na altura hAlvo, com os dedos acima da mesa
// e o plano da garra o mais próximo possível da vertical.
export function calcularPoseDePega(braco, hAlvo = 20) {
  const salvo = { ...braco.estado };
  let melhor = null;
  for (let th = 85; th >= 40; th -= 1) {
    for (let be = -150; be <= -40; be += 0.5) {
      braco.definir({ giro: 0, ombro: th, cotovelo: be, garra: PHI_CONTATO / PHI_MAX }, true);
      const p = braco.noModelo(braco.no.pontoGarra);
      if (p.z < hAlvo - 0.25 || p.z > hAlvo + 8) continue;
      const zMin1 = braco.menorZDedos();
      braco.definir({ garra: 1 }, true);
      const zMin2 = braco.menorZDedos();
      if (Math.min(zMin1, zMin2) < 0.5) continue;
      const inclin = Math.asin(Math.abs(braco.eixoCabeca().z)) / R;
      const nota = (p.z - hAlvo) + 0.35 * inclin;
      if (!melhor || nota < melhor.nota) melhor = { ombro: th, cotovelo: be, z: p.z, inclinacao: inclin, zMin: Math.min(zMin1, zMin2), raio: Math.hypot(p.x - GEOM.centroGiro[0], p.y - GEOM.centroGiro[1]), nota };
    }
  }
  braco.definir(salvo);
  return melhor;
}

// Transformação de repouso de um objeto Ø40 deitado (eixo horizontal) sob o ponto de pega da pose dada.
export function poseObjetoNaPega(braco, giro, pose = POSE_PEGA) {
  const salvo = { ...braco.estado };
  braco.definir({ giro, ombro: pose.ombro, cotovelo: pose.cotovelo, garra: PHI_CONTATO / PHI_MAX }, true);
  const p = braco.noModelo(braco.no.pontoGarra);
  const ez = braco.eixoCabeca();
  ez.z = 0; ez.normalize();
  // eixo do objeto apontando para fora (longe do giro)
  const rad = new THREE.Vector3(p.x - GEOM.centroGiro[0], p.y - GEOM.centroGiro[1], 0).normalize();
  if (ez.dot(rad) < 0) ez.negate();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ez);
  braco.definir(salvo);
  return { posicao: new THREE.Vector3(p.x, p.y, 20), quaternion: q };
}
