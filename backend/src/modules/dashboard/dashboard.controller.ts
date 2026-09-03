import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { RequirePermissions } from "../../common/decorator/roles.decorator";

@Controller("dashboard")
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  @RequirePermissions("dashboard.view")
  summary() {
    return this.service.summary();
  }
}
