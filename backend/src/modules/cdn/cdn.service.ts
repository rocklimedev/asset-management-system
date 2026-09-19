import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Minimal file shape required by the CDN service.
 *
 * This avoids depending on Express.Multer.File types while remaining
 * compatible with files produced by NestJS/Multer.
 */
export interface CdnUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * In-house CDN service.
 *
 * Files are written to a local/mounted volume (`CDN_STORAGE_ROOT`) that is
 * served by our own reverse proxy / edge cache under `CDN_PUBLIC_BASE_URL`.
 *
 * This intentionally has NO dependency on S3, Cloudinary, Firebase, or any
 * other third-party storage or CDN provider — everything stays on
 * infrastructure we control.
 *
 * Swap the disk read/write calls below for whatever our internal object
 * store's SDK exposes if/when assets move off local disk, but keep the
 * public interface (uploadAssetImage / deleteAssetImage) the same so
 * callers never need to change.
 */

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface CdnUploadResult {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class CdnService {
  private readonly storageRoot =
    process.env.CDN_STORAGE_ROOT || "/var/cdn-storage";

  private readonly publicBaseUrl =
    process.env.CDN_PUBLIC_BASE_URL || "https://cdn.internal.company.com";

  // ============================================================
  // UPLOAD ASSET IMAGE
  // ============================================================

  async uploadAssetImage(
    file: CdnUploadFile | undefined,
  ): Promise<CdnUploadResult> {
    if (!file) {
      throw new BadRequestException("No file was provided.");
    }

    const extension = ALLOWED_MIME_TYPES[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        "Unsupported image type. Allowed types: JPEG, PNG, WEBP.",
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("Image exceeds the 5MB size limit.");
    }

    const relativeDir = "assets/images";
    const fileName = `${randomUUID()}.${extension}`;
    const relativeKey = `${relativeDir}/${fileName}`;

    const absoluteDir = path.join(this.storageRoot, relativeDir);

    const absolutePath = path.join(this.storageRoot, relativeKey);

    try {
      await fs.mkdir(absoluteDir, {
        recursive: true,
      });

      await fs.writeFile(absolutePath, file.buffer);
    } catch {
      throw new InternalServerErrorException(
        "Failed to store image on the CDN volume.",
      );
    }

    return {
      key: relativeKey,
      url: `${this.publicBaseUrl}/${relativeKey}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  // ============================================================
  // DELETE ASSET IMAGE
  // ============================================================

  async deleteAssetImage(key: string | null | undefined): Promise<void> {
    if (!key) {
      return;
    }

    // Guard against path traversal.
    const absolutePath = path.join(this.storageRoot, key);

    const normalizedRoot = path.normalize(this.storageRoot);

    if (!absolutePath.startsWith(normalizedRoot)) {
      throw new BadRequestException("Invalid image key.");
    }

    try {
      await fs.unlink(absolutePath);
    } catch {
      // Already gone / never existed.
      // Deletion is intentionally idempotent.
    }
  }

  // ============================================================
  // BUILD PUBLIC URL FROM A STORED KEY
  // ============================================================

  buildUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
