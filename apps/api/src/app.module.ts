import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { FirebaseService } from './auth/firebase.service';
import { AssistantController } from './assistant/assistant.controller';
import { BusinessesController } from './businesses/businesses.controller';
import { CatalogController } from './catalog/catalog.controller';
import { CommunityController } from './community/community.controller';
import { ConversationsController } from './messaging/conversations.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { SupabaseService } from './common/supabase.service';
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { VerificationsController } from './ops/verifications.controller';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [
    HealthController,
    MeController,
    CatalogController,
    BusinessesController,
    VerificationsController,
    CommunityController,
    ConversationsController,
    NotificationsController,
    AssistantController,
  ],
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
