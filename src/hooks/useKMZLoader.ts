import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import togeojson from '@mapbox/togeojson';

// Supabase Storage KMZ URL in bucket 'kmz-files' with fallback to local public asset
const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_KMZ_URL || (
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kmz-files/my-places-apr-2026-v250426.kmz`
    : '/my-places-apr-2026-v250426.kmz'
);
const LOCAL_FALLBACK_URL = '/my-places-apr-2026-v250426.kmz';

export interface KMZLayers {
  kecamatan: any[];
  kelurahan: any[];
  sawah: any[];
}

export function useKMZLoader() {
  const [layers, setLayers] = useState<KMZLayers>({ kecamatan: [], kelurahan: [], sawah: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedRef = useRef(false);

  const mergeIntoList = (list: any[], feature: any, nama: string) => {
    const ex = list.find(f => (f.properties?.name || f.properties?.Name) === nama);
    if (ex) {
      const ec = ex.geometry.type === 'MultiPolygon' ? ex.geometry.coordinates : [ex.geometry.coordinates];
      const nc = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
      ex.geometry = { type: 'MultiPolygon', coordinates: [...ec, ...nc] };
    } else {
      list.push({ ...feature });
    }
  };

  const processKML = useCallback(async (kmlText: string) => {
    setLoading(true);
    setError(null);
    try {
      const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
      const geojson = togeojson.kml(kml);
      const kecF: any[] = [], kelF: any[] = [], sawahF: any[] = [];

      const getFirstCoord = (pm: Element) => {
        const c = pm.querySelector('coordinates');
        if (!c) return null;
        const p = c.textContent?.trim().split(/[\s,]+/) || [];
        return { lng: parseFloat(p[0]), lat: parseFloat(p[1]) };
      };

      const allPM: { pm: Element; top: string }[] = [];
      const collectPM = (el: Element, top: string) => {
        el.querySelectorAll(':scope > Placemark').forEach(pm => allPM.push({ pm, top }));
        el.querySelectorAll(':scope > Folder').forEach(sub => {
          const subName = sub.querySelector(':scope > name')?.textContent?.trim() || '';
          collectPM(sub, ['My Places', 'Temporary Places'].includes(top) ? subName : top);
        });
      };

      const doc = kml.querySelector('Document') || kml;
      const rootFolders = doc.querySelectorAll(':scope > Folder');
      rootFolders.forEach(folder => {
        const fn = folder.querySelector(':scope > name')?.textContent?.trim() || '';
        if (fn === 'My Places' || fn === 'Temporary Places') {
          folder.querySelectorAll(':scope > Folder').forEach(sub => {
            const subName = sub.querySelector(':scope > name')?.textContent?.trim() || '';
            collectPM(sub, subName);
          });
        } else {
          collectPM(folder, fn);
        }
      });

      allPM.forEach(({ pm, top }) => {
        const pmName = pm.querySelector('name')?.textContent?.trim() || '';
        const pmCoord = getFirstCoord(pm);
        if (!pmCoord) return;

        let feature: any = null;

        // 1. Ekstrak poligon petak sawah langsung dari tag <Polygon> Placemark
        if (top === 'Sawah') {
          const polyEls = pm.querySelectorAll('Polygon');
          if (polyEls.length > 0) {
            const polygonsCoords: number[][][][] = [];
            polyEls.forEach(polyEl => {
              const coordsEl = polyEl.querySelector('outerBoundaryIs coordinates') || polyEl.querySelector('coordinates');
              if (coordsEl) {
                const coords: number[][] = [];
                const pairs = (coordsEl.textContent || '').trim().split(/\s+/);
                for (const pair of pairs) {
                  const parts = pair.split(',').map(parseFloat);
                  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    coords.push([parts[0], parts[1]]);
                  }
                }
                if (coords.length >= 3) {
                  polygonsCoords.push([coords]);
                }
              }
            });
            if (polygonsCoords.length === 1) {
              feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polygonsCoords[0] }, properties: { name: pmName } };
            } else if (polygonsCoords.length > 1) {
              feature = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polygonsCoords }, properties: { name: pmName } };
            }
          }
        } else if (['Kecamatan', 'Kelurahan'].includes(top)) {
          feature = geojson.features.find((f: any) => {
            if (!f.geometry) return false;
            const coords = f.geometry.type === 'Polygon'
              ? f.geometry.coordinates[0]
              : f.geometry.type === 'MultiPolygon'
                ? f.geometry.coordinates[0][0]
                : f.geometry.coordinates;
            if (!coords?.length) return false;
            return Math.abs(coords[0][0] - pmCoord.lng) < 0.00001 && Math.abs(coords[0][1] - pmCoord.lat) < 0.00001;
          });
          if (!feature) {
            feature = geojson.features.find((f: any) => f.geometry && (f.properties?.name === pmName || f.properties?.Name === pmName));
          }
        }

        if (!feature) return;

        if (top === 'Kecamatan') mergeIntoList(kecF, feature, pmName);
        else if (top === 'Kelurahan') mergeIntoList(kelF, feature, pmName);
        else if (top === 'Sawah') {
          const namaId = pmName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          sawahF.push({
            ...feature,
            _id: `sawah_${namaId}_${Math.abs(pmCoord.lng * 10000).toFixed(0)}_${Math.abs(pmCoord.lat * 10000).toFixed(0)}`,
            properties: { ...feature.properties, name: pmName }
          });
        }
      });

      setLayers({ kecamatan: kecF, kelurahan: kelF, sawah: sawahF });

    } catch (e: any) {
      setError(e.message);
      console.error('KMZ processing error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromURL = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      let res = await fetch(SUPABASE_STORAGE_URL).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(LOCAL_FALLBACK_URL);
      }
      if (!res.ok) throw new Error(`Gagal memuat KMZ (${res.status} ${res.statusText})`);

      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
      if (kmlFile) {
        await processKML(await kmlFile.async('string'));
      }
    } catch (e: any) {
      setError(e.message);
      console.error('Auto-load KMZ gagal:', e);
    } finally {
      setLoading(false);
    }
  }, [processKML]);

  return {
    layers, loading, error, loadFromURL
  };
}
