import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { SupabaseService } from './common/supabase.service';
import { FirebaseService } from './auth/firebase.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, MeController],
  providers: [
    SupabaseService,
    FirebaseService,
    // Orden: rate limit → autenticación → permisos
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
