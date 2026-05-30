const { createClient } = require('@supabase/supabase-js');

// Load config
const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_RAW = `
1	2026	3672030	CILEGON	3672030001	Bagendung	1	742
2	2026	3672010	CIWANDAN	3672010005	Banjar Negara	0	960
27	2026	3672030	CILEGON	3672030003	Bendungan	0	802
3	2026	3672040	CIBEBER	3672040001	Bulakan	1	899
4	2026	3672040	CIBEBER	3672040005	Cibeber	0	494
5	2026	3672040	CIBEBER	3672040002	Cikerai	1	591
7	2026	3672011	CITANGKIL	3672011009	Citangkil	0	923
41	2026	3672030	CILEGON	3672030004	Ciwaduk	0	464
8	2026	3672030	CILEGON	3672030002	Ciwedus	0	461
9	2026	3672011	CITANGKIL	3672011006	Deringo	0	1032
10	2026	3672031	JOMBANG	3672031004	Gedong Dalem	0	668
11	2026	3672022	GROGOL	3672022010	Gerem	0	905
6	2026	3672022	GROGOL	3672022008	Gerogol	0	604
35	2026	3672010	CIWANDAN	3672010001	Gunung Sugih	0	542
12	2026	3672031	JOMBANG	3672031001	Jombang Wetan	0	1023
13	2026	3672040	CIBEBER	3672040003	Kalitimbang	0	784
14	2026	3672040	CIBEBER	3672040004	Karang Asem	0	1404
15	2026	3672021	PURWAKARTA	3672021002	Kebon Dalem	0	689
42	2026	3672011	CITANGKIL	3672011010	Kebonsari	0	1220
16	2026	3672040	CIBEBER	3672040006	Kedaleman	0	637
36	2026	3672010	CIWANDAN	3672010002	Kepuh	0	1014
17	2026	3672030	CILEGON	3672030005	Ketileng	0	488
18	2026	3672021	PURWAKARTA	3672021006	Kotabumi	0	299
19	2026	3672022	GROGOL	3672022007	Kotasari	0	251
20	2026	3672010	CIWANDAN	3672010013	Kubangsari	0	801
21	2026	3672020	PULOMERAK	3672020013	Lebak Denok	0	1031
37	2026	3672011	CITANGKIL	3672011007	Lebakgede	0	1154
22	2026	3672031	JOMBANG	3672031002	Masigit	0	1050
23	2026	3672020	PULOMERAK	3672020011	Mekarsari	1	1509
24	2026	3672021	PURWAKARTA	3672021005	Pabean	0	325
25	2026	3672031	JOMBANG	3672031003	Panggung Rawi	0	746
26	2026	3672021	PURWAKARTA	3672021003	Purwakarta	0	420
43	2026	3672021	PURWAKARTA	3672021001	Ramanuju	0	79
28	2026	3672010	CIWANDAN	3672010003	Randakari	0	997
29	2026	3672022	GROGOL	3672022009	Rawa Arum	0	880
30	2026	3672011	CITANGKIL	3672011012	Samangraya	1	1112
31	2026	3672031	JOMBANG	3672031005	Sukmajaya	0	786
38	2026	3672020	PULOMERAK	3672020014	Suralaya	1	472
32	2026	3672011	CITANGKIL	3672011008	Taman Baru	0	742
39	2026	3672020	PULOMERAK	3672020012	Tamansari	0	1078
33	2026	3672021	PURWAKARTA	3672021004	Tegal Bunder	0	508
40	2026	3672010	CIWANDAN	3672010004	Tegal Ratu	0	845
34	2026	3672011	CITANGKIL	3672011011	Warnasari	0	840
`;

async function seed() {
  console.log('🚀 Seeding Intervensi Pangan (Kelurahan Level) 2026 to Supabase...');

  try {
    const lines = DATA_RAW.trim().split('\n');
    const rows = lines.map(line => {
      const parts = line.split('\t');
      return {
        no_urut: parseInt(parts[0]),
        tahun: parseInt(parts[1]),
        bulan: 1, // Default to January
        kode_kec_bps: parts[2].trim(),
        nama_kecamatan: parts[3].trim(),
        kode_desa_bps: parts[4].trim(),
        nama_kelurahan: parts[5].trim(),
        gpm: parseInt(parts[6]) || 0,
        bantuan_pangan: parseInt(parts[7]) || 0
      };
    });

    console.log(`Parsed ${rows.length} rows successfully.`);

    // Clear existing records for Jan 2026
    console.log('Cleaning existing January 2026 data...');
    await supabase
      .from('intervensi_kelurahan')
      .delete()
      .eq('tahun', 2026)
      .eq('bulan', 1);

    console.log('Inserting rows into intervensi_kelurahan...');
    const { error } = await supabase.from('intervensi_kelurahan').insert(rows);
    
    if (error) {
      throw error;
    }

    console.log('🎉 Seeding intervensi_kelurahan completed successfully!');

  } catch (err) {
    console.error('Fatal seeding error:', err.message);
  }
}

seed();
