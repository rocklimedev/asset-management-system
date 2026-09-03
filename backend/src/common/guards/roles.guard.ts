import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorator/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorator/public.decorator";

// Server-side permission enforcement. Never trust the frontend to hide a button and call it authorization.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const userPermissions: string[] = req.user?.permissions ?? [];
    const ok = required.every((p) => userPermissions.includes(p));
    if (!ok) {
      throw new ForbiddenException(
        "You do not have permission to perform this action.",
      );
    }
    return true;
  }
}
