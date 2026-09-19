import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { CdnService, CdnUploadFile } from "./cdn.service";
import { RequirePermissions } from "@/common/decorator/roles.decorator";

@Controller("cdn")
export class CdnController {
  constructor(private readonly cdn: CdnService) {}

  // ============================================================
  // UPLOAD ASSET IMAGE
  //
  // Returns { key, url } — persist `key` on the Asset row so the
  // image can be looked up / deleted later, and `url` for display.
  // ============================================================

  @Post("assets/image")
  @RequirePermissions("assets:write")
  @UseInterceptors(FileInterceptor("file"))
  async uploadAssetImage(@UploadedFile() file: CdnUploadFile) {
    return this.cdn.uploadAssetImage(file);
  }

  // ============================================================
  // DELETE ASSET IMAGE
  // ============================================================

  @Delete("assets/image/:key")
  @RequirePermissions("assets:write")
  async deleteAssetImage(@Param("key") key: string) {
    await this.cdn.deleteAssetImage(decodeURIComponent(key));

    return {
      message: "Image deleted.",
    };
  }
}
