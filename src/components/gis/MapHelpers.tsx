"use client";

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Komponen untuk menyimpan referensi peta ke parent
export function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  return null;
}

// Komponen untuk memindahkan zoom control ke kiri atas sesuai mockup Serumpun Padi
export function MoveZoomControl() {
  const map = useMap();
  useEffect(() => {
    try {
      if (map.zoomControl) {
        map.zoomControl.remove();
        map.zoomControl.setPosition('topleft');
        map.zoomControl.addTo(map);
      }
    } catch {}
    return () => {
      try {
        if (map.zoomControl) {
          map.zoomControl.remove();
        }
      } catch {}
    };
  }, [map]);
  return null;
}

// Komponen tombol Fit Bounds / Full View di topleft
export function FitBoundsControl({ bounds }: { bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    let ctrl: L.Control | null = null;
    try {
      const FitCtrl = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create('button', 'sp-map-action-btn leaflet-bar');
          btn.title = 'Pusatkan Peta ke Seluruh Wilayah Kota Cilegon';
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4H5a2 2 0 0 0-2 2v2M17 4h2a2 2 0 0 1 2 2v2M7 20H5a2 2 0 0 1-2-2v-2M17 20h2a2 2 0 0 0 2-2v-2"/></svg>`;
          L.DomEvent.disableClickPropagation(btn);
          L.DomEvent.on(btn, 'click', () => {
            try {
              if (bounds) {
                map.fitBounds(bounds, { animate: true, duration: 1.2, padding: [40, 40] });
              } else {
                map.flyTo([-6.01, 106.02], 12.5, { animate: true, duration: 1.2 });
              }
            } catch {}
          });
          return btn;
        },
      });
      ctrl = new FitCtrl({ position: 'topleft' });
      ctrl.addTo(map);
    } catch {}
    return () => {
      if (ctrl) {
        try {
          ctrl.remove();
        } catch {}
      }
    };
  }, [map, bounds]);
  return null;
}

// Komponen untuk tracking zoom level (untuk label kelurahan)
export function MapZoomTracker({ setZoom }: { setZoom?: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const calcFs = (z: number) => Math.max(7, Math.min(13, (z - 8) * 1.5)).toFixed(1) + 'px';
    const onZoomEnd = () => {
      try {
        const z = map.getZoom();
        if (setZoom) setZoom(z);
        document.querySelectorAll('.ikpg-kel-label span').forEach((el) => {
          (el as HTMLElement).style.fontSize = calcFs(z);
        });
      } catch {}
    };
    map.on('zoomend', onZoomEnd);
    return () => {
      try {
        map.off('zoomend', onZoomEnd);
      } catch {}
    };
  }, [map, setZoom]);
  return null;
}

// Komponen penyesuai ukuran peta saat tab / view berubah
export function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}
