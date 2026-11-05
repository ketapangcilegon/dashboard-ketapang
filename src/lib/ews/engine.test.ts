/**
 * Unit test engine EWS. Jalankan: `npx tsx --test src/lib/ews/engine.test.ts`
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyValue,
  coefficientOfVariation,
  compositeStatusFromScore,
  evaluateCommodity,
  evaluateAll,
  groupStatusFromScore,
  INTERSECTION_MATRIX,
  matrixLookup,
  pctChange,
  sensitivityAnalysis,
  yoyPct,
  type EwsInput,
  type RiskStatus
} from './engine';
import { DEFAULT_EWS_CONFIG } from './thresholds';

const CFG = DEFAULT_EWS_CONFIG;
const near = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** Bangun input dari persentase target tiap dimensi (harga aktual 10.000). */
function mk(p: { f1: number | null; f3: number | null; cv: number | null; yoy: number | null }, komoditas = 'harga_beras'): EwsInput {
  const base = 10000;
  return {
    komoditas,
    hargaAktual: base,
    forecast1m: p.f1 === null ? null : base * (1 + p.f1 / 100),
    forecast3m: p.f3 === null ? null : base * (1 + p.f3 / 100),
    cv: p.cv,
    yoy: p.yoy
  };
}
// Nilai representatif tiap level per dimensi (komoditas default).
const V = {
  f1: [1, 6, 15],
  f3: [2, 10, 25],
  cv: [3, 7, 12],
  yoy: [2, 7, 12]
} as const;
const lv = (l: 0 | 1 | 2) => ({ f1: V.f1[l], f3: V.f3[l], cv: V.cv[l], yoy: V.yoy[l] });

test('rumus dasar: perubahan persen, YoY, dan CV (STDEV.P vs STDEV.S)', () => {
  near(pctChange(100, 110), 10);
  near(pctChange(200, 150), -25);
  assert.equal(pctChange(0, 10), null);
  assert.equal(pctChange(null, 10), null);
  near(yoyPct(120, 100), 20);
  near(coefficientOfVariation([10, 12, 14, 16, 18], 'population'), (Math.sqrt(8) / 14) * 100, 1e-9);
  near(coefficientOfVariation([10, 12, 14, 16, 18], 'sample'), (Math.sqrt(10) / 14) * 100, 1e-9);
  assert.equal(coefficientOfVariation([5]), null);
  assert.equal(coefficientOfVariation([0, 0, 0]), null);
});

test('batas threshold inklusif: ≤ batas = kelas bawah', () => {
  const th = { waspada: 5, awas: 10, kritis: 10, basis: 'spec' as const, catatan: '' };
  assert.equal(classifyValue(5, th), 0);
  assert.equal(classifyValue(5.0001, th), 1);
  assert.equal(classifyValue(10, th), 1);
  assert.equal(classifyValue(10.0001, th), 2);
  assert.equal(classifyValue(-30, th), 0);
  assert.equal(classifyValue(null, th), null);
  assert.equal(classifyValue(NaN, th), null);
});

test('threshold CV: AMAN ≤5, WASPADA 5–10, AWAS >10', () => {
  assert.equal(evaluateCommodity(mk({ ...lv(0), cv: 5 }), CFG).dimensions.cv.status, 'AMAN');
  assert.equal(evaluateCommodity(mk({ ...lv(0), cv: 10 }), CFG).dimensions.cv.status, 'WASPADA');
  assert.equal(evaluateCommodity(mk({ ...lv(0), cv: 10.01 }), CFG).dimensions.cv.status, 'AWAS');
});

test('override threshold per komoditas (YoY telur/minyak AWAS >15)', () => {
  const telur = evaluateCommodity(mk({ ...lv(0), yoy: 12 }, 'harga_telur_ayam_ras'), CFG);
  const beras = evaluateCommodity(mk({ ...lv(0), yoy: 12 }, 'harga_beras'), CFG);
  assert.equal(telur.dimensions.yoy.status, 'WASPADA');
  assert.equal(beras.dimensions.yoy.status, 'AWAS');
});

test('batas skor komposit tidak tumpang tindih: 0.49→AMAN, 0.50→WASPADA, 1.19→WASPADA, 1.20→AWAS', () => {
  assert.equal(compositeStatusFromScore(0.49, CFG), 'AMAN');
  assert.equal(compositeStatusFromScore(0.5, CFG), 'WASPADA');
  assert.equal(compositeStatusFromScore(1.19, CFG), 'WASPADA');
  assert.equal(compositeStatusFromScore(1.2, CFG), 'AWAS');
  assert.equal(compositeStatusFromScore(2, CFG), 'AWAS');
});

test('batas skor kelompok: 0.49→AMAN, 0.50→WASPADA, 1.49→WASPADA, 1.50→AWAS', () => {
  assert.equal(groupStatusFromScore(0.49, CFG), 'AMAN');
  assert.equal(groupStatusFromScore(0.5, CFG), 'WASPADA');
  assert.equal(groupStatusFromScore(1.49, CFG), 'WASPADA');
  assert.equal(groupStatusFromScore(1.5, CFG), 'AWAS');
});

test('bobot sama 25% dan skor komposit untuk seluruh 81 kombinasi level (3^4)', () => {
  let n = 0;
  for (const a of [0, 1, 2] as const)
    for (const b of [0, 1, 2] as const)
      for (const c of [0, 1, 2] as const)
        for (const d of [0, 1, 2] as const) {
          const r = evaluateCommodity(mk({ f1: V.f1[a], f3: V.f3[b], cv: V.cv[c], yoy: V.yoy[d] }), CFG);
          const expected = 0.25 * (a + b + c + d);
          near(r.compositeScore, expected);
          near(r.riskIndexPct, (expected / 2) * 100, 0.06);
          assert.equal(r.status, compositeStatusFromScore(expected, CFG));
          n++;
        }
  assert.equal(n, 81);
  assert.equal(Object.values(CFG.weights).reduce((s, w) => s + w, 0), 1);
});

test('matriks irisan 3×3: sembilan sel sesuai spesifikasi', () => {
  const S: RiskStatus[] = ['AMAN', 'WASPADA', 'AWAS'];
  const expected: Record<string, RiskStatus> = {
    'AMAN|AMAN': 'AMAN', 'AMAN|WASPADA': 'AMAN', 'AMAN|AWAS': 'WASPADA',
    'WASPADA|AMAN': 'AMAN', 'WASPADA|WASPADA': 'WASPADA', 'WASPADA|AWAS': 'AWAS',
    'AWAS|AMAN': 'WASPADA', 'AWAS|WASPADA': 'AWAS', 'AWAS|AWAS': 'AWAS'
  };
  for (const act of S) for (const pred of S) {
    assert.equal(matrixLookup(act, pred), expected[`${act}|${pred}`], `${act}×${pred}`);
    assert.equal(INTERSECTION_MATRIX[act][pred], expected[`${act}|${pred}`]);
  }
});

test('matriks pada hasil evaluasi: kelompok prediktif & aktual dipetakan benar (semua level seragam)', () => {
  const S: RiskStatus[] = ['AMAN', 'WASPADA', 'AWAS'];
  for (let p = 0 as 0 | 1 | 2; p <= 2; p = (p + 1) as 0 | 1 | 2) {
    for (let a = 0 as 0 | 1 | 2; a <= 2; a = (a + 1) as 0 | 1 | 2) {
      const r = evaluateCommodity(mk({ f1: V.f1[p], f3: V.f3[p], cv: V.cv[a], yoy: V.yoy[a] }), CFG);
      assert.equal(r.predictiveStatus, S[p]);
      assert.equal(r.actualStatus, S[a]);
      assert.equal(r.matrixStatus, matrixLookup(S[a], S[p]));
      if (a === 2 && p === 2) break;
    }
    if (p === 2) break;
  }
});

test('diagnostik: komposit berbeda dari matriks ditampilkan keduanya, komposit tidak diubah', () => {
  const sama = evaluateCommodity(mk({ f1: V.f1[2], f3: V.f3[0], cv: V.cv[2], yoy: V.yoy[0] }), CFG);
  assert.equal(sama.status, 'WASPADA');
  assert.equal(sama.diagnostic.sesuai, true);

  const beda = evaluateCommodity(mk({ f1: V.f1[2], f3: V.f3[0], cv: V.cv[0], yoy: V.yoy[0] }), CFG);
  assert.equal(beda.status, 'WASPADA');
  assert.equal(beda.matrixStatus, 'AMAN');
  assert.equal(beda.diagnostic.sesuai, false);
  assert.match(beda.diagnostic.penjelasan, /berbeda dari status komposit WASPADA/);
});

test('override R1: CV & YoY sama-sama AWAS → peringatan tekanan harga & volatilitas', () => {
  const r = evaluateCommodity(mk(lv(2)), CFG);
  assert.ok(r.overrides.some((o) => o.id === 'R1-cv-yoy-awas'));
  assert.ok(r.overrides.some((o) => o.id === 'R2-f1-f3-awas'));
});

test('override R3: CV AWAS tetapi YoY AMAN → risiko volatilitas, bukan krisis kenaikan harga', () => {
  const r = evaluateCommodity(mk({ ...lv(0), cv: 12 }), CFG);
  const f = r.overrides.find((o) => o.id === 'R3-cv-awas-yoy-aman');
  assert.ok(f);
  assert.match(f!.judul, /volatilitas/i);
  assert.ok(!r.overrides.some((o) => o.id === 'R1-cv-yoy-awas'));
});

test('data tidak lengkap: indikator kosong BUKAN dianggap AMAN & komposit tidak dihitung', () => {
  const r = evaluateCommodity(mk({ f1: 1, f3: null, cv: 3, yoy: 2 }), CFG);
  assert.equal(r.dimensions.f3.status, 'DATA TIDAK TERSEDIA');
  assert.equal(r.status, 'DATA TIDAK LENGKAP');
  assert.equal(r.compositeScore, null);
  assert.equal(r.matrixStatus, null);
  assert.equal(r.complete, false);
  assert.ok(r.overrides.some((o) => o.id === 'R4-R6-data-tidak-lengkap'));
});

test('forecast tidak valid (0 / negatif / NaN) → DATA TIDAK TERSEDIA', () => {
  for (const bad of [0, -5, NaN]) {
    const r = evaluateCommodity({ ...mk(lv(0)), forecast1m: bad }, CFG);
    assert.equal(r.dimensions.f1.status, 'DATA TIDAK TERSEDIA');
    assert.equal(r.status, 'DATA TIDAK LENGKAP');
  }
  const noPrice = evaluateCommodity({ ...mk(lv(0)), hargaAktual: 0 }, CFG);
  assert.equal(noPrice.status, 'DATA TIDAK LENGKAP');
});

test('YoY tidak boleh diganti nilai default (tidak ada fallback −3%)', () => {
  const r = evaluateCommodity(mk({ f1: 1, f3: 2, cv: 3, yoy: null }), CFG);
  assert.equal(r.dimensions.yoy.value, null);
  assert.equal(r.status, 'DATA TIDAK LENGKAP');
});

test('ketidakpastian: interval melintasi ambang → statusDapatBerubah', () => {
  const input = { ...mk({ f1: 4, f3: 2, cv: 3, yoy: 2 }), lower1m: 10000 * 1.01, upper1m: 10000 * 1.12 };
  const r = evaluateCommodity(input, CFG);
  assert.equal(r.uncertainty.tersedia, true);
  assert.equal(r.uncertainty.statusDapatBerubah, true);
  assert.equal(r.uncertainty.levelMin, 0);
  assert.equal(r.uncertainty.levelMax, 2);
  const none = evaluateCommodity(mk({ f1: 4, f3: 2, cv: 3, yoy: 2 }), CFG);
  assert.equal(none.uncertainty.tersedia, false);
});

test('nilai ekstrem tidak diubah, hanya diberi peringatan', () => {
  const r = evaluateCommodity(mk({ f1: 80, f3: 90, cv: 3, yoy: 2 }), CFG);
  assert.ok(r.overrides.some((o) => o.id === 'extreme-forecast-warning'));
  near(r.dimensions.f1.value, 80, 1e-6);
});

test('agregasi ringkasan & analisis sensitivitas', () => {
  const inputs = [mk(lv(0)), mk(lv(1)), mk(lv(2)), mk({ f1: null, f3: 1, cv: 1, yoy: 1 })];
  const { summary } = evaluateAll(inputs, CFG);
  assert.equal(summary.total, 4);
  assert.equal(summary.aman, 1);
  assert.equal(summary.waspada, 1);
  assert.equal(summary.awas, 1);
  assert.equal(summary.kritis, 1); // Kompatibilitas mundur
  assert.equal(summary.tidakLengkap, 1);
  const sens = sensitivityAnalysis(inputs, CFG);
  assert.equal(sens.length, 4);
  for (const s of sens) assert.ok(s.stabilPct >= 0 && s.stabilPct <= 100);
});
