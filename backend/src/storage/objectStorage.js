/**
 * Pluggable object storage: local disk (default) or S3-compatible (MinIO/AWS/R2).
 *
 * Env:
 *   STORAGE_DRIVER=local|s3          (default local)
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT                      (MinIO: http://localhost:9000 or http://minio:9000)
 *   S3_FORCE_PATH_STYLE=true         (required for MinIO)
 *   S3_SIGNED_URL_TTL_SECONDS=900
 *
 * This module is a barrel re-exporting from the split sub-modules:
 *   - storageKeys.js  – key building, normalisation, driver detection
 *   - storageOps.js   – S3 client, CRUD operations, streaming
 *   - storageExpress.js – Express response helpers
 */
export {
  UPLOADS_ROOT,
  getStorageDriver,
  isObjectStorageEnabled,
  buildStorageKey,
  normalizeStorageKey,
  keyFromUploadUrl,
  localAbsolutePath,
} from './storageKeys.js';

export {
  commitUploadedFile,
  deleteStoredObject,
  objectExists,
  resolveDownload,
  openObjectStream,
  readObjectBuffer,
  getS3Client,
} from './storageOps.js';

export { sendStoredFile } from './storageExpress.js';
