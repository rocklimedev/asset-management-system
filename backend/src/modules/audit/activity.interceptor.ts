import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, concatMap } from 'rxjs';
import { AuditService } from './audit.service';

// These controllers do not write their own business-level audit records.
// Existing transactional logging in assets/users/roles/employees is retained.
const ENTITIES: Record<string, string> = {
  SoftwareController: 'Software',
  AssetCategoryController: 'AssetCategory',
  OrganisationsController: 'Organisation',
  AssetAssignmentController: 'AssetAssignment',
  AuthController: 'Account',
};

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityInterceptor.name);
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = ENTITIES[context.getClass().name];
    const request = context.switchToHttp().getRequest();
    if (!entity || !['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return next.handle();
    const operation = context.getHandler().name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
    return next.handle().pipe(concatMap(async result => {
      const userId = request.user?.id || (entity === 'Account' ? result?.user?.id : undefined);
      if (!userId) return result;
      try {
        await this.audit.log({
          userId,
          entity,
          action: `${entity.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_${operation}`,
          entityId: request.params?.id || request.params?.licenseId || request.params?.systemId || result?.id || result?.user?.id || (entity === 'Account' ? userId : randomUUID()),
          // Never persist request bodies or responses: they can contain credentials.
          metadata: { method: request.method, route: request.route?.path || '' },
        });
      } catch {
        // The business operation has already committed; do not report it as failed.
        this.logger.error(`Activity logging failed for ${entity} ${operation}`);
      }
      return result;
    }));
  }
}
