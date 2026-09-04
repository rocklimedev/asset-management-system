import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { RequirePermissions } from "@/common/decorator/roles.decorator";

@Controller("audit-logs")
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @RequirePermissions("audit.view")
  list(
    @Query("entity") entity?: string,
    @Query("action") action?: string,
    @Query("page") page = "1",
  ) {
    const take = 50;
    const skip = (Number(page) - 1) * take;
    return this.audit.list({ entity, action, take, skip });
  }
}
