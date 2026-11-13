import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CdnUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}
export interface CdnUploadOptions {
  resourceType: string;
  resourceId?: string;
  purpose: 'image' | 'invoice' | 'document';
}
export interface CdnUploadResult {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
const DOCUMENT_TYPES: Record<string, string> = { ...IMAGE_TYPES, 'application/pdf': 'pdf' };
export const CDN_MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class CdnService {
  constructor(private readonly config: ConfigService) {}

  private get storageRoot(): string {
    return path.resolve(this.config.get<string>('CDN_STORAGE_ROOT') || './storage/cdn');
  }
  private get provider(): string {
    const provider = this.config.get<string>('CDN_STORAGE_DRIVER') || 'local';
    if (!['local', 'http'].includes(provider)) {
      throw new InternalServerErrorException('Unsupported CDN storage driver.');
    }
    return provider;
  }
  private segment(value: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)) {
      throw new BadRequestException('Invalid CDN resource type or ID. Use letters, numbers, underscores or hyphens.');
    }
    return value;
  }
  private validateKey(key: string): string {
    if (!key || key.length > 1024 || !key.split('/').every(part => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(part))) {
      throw new BadRequestException('Invalid CDN file key.');
    }
    return key;
  }
  private localPath(key: string): string {
    this.validateKey(key);
    const target = path.resolve(this.storageRoot, key);
    const relative = path.relative(this.storageRoot, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new BadRequestException('Invalid CDN file key.');
    return target;
  }
  buildUrl(key: string): string {
    this.validateKey(key);
    const base = this.config.get<string>('CDN_PUBLIC_BASE_URL');
    if (!base) throw new InternalServerErrorException('CDN_PUBLIC_BASE_URL is not configured.');
    let url: URL;
    try { url = new URL(base); } catch { throw new InternalServerErrorException('Invalid CDN_PUBLIC_BASE_URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new InternalServerErrorException('Invalid CDN_PUBLIC_BASE_URL.');
    }
    return base.replace(/[/]+$/, '') + '/' + key;
  }
  private matchesContent(buffer: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mime === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    if (mime === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
    return false;
  }
  private async remoteRequest(method: 'PUT' | 'DELETE', key: string, file?: CdnUploadFile): Promise<void> {
    const endpoint = this.config.get<string>('CDN_API_URL');
    const token = this.config.get<string>('CDN_API_TOKEN');
    if (!endpoint || !token) throw new InternalServerErrorException('CDN_API_URL and CDN_API_TOKEN must be configured for HTTP storage.');
    let url: URL;
    try { url = new URL(endpoint); } catch { throw new InternalServerErrorException('Invalid CDN_API_URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new InternalServerErrorException('CDN_API_URL must be an HTTPS URL without credentials, query or fragment.');
    }
    try {
      const response = await fetch(endpoint.replace(/[/]+$/, '') + '/' + this.validateKey(key), {
        method, redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: 'Bearer ' + token, ...(file ? { 'Content-Type': file.mimetype } : {}) },
        ...(file ? { body: new Uint8Array(file.buffer) } : {}),
      });
      await response.body?.cancel();
      if (!response.ok && !(method === 'DELETE' && response.status === 404)) throw new Error('CDN request failed');
    } catch { throw new InternalServerErrorException('CDN storage request failed.'); }
  }
  async upload(file: CdnUploadFile | undefined, options: CdnUploadOptions): Promise<CdnUploadResult> {
    if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new BadRequestException('No file was provided.');
    if (!['image', 'invoice', 'document'].includes(options.purpose)) throw new BadRequestException('Invalid upload purpose.');
    const types = options.purpose === 'image' ? IMAGE_TYPES : DOCUMENT_TYPES;
    const extension = types[file.mimetype];
    if (!extension || !this.matchesContent(file.buffer, file.mimetype)) {
      throw new BadRequestException(options.purpose === 'image' ? 'Upload a valid JPEG, PNG or WebP image.' : 'Upload a valid PDF, JPEG, PNG or WebP document.');
    }
    const limit = options.purpose === 'image' ? 5 * 1024 * 1024 : CDN_MAX_FILE_SIZE;
    if (file.size !== file.buffer.length || file.buffer.length > limit) throw new BadRequestException('File exceeds the size limit or has an invalid size.');
    const key = [this.segment(options.resourceType), ...(options.resourceId ? [this.segment(options.resourceId)] : []), options.purpose + 's', randomUUID() + '.' + extension].join('/');
    const url = this.buildUrl(key);
    if (this.provider === 'http') await this.remoteRequest('PUT', key, file);
    else {
      const target = this.localPath(key);
      try {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.buffer, { flag: 'wx' });
      } catch { throw new InternalServerErrorException('Failed to store the CDN file.'); }
    }
    return { key, url, mimeType: file.mimetype, size: file.buffer.length };
  }
  async deleteFile(key: string): Promise<void> {
    this.validateKey(key);
    if (this.provider === 'http') return this.remoteRequest('DELETE', key);
    try { await fs.unlink(this.localPath(key)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new InternalServerErrorException('Failed to delete the CDN file.');
    }
  }
  // Compatibility for existing asset image callers and stored keys.
  uploadAssetImage(file: CdnUploadFile | undefined): Promise<CdnUploadResult> {
    return this.upload(file, { resourceType: 'assets', purpose: 'image' });
  }
  async deleteAssetImage(key: string | null | undefined): Promise<void> {
    if (key) await this.deleteFile(key);
  }
}
