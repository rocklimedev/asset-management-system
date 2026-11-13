# Shared CDN module

Import CdnModule into any feature module and inject CdnService. No storage SDK dependencies are required.

## Upload API

POST /cdn/upload (multipart/form-data), using the application's normal authentication and assets:write permission:

- file: binary file
- resourceType: assets, software, vendors, or any future resource name
- resourceId: optional record ID
- purpose: image, invoice, or document

Response: { key, url, mimeType, size }. Example key: software/<id>/invoices/<uuid>.pdf.
Persist the returned key on the owning entity or attachment record; this endpoint stores files and does not create database links. It does not verify that resourceId exists. Original filenames are never used as storage paths.

DELETE /cdn/files accepts JSON { "key": "software/<id>/invoices/<uuid>.pdf" } with the same permission. Missing files are treated as already deleted.

Internal usage:

    await cdn.upload(file, { resourceType: 'software', resourceId: software.id, purpose: 'invoice' });
    await cdn.deleteFile(key);

Existing POST /cdn/assets/image, DELETE /cdn/assets/image/:key and asset-specific image calls remain supported. Pass an encoded key once on the legacy path route; use the JSON delete endpoint for new integrations.

## Accepted files

Images: JPEG, PNG, WebP, up to 5 MiB. Invoices/documents: those images or PDF, up to 10 MiB. Both MIME type and file signature are checked. The allowlist lives in CdnService and can be extended for future file formats. HTML, SVG and executable files are excluded.

## Configuration

Copy the CDN settings in backend/.env.example into your deployment environment. Real secrets belong only in the environment.

local: writes to CDN_STORAGE_ROOT (defaults to ./storage/cdn). Configure a static server/reverse proxy to serve that directory at CDN_PUBLIC_BASE_URL. The backend does not expose the storage directory automatically. Use protected delivery or a private origin for confidential invoices.

http: set CDN_STORAGE_DRIVER=http, CDN_API_URL, CDN_API_TOKEN and CDN_PUBLIC_BASE_URL. The storage API must accept PUT <CDN_API_URL>/<key> with raw file bytes, Content-Type and Authorization: Bearer <token>. DELETE at the same URL removes the file; 404 is accepted. Other non-success responses fail the request. Requests time out after 30 seconds and redirects are rejected. This is an HTTP object API contract, not an S3 or Cloudinary adapter.

CDN_PUBLIC_BASE_URL is the delivery URL and may differ from the write API URL. The HTTP adapter requires HTTPS for credentials. Storage-provider credentials are never returned by the API.

## Linked record attachments

Apply backend/migrations/008_record_attachments.sql before using frontend attachments. It adds nullable JSON attachment lists to assets and systems.

GET /record-attachments/:resource/:id lists persisted attachments. POST at the same path accepts multipart file and purpose (image or invoice). resource is assets or systems; software uses its backing asset ID. The upload route requires assets:write. The record must exist. Files append to the existing list under a row lock; asset image uploads also update the asset thumbnail. Failed database writes trigger cleanup of the newly uploaded file.

Asset and workstation forms stage files until Save; record detail panels upload using the Upload selected files button. Failed form uploads can be retried without recreating the parent record or re-uploading completed files.
