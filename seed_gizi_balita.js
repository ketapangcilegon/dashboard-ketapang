const { createClient } = require('@supabase/supabase-js');

// Load config
const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_RAW = `
Bagendung	10	23	673	27
Banjar Negara	17	70	553	12
Bendungan	11	37	543	49
Bulakan	9	47	431	12
Cibeber	8	34	796	38
Cikerai	7	22	296	10
Citangkil	10	69	660	45
Ciwaduk	1	23	412	38
Ciwedus	0	20	821	40
Deringo	5	22	847	20
Gedong Dalem	4	8	605	20
Gerem	14	64	729	31
Gerogol	11	46	244	12
Gunung Sugih	2	24	328	10
Jombang Wetan	8	36	696	22
Kalitimbang	6	28	505	18
Karang Asem	16	50	863	17
Kebon Dalem	7	30	544	47
Kebonsari	4	19	672	56
Kedaleman	9	31	578	18
Kepuh	6	47	549	22
Ketileng	5	19	441	19
Kotabumi	2	17	285	9
Kotasari	6	25	390	31
Kubangsari	9	40	458	10
Lebak Denok	1	44	711	15
Lebakgede	2	21	701	23
Masigit	6	33	752	37
Mekarsari	14	63	677	37
Pabean	1	9	121	14
Panggung Rawi	4	23	575	38
Purwakarta	8	9	178	8
Ramanuju	2	3	44	4
Randakari	8	21	551	7
Rawa Arum	10	30	466	26
Samangraya	4	17	271	16
Sukmajaya	1	12	693	14
Suralaya	4	34	388	69
Taman Baru	7	31	596	29
Tamansari	16	57	668	29
Tegal Bunder	9	26	170	9
Tegal Ratu	16	85	706	33
Warnasari	6	24	506	45
`;

async function seed() {
  console.log('🚀 Seeding Gizi Balita (Kelurahan Level) January 2026 to Supabase...');

  try {
    const lines = DATA_RAW.trim().split('\n');
    const rows = lines.map(line => {
      const parts = line.split('\t');
      return {
        tahun: 2026,
        bulan: 1,
        nama_kelurahan: parts[0].trim(),
        gizi_sangat_kurang: parseInt(parts[1]),
        gizi_kurang: parseInt(parts[2]),
        gizi_normal: parseInt(parts[3]),
        gizi_berlebih: parseInt(parts[4])
      };
    });

    console.log(`Parsed ${rows.length} rows successfully.`);

    // Clear existing records for Jan 2026 to allow safe reruns
    console.log('Cleaning existing January 2026 data...');
    await supabase
      .from('gizi_balita')
      .delete()
      .eq('tahun', 2026)
      .eq('bulan', 1);

    console.log('Inserting rows into gizi_balita...');
    const { error } = await supabase.from('gizi_balita').insert(rows);
    
    if (error) {
      throw error;
    }

    console.log('🎉 Seeding gizi_balita completed successfully!');

  } catch (err) {
    console.error('Fatal seeding error:', err.message);
  }
}

seed();
