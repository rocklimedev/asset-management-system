import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '@/common/decorator/roles.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @RequirePermissions('users.manage')
  list(
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('page') page = '1',
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const take = 50;
    const pageNumber = Number(page);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 1000000) {
      throw new BadRequestException('Page must be a positive integer.');
    }
    for (const date of [from, to]) {
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
        throw new BadRequestException('Dates must use YYYY-MM-DD.');
      }
    }
    if (from && to && from > to) throw new BadRequestException('Start date must precede end date.');
    const skip = (pageNumber - 1) * take;
    return this.audit.list({ entity, action, take, skip, search: search?.slice(0, 200), from, to });
  }
}
