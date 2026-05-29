import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import togeojson from '@mapbox/togeojson';
import { KEL_TO_KEC } from '../lib/wilayah';

const KMZ_URL = process.env.NEXT_PUBLIC_KMZ_URL || '/my-places-apr-2026-v250426.kmz'; // Supports custom Supabase Storage public URLs via NEXT_PUBLIC_KMZ_URL env variable

export function useKMZLoader() {
  const [layers, setLayers] = useState<{ kecamatan: any[], kelurahan: any[] }>({ kecamatan: [], kelurahan: [] });
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
      const kecF: any[] = [], kelF: any[] = [];

      const getFirstCoord = (pm: Element) => {
        const c = pm.querySelector('coordinates');
        if (!c) return null;
        const p = c.textContent?.trim().split(/[\s,]+/) || [];
        return { lng: parseFloat(p[0]), lat: parseFloat(p[1]) };
      };

      const allPM: { pm: Element, top: string }[] = [];
      const collectPM = (el: Element, top: string) => {
        el.querySelectorAll(':scope > Placemark').forEach(pm => allPM.push({ pm, top }));
        el.querySelectorAll(':scope > Folder').forEach(sub => collectPM(sub, top));
      };

      const folders = kml.querySelector('Document')?.querySelectorAll(':scope > Folder') || [];
      folders.forEach(folder => {
        const fn = folder.querySelector(':scope > name')?.textContent || '';
        if (fn === 'My Places' || fn === 'Temporary Places') {
          folder.querySelectorAll(':scope > Folder').forEach(sub =>
            collectPM(sub, sub.querySelector(':scope > name')?.textContent || '')
          );
        } else {
          collectPM(folder, fn);
        }
      });

      allPM.forEach(({ pm, top }) => {
        const pmName = pm.querySelector('name')?.textContent || '';
        const pmCoord = getFirstCoord(pm);
        if (!pmCoord) return;

        let feature: any = null;

        if (['Kecamatan', 'Kelurahan'].includes(top)) {
          feature = geojson.features.find((f: any) => {
            if (!f.geometry) return false;
            let coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates[0][0] : f.geometry.coordinates;
            if (!coords?.length) return false;
            return Math.abs(coords[0][0] - pmCoord.lng) < 0.00001 && Math.abs(coords[0][1] - pmCoord.lat) < 0.00001;
          });
          if (!feature) feature = geojson.features.find((f: any) => f.geometry && (f.properties?.name === pmName || f.properties?.Name === pmName));
        }

        if (!feature) return;

        if (top === 'Kecamatan') mergeIntoList(kecF, feature, pmName);
        else if (top === 'Kelurahan') mergeIntoList(kelF, feature, pmName);
      });

      setLayers({ kecamatan: kecF, kelurahan: kelF });

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
      const res = await fetch(KMZ_URL);
      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
      if (kmlFile) await processKML(await kmlFile.async('string'));
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
