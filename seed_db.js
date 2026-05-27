const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Raw Cilegon Kelurahan landscape data (2025)
const LANDSCAPE_DATA = `
19	2025	CIWANDAN	3672010	Gunung Sugih	3672010001	3475	3265	6740	 713.4 	 15.4 	205.82	0	8.575	0.1	2055.48	2100	18.995375	25	1.86186295	13.47181009	2.308420057	9.209808761	2.308420057	92.9108	4.175824176
20	2025	CIWANDAN	3672010	Kepuh	3672010002	4757	4569	9326	 876.0 	 57.6 	240.12	0.978947	8.575	0	2032.8	2100	18.4821	25	2.576221642	18.0355994	2.250728863	9.506947446	2.250728863	92.3917	5.83
21	2025	CIWANDAN	3672010	Randakari	3672010003	5037	4808	9845	 367.6 	 33.7 	280.14	1.468421	9.8	0	2017.47	2100	18.620425	25	2.719590614	15.5408837	2.63895376	9.698807865	2.63895376	91.9893	3.51
17	2025	CIWANDAN	3672010	Tegal Ratu	3672010004	6133	5854	11987	 623.6 	 78.3 	514.54	0.978947	8.575	0.2	2055.27	2100	19.6346	25	3.311298394	9.493618086	2.314814815	10.22572099	2.314814815	92.8854	4.57
16	2025	CIWANDAN	3672010	Banjar Negara	3672010005	4271	4204	8475	 230.5 	 37.4 	291.58	0.978947	6.125	0.1	2068.08	2100	19.601325	25	2.341140727	19.37463127	2.097462949	9.43956667	2.097462949	92.8137	4.21
18	2025	CIWANDAN	3672010	Kubangsari	3672010013	4219	4014	8233	 444.4 	 45.6 	400.2	4.894737	7.35	0.1	2035.95	2100	19.561775	25	2.274290455	17.3812705	2.266794889	10.15895608	2.266794889	92.483	6.96
38	2025	CITANGKIL	3672011	Deringo	3672011006	5421	5044	10465	 273.7 	 23.2 	328.14	1.4	15	2.625	2034.69	2100	19.003975	25	2.890859906	19.0253225	1.985339035	9.759053047	1.985339035	92.3837	1.64
39	2025	CITANGKIL	3672011	Lebak Denok	3672011007	6673	6649	13322	 292.5 	 17.0 	293.6	1.5	15	1.3125	2032.17	2100	19.277	25	3.680079854	8.369614172	2.742557883	10.2046756	2.742557883	92.3077	1.17
40	2025	CITANGKIL	3672011	Taman Baru	3672011008	5010	4920	9930	 456.9 	 34.8 	483.58	2.3	15	3.62	2058.63	2100	20.72925	25	2.743071082	11.02719033	1.777177302	11.30033391	1.777177302	92.973	5.72
43	2025	CITANGKIL	3672011	Citangkil	3672011009	8399	8352	16751	 142.6 	 5.2 	23.03	0.7	3	1.3125	2049.81	2100	20.9528	25	4.627309535	7.718942153	2.295652174	11.03377095	2.295652174	92.7615	5.93
41	2025	CITANGKIL	3672011	Kebonsari	3672011010	6193	6025	12218	 174.6 	 12.2 	115.14	0.9	3	1.3125	2057.58	2100	20.13145	25	3.375110018	11.7367818	2.5652445	10.57709622	2.5652445	92.8753	2.52
37	2025	CITANGKIL	3672011	Warnasari	3672011011	7305	7197	14502	 659.1 	 7.1 	0	3.4	1.5	0	2005.92	2100	19.723575	25	4.00604399	7.592056268	1.9771529	11.52555952	1.9771529	91.7841	6.93
42	2025	CITANGKIL	3672011	Samangraya	3672011012	5409	5288	10697	 595.1 	 15.5 	143.92	3	7.5	1.3125	2055.48	2100	19.30385	25	2.95494777	19.51014303	1.86669372	9.971592111	1.86669372	92.8826	3.71
14	2025	PULO MERAK	3672020	Mekarsari	3672020011	6879	6800	13679	 705.0 	 2.1 	27.9	4.2	38.2	24.8394053	2032.59	2100	19.231325	25	3.778697817	13.64865853	2.960992908	9.323834939	2.960992908	92.3425	8.67
12	2025	PULO MERAK	3672020	Tamansari	3672020012	8171	7941	16112	 515.8 	 0.3 	3.7	3.1	27.9	18.17378345	2022.93	2100	19.35655	25	4.450791668	13.54890765	2.425502426	9.605373394	2.425502426	92.1981	5.89
13	2025	PULO MERAK	3672020	Lebakgede	3672020013	7069	7134	14203	 767.3 	 8.6 	112.2	4.6	41.5	27.03643679	2048.97	2100	19.629975	25	3.923447993	10.72308667	2.196011484	9.532894561	2.196011484	92.7445	5.46
15	2025	PULO MERAK	3672020	Suralaya	3672020014	3649	3657	7306	 693.9 	 0.0 	0	4.1	37.6	24.45037446	2039.94	2100	18.533225	25	2.018215239	7.651245552	2.127026625	8.63846986	2.127026625	92.5557	8.36
31	2025	PURWAKARTA	3672021	Ramanuju	3672021001	1051	1049	2100	 210.8 	 1.0 	0	0	0	0	2012.22	2100	20.24425	25	0.580105667	5.095238095	2.612393682	10.69827227	2.612393682	91.763	4.46
33	2025	PURWAKARTA	3672021	Kebon Dalem	3672021002	8041	7955	15996	 252.5 	 13.8 	34.58	0	0	0	2088.87	2100	22.243825	25	4.418747736	4.038509627	1.950985761	11.48769008	1.950985761	93.203	3.14
34	2025	PURWAKARTA	3672021	Purwakarta	3672021003	3742	3747	7489	 155.6 	 43.1 	337.2	0	6	6	2070.81	2100	20.07115	25	2.068767304	5.274402457	2.008144923	10.45567489	2.008144923	93.2238	5.06
35	2025	PURWAKARTA	3672021	Tegal Bunder	3672021004	3015	2901	5916	 286.3 	 52.3 	518.77	4.9	12	9	2062.83	2100	19.40215	25	1.634240536	7.082488168	2.092198582	9.323802048	2.092198582	93.0452	3.96
36	2025	PURWAKARTA	3672021	Pabean	3672021005	2011	1910	3921	 420.4 	 43.0 	389.08	0	6	6	2047.71	2100	19.64185	25	1.083140152	8.747768426	2.350145234	9.514989165	2.350145234	92.822	3.1
32	2025	PURWAKARTA	3672021	Kotabumi	3672021006	4685	4593	9278	 403.6 	 14.6 	5.76	0	0	0	2054.43	2100	23.690725	25	2.562962084	3.190342746	2.123914574	11.73551737	2.123914574	91.8455	3.51
27	2025	GEROGOL	3672022	Kotasari	3672022007	4852	4780	9632	 317.3 	 3.2 	23	3.7	31	2.714082213	1990.17	2100	21.949025	25	2.660751325	3.249584718	1.782820097	12.29496042	1.782820097	90.3566	2.7
28	2025	GEROGOL	3672022	Gerogol	3672022008	2557	2483	5040	 384.5 	 24.0 	173.4	4.5	37.6	3.288395937	2049.81	2100	18.944975	25	1.3922536	10.25793651	2.62485482	9.253358104	2.62485482	92.7499	5.74
29	2025	GEROGOL	3672022	Rawa Arum	3672022009	8375	8110	16485	 561.0 	 62.9 	454.6	6.6	54.8	4.797622531	2060.1	2100	20.4045	25	4.553829484	6.175310889	2.019745757	10.87410754	2.019745757	93.0381	1.69
30	2025	GEROGOL	3672022	Gerem	3672022010	8048	7705	15753	 1192.6 	 18.2 	131.4	14	116.6	10.19989932	2023.35	2100	19.2464	25	4.351621223	10.15679553	2.197570737	9.649353161	2.197570737	92.0607	4.11
7	2025	CILEGON	3672030	Bagendung	3672030001	4533	4362	8895	 436.8 	 19.0 	222.1	2	3.3	3.427250124	2018.94	2100	18.12555	25	2.45716186	12.1866217	2.740278058	9.336136349	2.740278058	92.0308	4
8	2025	CILEGON	3672030	Ciwedus	3672030002	7120	7078	14198	 166.3 	 6.4 	75.1	0.7	1.1	1.159124814	2077.53	2100	22.159625	25	3.922066789	4.063952669	1.7263769	12.03995126	1.7263769	93.3712	1.64
9	2025	CILEGON	3672030	Bendungan	3672030003	5519	5461	10980	 86.1 	 0.6 	7.1	0.1	0.1	0.109646942	2068.92	2100	21.01225	25	3.033123915	9.826958106	2.272727273	11.08350486	2.272727273	93.1251	3.93
11	2025	CILEGON	3672030	Ciwaduk	3672030004	6399	6395	12794	 114.9 	 4.8 	55.5	0.5	0.8	0.856290403	2072.28	2100	22.513875	25	3.534224715	4.806940753	1.845618108	12.23559799	1.845618108	93.2442	3.01
10	2025	CILEGON	3672030	Ketileng	3672030005	3977	3867	7844	 88.3 	 4.2 	48.5	0.4	0.7	0.747687718	2040.15	2100	19.73405	25	2.166832786	9.497705252	2.580645161	10.34042586	2.580645161	92.5602	1.95
23	2025	JOMBANG	3672031	Jombang Wetan	3672031001	11289	10976	22265	 141.7 	 2.4 	58	0	0	0	2051.07	2100	20.493425	25	6.150501272	7.644284752	2.21133158	10.7935011	2.21133158	92.7261	5.21
24	2025	JOMBANG	3672031	Masigit	3672031002	7957	7841	15798	 181.1 	 18.4 	94.44	3.916667	0	0	2035.11	2100	20.031875	25	4.364052059	8.507406001	2.131475478	10.74253045	2.131475478	92.4645	5.84
25	2025	JOMBANG	3672031	Panggung Rawi	3672031003	5736	5636	11372	 279.9 	 71.4 	1180.5	9.791667	0	0	2045.82	2100	20.58075	25	3.141410306	6.137882518	2.7843987	10.70605462	2.7843987	92.6897	4.11
26	2025	JOMBANG	3672031	Gedong Dalem	3672031004	4615	4423	9038	 226.8 	 69.8 	666.98	4.895833	0	0	2039.31	2100	19.960275	25	2.496664294	8.043815003	2.080237741	10.60424887	2.080237741	92.5726	0.85
22	2025	JOMBANG	3672031	Sukmajaya	3672031005	7417	7156	14573	 258.4 	 61.9 	661.08	4.895833	0	0	2036.58	2100	20.180325	25	4.025657087	6.855143073	2.565379826	10.5398718	2.565379826	92.4765	2.71
3	2025	CIBEBER	3672040	Bulakan	3672040001	3354	3187	6541	 345.8 	 14.2 	115.89	5.1333	114.9474	15.75	2012.85	2100	17.31235	25	1.806891032	17.16862865	2.787652011	8.101023499	2.787652011	91.8319	6.69
4	2025	CIBEBER	3672040	Cikerai	3672040002	2257	2241	4498	 321.1 	 13.2 	139.07	7.7	65.68421	15.75	1998.36	2100	17.673725	25	1.24253109	24.47754558	2.618181818	8.482981853	2.618181818	91.5209	8.82
5	2025	CIBEBER	3672040	Kalitimbang	3672040003	4465	4229	8694	 360.6 	 9.7 	185.42	5.1333	16.42105	10.5	2044.56	2100	19.45875	25	2.40163746	12.87094548	2.307692308	9.813480694	2.307692308	92.6824	4.86
6	2025	CIBEBER	3672040	Karang Asem	3672040004	6839	6621	13460	 279.3 	 17.8 	237.57	5.1333	16.42105	0	2046.87	2100	19.711775	25	3.718201083	14.53194651	1.986865076	10.22096155	1.986865076	92.7341	6.33
1	2025	CIBEBER	3672040	Cibeber	3672040005	11761	11570	23331	 239.0 	 31.5 	602.62	20.5333	65.68421	5.25	2043.51	2100	22.86295	25	6.444973958	3.073164459	1.798012723	12.65267795	1.798012723	92.6555	2.18
2	2025	CIBEBER	3672040	Kedaleman	3672040006	5339	5357	10696	 354.2 	 92.4 	579.44	10.26667	32.84211	5.25	2023.98	2100	19.987075	25	2.95467153	7.516828721	2.124183007	10.14648819	2.124183007	92.2379	4.67
`;

// Balita Gizi data Feb-2026 (Gambar Kelima)
const BALITA_GIZI_DATA = [
  { kecamatan: 'Cibeber', sangat_kurang: 47, kurang: 132, normal: 3731, lebih: 102, status: 'AMAN' },
  { kecamatan: 'Cilegon', sangat_kurang: 21, kurang: 80, normal: 2969, lebih: 173, status: 'AMAN' },
  { kecamatan: 'Pulo Merak', sangat_kurang: 32, kurang: 123, normal: 2795, lebih: 123, status: 'AMAN' },
  { kecamatan: 'Ciwandan', sangat_kurang: 34, kurang: 56, normal: 3498, lebih: 72, status: 'AMAN' },
  { kecamatan: 'Jombang', sangat_kurang: 20, kurang: 114, normal: 3285, lebih: 145, status: 'AMAN' },
  { kecamatan: 'Gerogol', sangat_kurang: 35, kurang: 123, normal: 2284, lebih: 107, status: 'AMAN' },
  { kecamatan: 'Purwakarta', sangat_kurang: 16, kurang: 133, normal: 1645, lebih: 104, status: 'AMAN' },
  { kecamatan: 'Citangkil', sangat_kurang: 27, kurang: 185, normal: 4837, lebih: 238, status: 'AMAN' },
];

// Price Strategic YoY Data for Feb 2025 and Feb 2026 (Gambar Keempat)
const KOMODITAS_YOY_DATA = {
  'Cibeber':    { beras_25: 14000, beras_26: 13500, minyak_25: 18000, minyak_26: 22000, telur_25: 30500, telur_26: 30464 },
  'Cilegon':    { beras_25: 14000, beras_26: 13500, minyak_25: 18000, minyak_26: 22000, telur_25: 30500, telur_26: 30464 },
  'Pulo Merak': { beras_25: 14000, beras_26: 14000, minyak_25: 18000, minyak_26: 21000, telur_25: 30500, telur_26: 31107 },
  'Ciwandan':   { beras_25: 14000, beras_26: 13196, minyak_25: 18000, minyak_26: 21168, telur_25: 30500, telur_26: 30179 },
  'Jombang':    { beras_25: 14000, beras_26: 13196, minyak_25: 18000, minyak_26: 21168, telur_25: 30500, telur_26: 30179 },
  'Gerogol':    { beras_25: 14000, beras_26: 14000, minyak_25: 18000, minyak_26: 21000, telur_25: 30500, telur_26: 31107 },
  'Purwakarta': { beras_25: 14000, beras_26: 13196, minyak_25: 18000, minyak_26: 21168, telur_25: 30500, telur_26: 30179 },
  'Citangkil':  { beras_25: 14000, beras_26: 13196, minyak_25: 18000, minyak_26: 21168, telur_25: 30500, telur_26: 30179 },
};

async function seed() {
  console.log('🚀 Running High-Fidelity Seeder for Cilegon Kelurahan levels...');

  try {
    // 1. Clean existing records
    console.log('Cleaning existing data...');
    await supabase.from('harga_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('ketersediaan_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('gizi_masyarakat').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('intervensi_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('balita_gizi').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Parse and seed Cilegon Kelurahan Landscape Data
    console.log('Parsing landscape data...');
    const lines = LANDSCAPE_DATA.trim().split('\n');
    const giziRows = [];
    const intervensiRows = [];
    
    for (const line of lines) {
      const cols = line.split('\t');
      if (cols.length < 26) continue;
      
      const tahun = parseInt(cols[1]) || 2025;
      const kec = cols[2].trim();
      const kel = cols[4].trim();
      
      // Parse values cleanly
      const l = (val) => parseFloat(val.replace(',', '.')) || 0;
      const i = (val) => parseInt(val) || 0;

      giziRows.push({
        tahun,
        kecamatan: kec,
        kelurahan: kel,
        penduduk_laki: i(cols[6]),
        penduduk_perempuan: i(cols[7]),
        penduduk_total: i(cols[8]),
        luas_wilayah: l(cols[9]),
        luas_sawah: l(cols[10]),
        produksi_gkg: l(cols[11]),
        produksi_jagung: l(cols[12]),
        produksi_ubi_kayu: l(cols[13]),
        produksi_ubi_jalar: l(cols[14]),
        konsumsi_energi_kkal: l(cols[15]),
        standar_energi: i(cols[16]),
        konsumsi_protein_gram: l(cols[17]), // protein hewani in landscape
        standar_protein_hewani: i(cols[18]),
        cppd_ton: l(cols[19]),
        rt_miskin_persen: l(cols[20]),
        pou: l(cols[21]),
        perempuan_sekolah_persen: l(cols[22]),
        rt_tanpa_air_bersih_persen: l(cols[23]),
        skor_pph: l(cols[24]),
        prevalensi_stunting: l(cols[25])
      });

      // Also generate standard monthly intervensi pangan rows for Jan-Dec 2025 and Jan-May 2026
      for (const y of [2025, 2026]) {
        const maxM = y === 2026 ? 5 : 12;
        for (let m = 1; m <= maxM; m++) {
          intervensiRows.push({
            tahun: y,
            bulan: m,
            kecamatan: kec,
            kelurahan: kel,
            penerima_bantuan_jiwa: Math.round(i(cols[8]) * 0.15), // 15% of population
            kegiatan_gpm: m === 2 ? 1 : 0 // Gerakan Pangan Murah in Feb
          });
        }
      }
    }

    // Insert gizi_masyarakat & intervensi_pangan
    console.log(`Inserting ${giziRows.length} rows to gizi_masyarakat...`);
    await bulkInsert('gizi_masyarakat', giziRows);
    
    console.log(`Inserting ${intervensiRows.length} rows to intervensi_pangan...`);
    await bulkInsert('intervensi_pangan', intervensiRows);

    // 3. Seed ketersediaan_pangan (Kota-level)
    const ketersediaanRows = [];
    const months = [1,2,3,4,5,6,7,8,9,10,11,12];
    for (const y of [2025, 2026]) {
      const maxM = y === 2026 ? 5 : 12;
      for (let m = 1; m <= maxM; m++) {
        // City Rice Production (approx 20,000 tons with seasonal variations)
        const baseProd = 20000 + Math.sin(m) * 3000 + Math.random() * 1000;
        ketersediaanRows.push({
          tahun: y,
          bulan: m,
          produksi_beras_ton: parseFloat(baseProd.toFixed(1)),
          skor_nbm: parseFloat((94 + Math.random() * 4).toFixed(1))
        });
      }
    }
    await supabase.from('ketersediaan_pangan').insert(ketersediaanRows);
    console.log('Seeded ketersediaan_pangan successfully.');

    // 4. Seed balita_gizi (Gambar Kelima)
    const balitaRows = [];
    for (const row of BALITA_GIZI_DATA) {
      // Seed both for 2025 and 2026
      for (const y of [2025, 2026]) {
        balitaRows.push({
          tahun: y,
          bulan: 2, // February as in the image
          kecamatan: row.kecamatan,
          sangat_kurang: row.sangat_kurang,
          kurang: row.kurang,
          normal: row.normal,
          lebih: row.lebih,
          status: row.status
        });
      }
    }
    await supabase.from('balita_gizi').insert(balitaRows);
    console.log('Seeded balita_gizi successfully.');

    // 5. Seed harga_pangan with exact Feb-25 vs Feb-26 YoY prices (Gambar Keempat)
    const hargaRows = [];
    for (const [kec, kels] of Object.entries(WILAYAH)) {
      const yoy = KOMODITAS_YOY_DATA[kec] || { beras_25: 14000, beras_26: 13500, minyak_25: 18000, minyak_26: 22000, telur_25: 30500, telur_26: 30464 };
      
      for (const kel of kels) {
        // Seed monthly prices for 2025 and 2026
        for (const y of [2025, 2026]) {
          const maxM = y === 2026 ? 5 : 12;
          for (let m = 1; m <= maxM; m++) {
            const isFeb = m === 2;
            
            // Extract prices based on Feb-25/Feb-26 YoY, or add realistic drift for other months
            let beras = isFeb ? (y === 2025 ? yoy.beras_25 : yoy.beras_26) : 13500 + Math.sin(m) * 300 + (y - 2025) * -400;
            let minyak = isFeb ? (y === 2025 ? yoy.minyak_25 : yoy.minyak_26) : 18000 + Math.cos(m) * 500 + (y - 2025) * 3000;
            let telur = isFeb ? (y === 2025 ? yoy.telur_25 : yoy.telur_26) : 30000 + Math.sin(m * 2) * 500 + (y - 2025) * -100;
            
            let ayam = 35000 + Math.sin(m) * 1500;
            let gula = 15500 + Math.random() * 800;
            let cabe = 45000 + Math.sin(m) * 9000;

            const prices = [beras, telur, ayam, minyak, gula, cabe];
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            const stdDev = Math.sqrt(prices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / prices.length);
            const cv_harga = parseFloat(((stdDev / mean) * 100).toFixed(2));

            hargaRows.push({
              tanggal: `${y}-${m < 10 ? '0' + m : m}-15`,
              kecamatan: kec,
              kelurahan: kel,
              beras: Math.round(beras),
              minyak_goreng: Math.round(minyak),
              telur: Math.round(telur),
              daging_ayam: Math.round(ayam),
              gula_pasir: Math.round(gula),
              cabe_merah: Math.round(cabe),
              cv_harga
            });
          }
        }
      }
    }
    
    console.log(`Inserting ${hargaRows.length} rows into harga_pangan...`);
    await bulkInsert('harga_pangan', hargaRows);

    console.log('🎉 Super High-Fidelity Seeder Completed Successfully!');

  } catch (error) {
    console.error('Seeder fatal error:', error.message);
  }
}

async function bulkInsert(table, rows) {
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`Error bulk inserting into ${table} (chunk at index ${i}):`, error.message);
      throw error;
    }
  }
}

const WILAYAH = {
  'Cibeber':    ['Cibeber','Kedaleman','Bulakan','Cikerai','Karang Asem','Kalitimbang'],
  'Cilegon':    ['Bagendung','Ciwedus','Bendungan','Ketileng','Ciwaduk'],
  'Pulo Merak': ['Tamansari','Lebakgede','Mekarsari','Suralaya'],
  'Ciwandan':   ['Banjar Negara','Tegal Ratu','Kubangsari','Gunung Sugih','Kepuh','Randakari'],
  'Jombang':    ['Sukmajaya','Jombang Wetan','Masigit','Panggung Rawi','Gedong Dalem'],
  'Gerogol':    ['Kotasari','Gerogol','Rawa Arum','Gerem'],
  'Purwakarta': ['Ramanuju','Kotabumi','Kebon Dalem','Purwakarta','Tegal Bunder','Pabean'],
  'Citangkil':  ['Warnasari','Deringo','Kebonsari','Taman Baru','Lebak Denok','Samangraya','Citangkil'],
};

seed();
