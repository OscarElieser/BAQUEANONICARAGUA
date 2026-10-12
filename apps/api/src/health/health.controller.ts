import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/firebase-auth.guard';
import { SupabaseService } from '../common/supabase.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: SupabaseService) {}

  /** Usado por el paso "comprobar salud" del despliegue. Reporta el estado real de la BD. */
  @Public()
  @Get()
  async health() {
    const started = Date.now();
    const { error } = await this.db.admin.from('departments').select('id', { head: true, count: 'exact' });
    return {
      status: error ? 'degraded' : 'ok',
      database: error ? 'unreachable' : 'ok',
      latency_ms: Date.now() - started,
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
}
