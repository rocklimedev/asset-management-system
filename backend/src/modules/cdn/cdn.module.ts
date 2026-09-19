import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

import { CdnService } from "./cdn.service";
import { CdnController } from "./cdn.controller";

@Module({
  imports: [
    MulterModule.register({
      // In-memory buffer — CdnService writes it to our own storage volume.
      // No third-party storage SDK involved.
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  ],

  providers: [CdnService],

  controllers: [CdnController],

  exports: [CdnService],
})
export class CdnModule {}
