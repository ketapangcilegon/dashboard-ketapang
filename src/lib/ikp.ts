export interface IKPData {
  year: number;
  cilegon: number;
  banten: number;
  cilegonKategori: string;
  bantenKategori: string;
}

export const IKP_HISTORY: IKPData[] = [
  { year: 2020, cilegon: 70.23, banten: 73.48, cilegonKategori: 'Tahan', bantenKategori: 'Tahan' },
  { year: 2021, cilegon: 71.42, banten: 74.38, cilegonKategori: 'Sangat Tahan', bantenKategori: 'Tahan' },
  { year: 2022, cilegon: 72.63, banten: 73.78, cilegonKategori: 'Sangat Tahan', bantenKategori: 'Tahan' },
  { year: 2023, cilegon: 81.54, banten: 78.71, cilegonKategori: 'Sangat Tahan', bantenKategori: 'Sangat Tahan' },
  { year: 2024, cilegon: 80.12, banten: 79.25, cilegonKategori: 'Sangat Tahan', bantenKategori: 'Sangat Tahan' }
];

export const POU_HISTORY = [
  { year: 2021, value: 2.46 },
  { year: 2022, value: 2.04 },
  { year: 2023, value: 2.19 },
  { year: 2024, value: 1.96 },
  { year: 2025, value: 2.78 }
];
