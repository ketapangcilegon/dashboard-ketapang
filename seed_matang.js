const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FSVA_RAW = `
Bagendung	3672030001	70.78556644	2025
Banjar Negara	3672010005	71.90255582	2025
Bendungan	3672030003	71.52512743	2025
Bulakan	3672040001	69.28836849	2025
Cibeber	3672040005	77.42171764	2025
Cikerai	3672040002	69.3389018	2025
Citangkil	3672011009	71.3979247	2025
Ciwaduk	3672030004	74.00709456	2025
Ciwedus	3672030002	74.28064108	2025
Deringo	3672011006	71.62108263	2025
Gedong Dalem	3672031004	71.22858507	2025
Gerem	3672022010	69.31912514	2025
Gerogol	3672022008	73.86728085	2025
Gunung Sugih	3672010001	72.26391822	2025
Jombang Wetan	3672031001	71.21169311	2025
Kalitimbang	3672040003	70.92422373	2025
Karang Asem	3672040004	69.08439638	2025
Kebon Dalem	3672021002	73.64014292	2025
Kebonsari	3672011010	70.25471796	2025
Kedaleman	3672040006	77.04668841	2025
Kepuh	3672010002	69.72890474	2025
Ketileng	3672030005	70.61760429	2025
Kotabumi	3672021006	74.01938355	2025
Kotasari	3672022007	73.08872468	2025
Kubangsari	3672010013	73.73878751	2025
Lebak Denok	3672011007	72.00448068	2025
Lebakgede	3672020013	69.3484417	2025
Masigit	3672031002	70.64256782	2025
Mekarsari	3672020011	67.72649209	2025
Pabean	3672021005	77.80061617	2025
Panggung Rawi	3672031003	71.49625537	2025
Purwakarta	3672021003	77.23914323	2025
Ramanuju	3672021001	71.301387	2025
Randakari	3672010003	71.14298748	2025
Rawa Arum	3672022009	75.49115616	2025
Samangraya	3672011012	67.79934284	2025
Sukmajaya	3672031005	71.20738467	2025
Suralaya	3672020014	68.79260255	2025
Taman Baru	3672011008	76.80189207	2025
Tamansari	3672020012	68.30648915	2025
Tegal Bunder	3672021004	77.86107987	2025
Tegal Ratu	3672010004	75.57658759	2025
Warnasari	3672011011	70.8726736	2025
`;

const SKPG_RAW = `
Bagendung	462	72	8414	338	2025
Banjar Negara	122	92	7684	165	2025
Bendungan	485	98	6904	443	2025
Bulakan	309	96	4663	83	2025
Cibeber	312	77	8667	374	2025
Cikerai	261	51	2717	101	2025
Citangkil	829	49	9652	628	2025
Ciwaduk	257	30	5236	424	2025
Ciwedus	153	33	9190	406	2025
Deringo	427	68	10287	183	2025
Gedong Dalem	65	34	7489	133	2025
Gerem	733	165	9095	633	2025
Gerogol	507	86	4030	295	2025
Gunung Sugih	93	31	4457	85	2025
Jombang Wetan	412	147	8551	667	2025
Kalitimbang	293	85	5505	122	2025
Karang Asem	572	168	9260	177	2025
Kebon Dalem	457	90	11148	744	2025
Kebonsari	150	25	9137	703	2025
Kedaleman	314	133	6595	207	2025
Kepuh	88	87	7514	52	2025
Ketileng	288	59	5468	187	2025
Kotabumi	175	12	4851	185	2025
Kotasari	474	127	5265	645	2025
Kubangsari	153	67	6157	38	2025
Lebak Denok	499	80	8911	429	2025
Lebakgede	164	29	8033	214	2025
Masigit	499	91	8816	411	2025
Mekarsari	801	184	8857	509	2025
Pabean	115	15	2760	135	2025
Panggung Rawi	299	104	6410	454	2025
Purwakarta	298	69	5633	229	2025
Ramanuju	87	15	1039	61	2025
Randakari	74	71	7109	49	2025
Rawa Arum	443	97	8988	570	2025
Samangraya	261	67	4164	176	2025
Sukmajaya	202	26	8733	132	2025
Suralaya	401	53	4815	598	2025
Taman Baru	321	91	7863	367	2025
Tamansari	622	149	9093	399	2025
Tegal Bunder	468	113	5097	160	2025
Tegal Ratu	89	110	10357	258	2025
Warnasari	309	67	6563	443	2025
`;

async function seed() {
  console.log('🚀 Seeding Mature FSVA and SKPG datasets to Supabase...');

  try {
    // 1. Parse FSVA
    const fsvaLines = FSVA_RAW.trim().split('\n');
    const fsvaRows = fsvaLines.map(line => {
      const parts = line.split('\t');
      return {
        nama_kelurahan: parts[0].trim(),
        kode_kel_bps: parts[1].trim(),
        ikp: parseFloat(parts[2]),
        periode: parseInt(parts[3])
      };
    });

    // 2. Parse SKPG
    const skpgLines = SKPG_RAW.trim().split('\n');
    const skpgRows = skpgLines.map(line => {
      const parts = line.split('\t');
      return {
        nama_kelurahan: parts[0].trim(),
        gizi_kurang: parseInt(parts[1]),
        gizi_sangat_kurang: parseInt(parts[2]),
        gizi_berlebih: parseInt(parts[3]),
        gizi_normal: parseInt(parts[4]),
        periode: parseInt(parts[5])
      };
    });

    console.log(`Parsed ${fsvaRows.length} FSVA rows and ${skpgRows.length} SKPG rows.`);

    // 3. Clear existing mature records if any
    console.log('Cleaning old mature records...');
    await supabase.from('fsva_matang').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('skpg_matang').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Insert rows
    console.log('Inserting into fsva_matang...');
    const { error: fsvaErr } = await supabase.from('fsva_matang').insert(fsvaRows);
    if (fsvaErr) throw fsvaErr;

    console.log('Inserting into skpg_matang...');
    const { error: skpgErr } = await supabase.from('skpg_matang').insert(skpgRows);
    if (skpgErr) throw skpgErr;

    console.log('🎉 Seeding mature data completed successfully!');

  } catch (err) {
    console.error('Fatal seeding error:', err.message);
  }
}

seed();
