import { APP_VERSION } from '@/lib/version';

export default function SeoStructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      // ── 1. WebSite ──────────────────────────────────────────
      {
        '@type': 'WebSite',
        '@id': 'https://pangancilegon.web.id/#website',
        url: 'https://pangancilegon.web.id',
        name: 'Sistem Informasi Ketahanan Pangan Kota Cilegon',
        description:
          'Platform Food Security Intelligence & DSS untuk pemantauan, analisis, dan pengambilan keputusan ketahanan pangan Kota Cilegon berbasis data real-time dan kecerdasan buatan.',
        inLanguage: 'id',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://pangancilegon.web.id/?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },

      // ── 2. GovernmentService ────────────────────────────────
      {
        '@type': 'GovernmentService',
        '@id': 'https://pangancilegon.web.id/#service',
        name: 'Food Security Intelligence & DSS Kota Cilegon',
        url: 'https://pangancilegon.web.id',
        description:
          'Layanan informasi dan analitik ketahanan pangan Kota Cilegon mencakup harga pangan real-time, peta FSVA interaktif, analisis SKPG, forecast harga berbasis ML, early warning system (EWS), indeks IKP, PPH, PoU, dan AI insight per indikator.',
        serviceType: 'Food Security Monitoring and Decision Support',
        provider: {
          '@type': 'GovernmentOrganization',
          name: 'Dinas Ketahanan Pangan dan Pertanian Kota Cilegon',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Kota Cilegon',
            addressRegion: 'Banten',
            addressCountry: 'ID',
          },
        },
        areaServed: {
          '@type': 'City',
          name: 'Kota Cilegon',
          containedInPlace: {
            '@type': 'State',
            name: 'Banten',
          },
        },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: 'https://pangancilegon.web.id',
          availableLanguage: 'id',
        },
        category: [
          'Ketahanan Pangan',
          'Kerawanan Pangan',
          'Harga Pangan',
          'FSVA',
          'SKPG',
          'Pangan dan Gizi',
        ],
      },

      // ── 3. SoftwareApplication ──────────────────────────────
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://pangancilegon.web.id/#app',
        name: 'Food Security Intelligence & DSS',
        applicationCategory: 'GovernmentApplication',
        operatingSystem: 'Web Browser',
        url: 'https://pangancilegon.web.id',
        version: APP_VERSION,
        datePublished: '2026-06-06',
        description:
          'Web app analitik ketahanan pangan Kota Cilegon dengan fitur: pemantauan harga 10 komoditas strategis real-time (SAGON), CV harga beras, peta FSVA/SKPG interaktif, forecast ML 1 & 3 bulan (XGBoost + Prophet + Random Forest), EWS kerawanan pangan, IKP, PPH, PoU, Borda Desil kerentanan kelurahan, dan AI insight per panel.',
        featureList: [
          'Harga pangan real-time dari SAGON Cilegon',
          'Forecast harga ML 1 & 3 bulan ke depan',
          'Early Warning System (EWS) kerawanan pangan',
          'Peta FSVA interaktif per kelurahan',
          'Analisis SKPG bulanan otomatis',
          'Indeks Ketahanan Pangan (IKP) lintas tahun',
          'Prevalence of Undernourishment (PoU)',
          'Skor Pola Pangan Harapan (PPH)',
          'Borda Desil kerentanan pangan 43 kelurahan',
          'AI insight interpretasi otomatis per indikator',
          'Dashboard Serumpun Padi (pertanian & kelautan)',
        ],
        author: {
          '@type': 'Person',
          name: 'Analis Ketahanan Pangan DKPP Kota Cilegon',
          worksFor: {
            '@type': 'GovernmentOrganization',
            name: 'Dinas Ketahanan Pangan dan Pertanian Kota Cilegon',
          },
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'IDR',
        },
      },

      // ── 4. Dataset ──────────────────────────────────────────
      {
        '@type': 'Dataset',
        '@id': 'https://pangancilegon.web.id/#dataset',
        name: 'Data Ketahanan Pangan Kota Cilegon 2021–2026',
        description:
          'Kumpulan data ketahanan pangan Kota Cilegon mencakup harga komoditas strategis (beras, minyak goreng, cabai, daging, telur, bawang), indeks IKP, skor PPH, PoU, data FSVA per kelurahan, analisis SKPG bulanan, dan data balita/stunting.',
        url: 'https://pangancilegon.web.id',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: {
          '@type': 'GovernmentOrganization',
          name: 'Dinas Ketahanan Pangan dan Pertanian Kota Cilegon',
        },
        spatialCoverage: {
          '@type': 'Place',
          name: 'Kota Cilegon, Banten, Indonesia',
          geo: {
            '@type': 'GeoCoordinates',
            latitude: -6.002,
            longitude: 106.005,
          },
        },
        temporalCoverage: '2021/2026',
        inLanguage: 'id',
        keywords:
          'ketahanan pangan, FSVA, SKPG, IKP, harga pangan, Cilegon, Banten, kerawanan pangan, stunting, dinas ketahanan pangan dan pertanian kota cilegon, dkpp kota cilegon, cara membuat peta fsva, cara membuat peta skpg, aplikasi analisis skpg, aplikasi skpg, aplikasi fsva, lahan sawah cilegon, luas lahan sawah kota cilegon, LBS kota cilegon',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
