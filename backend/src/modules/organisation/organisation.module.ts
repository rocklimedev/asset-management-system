import { Module } from "@nestjs/common";

import { OrganisationsController } from "./organisation.controller";
import { OrganisationsService } from "./organisation.service";

@Module({
  controllers: [OrganisationsController],

  providers: [OrganisationsService],

  exports: [OrganisationsService],
})
export class OrganisationsModule {}
