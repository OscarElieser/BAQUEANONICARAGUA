import { BadGatewayException, Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../auth/firebase-auth.guard';
import { ZodPipe } from '../common/zod.pipe';

const schema = z.object({
  lat: z.coerce.number().min(10.5).max(15.2),
  lng: z.coerce.number().min(-88).max(-82.5),
});

type Forecast = {
  source: string;
  updated_at: string;
  current: { temperature_c: number; feels_like_c: number; wind_kmh: number } | null;
  daily: Array<{ date: string; max_c: number; min_c: number; rain_probability: number | null }>;
  official_alerts: null; // sin integración verificada con avisos oficiales: no se muestran
};

const cache = new Map<string, { at: number; value: Forecast }>();

/**
 * Clima con proveedor con licencia (ADR-006). Sin proveedor configurado responde 503;
 * nunca muestra datos simulados. Cada respuesta indica fuente y hora de actualización.
 */
@ApiTags('clima')
@Public()
@Controller('weather')
export class WeatherController {
  @Get()
  async forecast(@Query(new ZodPipe(schema)) q: z.infer<typeof schema>): Promise<Forecast> {
    const provider = process.env.WEATHER_PROVIDER;
    const key = process.env.WEATHER_API_KEY;
    if (provider !== 'open-meteo' || !key) {
      throw new ServiceUnavailableException('El pronóstico se activa al configurar el proveedor meteorológico con licencia.');
    }
    const cacheKey = `${q.lat.toFixed(2)},${q.lng.toFixed(2)}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < 15 * 60_000) return hit.value;

    // Plan comercial de Open-Meteo (endpoint con clave). El plan gratuito no permite uso comercial.
    const url = new URL('https://customer-api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(q.lat),
      longitude: String(q.lng),
      current: 'temperature_2m,apparent_temperature,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'America/Managua',
      forecast_days: '5',
      apikey: key,
    }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!res?.ok) throw new BadGatewayException('El proveedor meteorológico no respondió. Intenta más tarde.');
    const j = (await res.json()) as {
      current?: { time: string; temperature_2m: number; apparent_temperature: number; wind_speed_10m: number };
      daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max?: (number | null)[] };
    };
    const value: Forecast = {
      source: 'Open-Meteo (plan comercial)',
      updated_at: j.current?.time ?? new Date().toISOString(),
      current: j.current
        ? { temperature_c: j.current.temperature_2m, feels_like_c: j.current.apparent_temperature, wind_kmh: j.current.wind_speed_10m }
        : null,
      daily: (j.daily?.time ?? []).map((date, i) => ({
        date,
        max_c: j.daily!.temperature_2m_max[i],
        min_c: j.daily!.temperature_2m_min[i],
        rain_probability: j.daily!.precipitation_probability_max?.[i] ?? null,
      })),
      official_alerts: null,
    };
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  }
}
