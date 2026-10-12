import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../common/supabase.service';
import type { AuthedRequest } from './firebase-auth.guard';

export const PERMISSIONS = 'permissions';
/** Exige permisos `recurso.accion` (ver tabla public.permissions). */
export const RequirePermissions = (...keys: string[]) => SetMetadata(PERMISSIONS, keys);
/** Exige segundo factor verificado (operaciones de Ops Center). */
export const REQUIRE_MFA = 'requireMfa';
export const RequireMfa = () => SetMetadata(REQUIRE_MFA, true);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: SupabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS, targets) ?? [];
    const needsMfa = this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA, targets) ?? false;
    if (required.length === 0 && !needsMfa) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new ForbiddenException();

    if (needsMfa && !req.user.firebase?.sign_in_second_factor) {
      throw new ForbiddenException('Esta operación requiere verificación en dos pasos');
    }

    const granted = await this.db.permissionsFor(req.user.uid);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
