import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { RequirePermissions } from '@/common/decorator/roles.decorator';
import { CDN_MAX_FILE_SIZE, CdnUploadFile } from '../cdn/cdn.service';
import { RecordAttachmentsService } from './record-attachments.service';
class UploadAttachmentDto { @IsIn(['image', 'invoice']) purpose!: 'image' | 'invoice'; }
@Controller('record-attachments')
export class RecordAttachmentsController {
  constructor(private readonly service: RecordAttachmentsService) {}
  @Get(':resource/:id')
  list(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string) { return this.service.list(resource, id); }
  @Post(':resource/:id')
  @RequirePermissions('assets:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CDN_MAX_FILE_SIZE, files: 1 } }))
  upload(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UploadAttachmentDto, @UploadedFile() file?: CdnUploadFile) { return this.service.upload(resource, id, dto.purpose, file); }
}
