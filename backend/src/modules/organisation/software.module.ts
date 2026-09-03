import { Module } from "@nestjs/common";
import { SoftwareController } from "./software.controller";

@Module({ controllers: [SoftwareController] })
export class SoftwareModule {}
