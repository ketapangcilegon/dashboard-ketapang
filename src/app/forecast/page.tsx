"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForecastPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?view=forecasting');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500 font-medium text-sm animate-pulse">
        Memuat Forecast...
      </div>
    </div>
  );
}
