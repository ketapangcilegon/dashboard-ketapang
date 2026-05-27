import { WEIGHTS, COMPOSITE_CUTOFF } from './constants'
import { normalizeValue, getPriorityIndividual } from './normalization'
import { CalculatedIndicators } from './form1-calculator'

export interface FSVAResult {
  // Prioritas individu
  p_ncpr: number; p_energy: number; p_protein: number; p_cadangan: number
  p_poverty: number; p_cv_harga: number; p_pou: number
  p_sekolah: number; p_air: number; p_pph: number; p_stunting: number
  // Skor normalisasi
  x_ncpr: number; x_energy: number; x_protein: number; x_cadangan: number
  x_poverty: number; x_cv_harga: number; x_pou: number
  x_sekolah: number; x_air: number; x_pph: number; x_stunting: number
  // Hasil akhir
  skor_komposit: number
  indeks_komposit: number
  prioritas: number
  indeks_ketersediaan: number
  indeks_keterjangkauan: number
  indeks_pemanfaatan: number
}

export function calculateFSVAResult(indicators: CalculatedIndicators): FSVAResult {
  // Step 1: Normalisasi nilai aktual (0-1)
  const x_ncpr     = normalizeValue('ncpr',     indicators.ncpr)
  const x_energy   = normalizeValue('energy',   indicators.pct_ake)
  const x_protein  = normalizeValue('protein',  indicators.pct_prohe)
  const x_cadangan = normalizeValue('cadangan', indicators.rasio_cadangan)
  const x_poverty  = normalizeValue('poverty',  indicators.pct_miskin)
  const x_cv_harga = normalizeValue('cv_harga', indicators.cv_harga)
  const x_pou      = normalizeValue('pou',      indicators.pou)
  const x_sekolah  = normalizeValue('sekolah',  indicators.lama_sekolah)
  const x_air      = normalizeValue('air',      indicators.pct_no_water)
  const x_pph      = normalizeValue('pph',      indicators.skor_pph)
  const x_stunting = normalizeValue('stunting', indicators.pct_stunting)

  // Step 2: Skor komposit Y(j) = Σ ai × xij (Rumus 2 Juknis)
  const skor = (
    x_ncpr     * WEIGHTS.ncpr     +
    x_energy   * WEIGHTS.energy   +
    x_protein  * WEIGHTS.protein  +
    x_cadangan * WEIGHTS.cadangan +
    x_poverty  * WEIGHTS.poverty  +
    x_cv_harga * WEIGHTS.cv_harga +
    x_pou      * WEIGHTS.pou      +
    x_sekolah  * WEIGHTS.sekolah  +
    x_air      * WEIGHTS.air      +
    x_pph      * WEIGHTS.pph      +
    x_stunting * WEIGHTS.stunting
  )

  // Step 3: Indeks komposit (0-100)
  const indeks = skor // sudah dalam skala 0-100 karena bobot total = 100

  // Step 4: Tentukan prioritas (Tabel 4 Juknis)
  let prioritas: number
  if (indeks < COMPOSITE_CUTOFF.p1_max)      prioritas = 1
  else if (indeks < COMPOSITE_CUTOFF.p2_max) prioritas = 2
  else if (indeks < COMPOSITE_CUTOFF.p3_max) prioritas = 3
  else if (indeks < COMPOSITE_CUTOFF.p4_max) prioritas = 4
  else if (indeks < COMPOSITE_CUTOFF.p5_max) prioritas = 5
  else                                        prioritas = 6

  // Step 5: Indeks per aspek (proporsi dari bobot aspek)
  const total_ketersediaan = WEIGHTS.ncpr + WEIGHTS.energy + WEIGHTS.protein + WEIGHTS.cadangan
  const total_keterjangkauan = WEIGHTS.poverty + WEIGHTS.cv_harga + WEIGHTS.pou
  const total_pemanfaatan = WEIGHTS.sekolah + WEIGHTS.air + WEIGHTS.pph + WEIGHTS.stunting

  const indeks_ketersediaan = (
    (x_ncpr * WEIGHTS.ncpr + x_energy * WEIGHTS.energy +
     x_protein * WEIGHTS.protein + x_cadangan * WEIGHTS.cadangan)
    / total_ketersediaan * 100
  )
  const indeks_keterjangkauan = (
    (x_poverty * WEIGHTS.poverty + x_cv_harga * WEIGHTS.cv_harga + x_pou * WEIGHTS.pou)
    / total_keterjangkauan * 100
  )
  const indeks_pemanfaatan = (
    (x_sekolah * WEIGHTS.sekolah + x_air * WEIGHTS.air +
     x_pph * WEIGHTS.pph + x_stunting * WEIGHTS.stunting)
    / total_pemanfaatan * 100
  )

  return {
    p_ncpr:     getPriorityIndividual('ncpr',     indicators.ncpr),
    p_energy:   getPriorityIndividual('energy',   indicators.pct_ake),
    p_protein:  getPriorityIndividual('protein',  indicators.pct_prohe),
    p_cadangan: getPriorityIndividual('cadangan', indicators.rasio_cadangan),
    p_poverty:  getPriorityIndividual('poverty',  indicators.pct_miskin),
    p_cv_harga: getPriorityIndividual('cv_harga', indicators.cv_harga),
    p_pou:      getPriorityIndividual('pou',      indicators.pou),
    p_sekolah:  getPriorityIndividual('sekolah',  indicators.lama_sekolah),
    p_air:      getPriorityIndividual('air',      indicators.pct_no_water),
    p_pph:      getPriorityIndividual('pph',      indicators.skor_pph),
    p_stunting: getPriorityIndividual('stunting', indicators.pct_stunting),
    x_ncpr, x_energy, x_protein, x_cadangan,
    x_poverty, x_cv_harga, x_pou,
    x_sekolah, x_air, x_pph, x_stunting,
    skor_komposit: skor,
    indeks_komposit: indeks,
    prioritas,
    indeks_ketersediaan,
    indeks_keterjangkauan,
    indeks_pemanfaatan,
  }
}
