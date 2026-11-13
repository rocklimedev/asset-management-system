import { Body, Controller, Delete, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CdnService, CdnUploadFile, CDN_MAX_FILE_SIZE } from './cdn.service';
import { CdnUploadDto, CdnDeleteDto } from './cdn-upload.dto';
import { RequirePermissions } from '@/common/decorator/roles.decorator';

@Controller('cdn')
export class CdnController {
  constructor(private readonly cdn: CdnService) {}

  @Post('upload')
  @RequirePermissions('assets:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CDN_MAX_FILE_SIZE, files: 1 } }))
  upload(@UploadedFile() file: CdnUploadFile | undefined, @Body() dto: CdnUploadDto) {
    return this.cdn.upload(file, dto);
  }

  @Delete('files')
  @RequirePermissions('assets:write')
  async deleteFile(@Body() dto: CdnDeleteDto) {
    await this.cdn.deleteFile(dto.key);
    return { message: 'File deleted.' };
  }

  @Post('assets/image')
  @RequirePermissions('assets:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadAssetImage(@UploadedFile() file: CdnUploadFile | undefined) {
    return this.cdn.uploadAssetImage(file);
  }

  @Delete('assets/image/:key')
  @RequirePermissions('assets:write')
  async deleteAssetImage(@Param('key') key: string) {
    await this.cdn.deleteAssetImage(key);
    return { message: 'Image deleted.' };
  }
}
