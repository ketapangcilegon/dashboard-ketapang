'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

export default function VisitCounter({ path = '/' }: { path?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Avoid double increment in React StrictMode during development
    const sessionKey = `visited_${path}`;
    const alreadyVisitedThisSession = sessionStorage.getItem(sessionKey);

    const trackVisit = async () => {
      try {
        if (!alreadyVisitedThisSession) {
          const res = await fetch('/api/visit-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
          });
          const data = await res.json();
          if (data.success) {
            setCount(data.total_count);
            sessionStorage.setItem(sessionKey, 'true');
          }
        } else {
          const res = await fetch(`/api/visit-count?path=${encodeURIComponent(path)}`);
          const data = await res.json();
          if (data.success) {
            setCount(data.total_count);
          }
        }
      } catch (err) {
        console.error('[VisitCounter] Failed to load visit count:', err);
      }
    };

    trackVisit();
  }, [path]);

  return (
    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-1.5 rounded-full border border-slate-200 shadow-sm shrink-0">
      <Users className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
      <span>Total Pengunjung:</span>
      <span className="font-extrabold text-slate-800 tabular-nums">
        {count !== null ? count.toLocaleString('id-ID') : '...'}
      </span>
    </div>
  );
}
