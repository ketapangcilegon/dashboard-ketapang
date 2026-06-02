export interface BenchmarkIndicator {
  no: number;
  indicator: string;
  unit: string;
  nationalStandard: number | string | null;
  history: {
    '2021': number;
    '2022': number;
    '2023': number;
    '2024': number;
  };
}

export const BENCHMARKS: BenchmarkIndicator[] = [
  {
    no: 1,
    indicator: 'Pencapaian Skor Pola Pangan Harapan (PPH)',
    unit: 'Poin',
    nationalStandard: 90,
    history: { '2021': 88.3, '2022': 85.5, '2023': 89.8, '2024': 90.9 }
  },
  {
    no: 2,
    indicator: '% Agregat Konsumsi Energi & Protein',
    unit: '%',
    nationalStandard: 100,
    history: { '2021': 101.89, '2022': 103.91, '2023': 116.21, '2024': 100.22 }
  },
  {
    no: 3,
    indicator: 'Tingkat Konsumsi Energi',
    unit: 'kkal/kapita/hari',
    nationalStandard: 2100,
    history: { '2021': 1811, '2022': 1970, '2023': 2272, '2024': 2021 }
  },
  {
    no: 4,
    indicator: 'Tingkat Konsumsi Protein',
    unit: 'gram/kapita/hari',
    nationalStandard: 57,
    history: { '2021': 67, '2022': 65, '2023': 71, '2024': 59 }
  },
  {
    no: 5,
    indicator: '% Agregat Ketersediaan Energi & Protein',
    unit: '%',
    nationalStandard: 100,
    history: { '2021': 125, '2022': 117, '2023': 121, '2024': 121 }
  },
  {
    no: 6,
    indicator: 'Tingkat Ketersediaan Energi',
    unit: 'kkal/kapita/hari',
    nationalStandard: 2400,
    history: { '2021': 2525, '2022': 2529, '2023': 2582, '2024': 2582 }
  },
  {
    no: 7,
    indicator: 'Tingkat Ketersediaan Protein',
    unit: 'gram/kapita/hari',
    nationalStandard: 63,
    history: { '2021': 92, '2022': 81, '2023': 85, '2024': 85 }
  },
  {
    no: 8,
    indicator: 'Jumlah Cadangan Pangan Pemerintah Daerah',
    unit: 'Ton',
    nationalStandard: 100,
    history: { '2021': 94.9, '2022': 102.2, '2023': 100.5, '2024': 132.7 }
  },
  {
    no: 9,
    indicator: 'Stabilitas Harga Pangan (Coefficient of Variation)',
    unit: '%',
    nationalStandard: 'CV < 10%',
    history: { '2021': 3.65, '2022': 1.45, '2023': 5.21, '2024': 3.65 }
  },
  {
    no: 10,
    indicator: 'Persentase Wilayah Rawan Pangan yang Ditangani',
    unit: '%',
    nationalStandard: 100,
    history: { '2021': 100, '2022': 100, '2023': 100, '2024': 100 }
  },
  {
    no: 11,
    indicator: 'Tingkat Pengawasan Pangan Segar',
    unit: '%',
    nationalStandard: 80,
    history: { '2021': 94.3, '2022': 80, '2023': 100, '2024': 85.9 }
  },
  {
    no: 12,
    indicator: 'Jumlah Sampel Total',
    unit: 'sampel',
    nationalStandard: null,
    history: { '2021': 70, '2022': 90, '2023': 70, '2024': 78 }
  },
  {
    no: 13,
    indicator: 'Jumlah Sampel yang Aman',
    unit: 'sampel',
    nationalStandard: null,
    history: { '2021': 66, '2022': 72, '2023': 70, '2024': 67 }
  }
];
