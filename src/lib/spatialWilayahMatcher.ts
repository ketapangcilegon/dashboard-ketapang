import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import * as turf from '@turf/turf';
import { WILAYAH, KEL_TO_KEC, normalizeKelurahanName } from './wilayah';

interface WilayahPolygon {
  name: string;
  type: 'kecamatan' | 'kelurahan';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  polygon: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  center: any;
}

let cachedPolygons: WilayahPolygon[] | null = null;

/**
 * Muat dan parse file KMZ secara server-side untuk spatial point-in-polygon matching
 */
export async function loadWilayahPolygons(): Promise<WilayahPolygon[]> {
  if (cachedPolygons && cachedPolygons.length > 0) {
    return cachedPolygons;
  }

  try {
    const kmzPath = path.join(process.cwd(), 'public', 'my-places-apr-2026-v250426.kmz');
    if (!fs.existsSync(kmzPath)) {
      console.warn('KMZ file not found at:', kmzPath);
      return [];
    }

    const kmzBuffer = fs.readFileSync(kmzPath);
    const zip = await JSZip.loadAsync(kmzBuffer);
    const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
    if (!kmlFile) return [];

    const kmlText = await kmlFile.async('string');
    const polygons: WilayahPolygon[] = [];

    const pmRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
    let m;
    while ((m = pmRegex.exec(kmlText)) !== null) {
      const block = m[1];
      const nameMatch = /<name>([\s\S]*?)<\/name>/.exec(block);
      const coordsMatch = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(block);

      if (nameMatch && coordsMatch) {
        const rawName = nameMatch[1].trim();
        const coordPairs = coordsMatch[1].trim().split(/\s+/).map(p => {
          const [lng, lat] = p.split(',').map(Number);
          return [lng, lat];
        }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

        if (coordPairs.length >= 3) {
          // Tutup ring poligon jika belum tertutup
          if (
            coordPairs[0][0] !== coordPairs[coordPairs.length - 1][0] ||
            coordPairs[0][1] !== coordPairs[coordPairs.length - 1][1]
          ) {
            coordPairs.push(coordPairs[0]);
          }

          try {
            const poly = turf.polygon([coordPairs], { name: rawName });
            const center = turf.centroid(poly);
            const isKec = Object.keys(WILAYAH).some(k => k.toLowerCase() === rawName.toLowerCase());

            polygons.push({
              name: rawName,
              type: isKec ? 'kecamatan' : 'kelurahan',
              polygon: poly,
              center
            });
          } catch {
            // Abaikan poligon dengan koordinat rusak
          }
        }
      }
    }

    cachedPolygons = polygons;
    return cachedPolygons;
  } catch (err) {
    console.error('Error loading wilayah polygons from KMZ:', err);
    return [];
  }
}

/**
 * Mencocokkan koordinat GPS (lat, lng) ke Kelurahan dan Kecamatan di Kota Cilegon
 * menggunakan algoritma Point-in-Polygon (Turf.js) dan Nearest-Distance untuk wilayah pesisir/dermaga.
 */
export async function matchLocationToWilayah(lat: number, lng: number): Promise<{
  kelurahan: string;
  kecamatan: string;
  matchedBy: 'inside' | 'nearest';
  distanceKm?: number;
}> {
  const polygons = await loadWilayahPolygons();
  const pt = turf.point([lng, lat]);

  // 1. Coba pencocokan tepat di dalam poligon Kelurahan
  const kelPolys = polygons.filter(p => p.type === 'kelurahan');
  for (const p of kelPolys) {
    try {
      if (turf.booleanPointInPolygon(pt, p.polygon)) {
        const kelName = normalizeKelurahanName(p.name);
        const kecName = KEL_TO_KEC[kelName] || 'Kota Cilegon';
        return { kelurahan: kelName, kecamatan: kecName, matchedBy: 'inside' };
      }
    } catch { /* skip */ }
  }

  // 2. Coba pencocokan tepat di dalam poligon Kecamatan
  const kecPolys = polygons.filter(p => p.type === 'kecamatan');
  for (const p of kecPolys) {
    try {
      if (turf.booleanPointInPolygon(pt, p.polygon)) {
        return { kelurahan: p.name, kecamatan: p.name, matchedBy: 'inside' };
      }
    } catch { /* skip */ }
  }

  // 3. Untuk dermaga/pesisir/titik di laut: cari Kelurahan terdekat (Nearest centroid/edge)
  let minDist = Infinity;
  let nearestKel = 'Pesisir Cilegon';
  let nearestKec = 'Kota Cilegon';

  for (const p of kelPolys) {
    try {
      const d = turf.distance(pt, p.center);
      if (d < minDist) {
        minDist = d;
        nearestKel = normalizeKelurahanName(p.name);
        nearestKec = KEL_TO_KEC[nearestKel] || nearestKec;
      }
    } catch { /* skip */ }
  }

  return {
    kelurahan: nearestKel,
    kecamatan: nearestKec,
    matchedBy: 'nearest',
    distanceKm: Math.round(minDist * 100) / 100
  };
}
