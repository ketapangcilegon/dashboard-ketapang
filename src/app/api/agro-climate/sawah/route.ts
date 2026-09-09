import { NextResponse } from 'next/server';
import { evaluateSawahAgroTelemetry } from '@/lib/agro-satellite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '-6.0271');
    const lng = parseFloat(searchParams.get('lng') || '106.0712');
    const nama = searchParams.get('nama') || 'Hamparan Sawah Cilegon';
    const luasM2 = parseFloat(searchParams.get('luas_m2') || '12500');

    let liveWeather = undefined;

    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_temperature_0_to_7cm&daily=et0_fao_evapotranspiration,precipitation_sum&forecast_days=7&timezone=Asia%2FJakarta`,
        { next: { revalidate: 3600 } } // Cache 1 jam
      );

      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const sm0_7_arr = wData.hourly?.soil_moisture_0_to_7cm || [];
        const sm7_28_arr = wData.hourly?.soil_moisture_7_to_28cm || [];
        const dailyRain = wData.daily?.precipitation_sum || [];
        const dailyEt0 = wData.daily?.et0_fao_evapotranspiration || [];

        const currentSm0_7 = sm0_7_arr[0] ?? 0.23;
        const currentSm7_28 = sm7_28_arr[0] ?? 0.25;
        const totalRain7d = dailyRain.reduce((a: number, b: number) => a + (b || 0), 0);
        const avgEt0 = dailyEt0.length ? dailyEt0.reduce((a: number, b: number) => a + (b || 0), 0) / dailyEt0.length : 4.5;

        liveWeather = {
          soilMoisture0to7cm: currentSm0_7,
          soilMoisture7to28cm: currentSm7_28,
          et0: avgEt0,
          rain7Days: totalRain7d,
        };
      }
    } catch (err) {
      console.warn('[Agro-Climate API] Gagal menarik data real-time, menggunakan simulasi klimatologis:', err);
    }

    const telemetry = evaluateSawahAgroTelemetry(nama, { lat, lng }, luasM2, liveWeather);

    return NextResponse.json({
      success: true,
      data: telemetry,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
