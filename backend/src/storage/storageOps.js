/**
 * Lazy-loaded S3 client singleton and S3-specific storage operations.
 */
import fs from 'fs';
import {
  getStorageDriver,
  buildStorageKey,
  normalizeStorageKey,
  localAbsolutePath,
  UPLOADS_ROOT,
} from './storageKeys.js';
import path from 'path';

function requireS3Env() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY'
    );
  }
  return {
    bucket,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle:
      String(process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() !== 'false',
  };
}

let s3ClientPromise = null;

export async function getS3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const cfg = requireS3Env();
      return {
        client: new S3Client({
          region: cfg.region,
          endpoint: cfg.endpoint,
          forcePathStyle: cfg.forcePathStyle,
          credentials: {
            accessKeyId: cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
          },
        }),
        bucket: cfg.bucket,
      };
    })();
  }
  return s3ClientPromise;
}

/**
 * Persist a file that multer already wrote to disk.
 * When S3 is on: uploads the file then removes the local temp copy.
 * @returns {{ driver: 'local'|'s3', storageKey: string, url: string }}
 */
export async function commitUploadedFile({ prefix, filename, localPath, contentType, hostBase }) {
  const storageKey = buildStorageKey(prefix, filename);
  const driver = getStorageDriver();

  if (driver === 'local') {
    const dest = localAbsolutePath(storageKey);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (path.resolve(localPath) !== path.resolve(dest)) {
      fs.renameSync(localPath, dest);
    }
    const base = String(hostBase || '').replace(/\/$/, '');
    return { driver: 'local', storageKey, url: `${base}/uploads/${storageKey}` };
  }

  const { client, bucket } = await getS3Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const body = fs.createReadStream(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  try {
    fs.unlinkSync(localPath);
  } catch {
    /* ignore */
  }

  const base = String(hostBase || '').replace(/\/$/, '');
  return { driver: 's3', storageKey, url: `${base}/uploads/${storageKey}` };
}

export async function deleteStoredObject(storageKey, legacyPrefix = null) {
  const key = normalizeStorageKey(storageKey, legacyPrefix);
  if (!key) return;
  if (getStorageDriver() === 'local') {
    const abs = localAbsolutePath(key);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    return;
  }
  const { client, bucket } = await getS3Client();
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function objectExists(storageKey, legacyPrefix = null) {
  const key = normalizeStorageKey(storageKey, legacyPrefix);
  if (!key) return false;
  if (getStorageDriver() === 'local') {
    return fs.existsSync(localAbsolutePath(key));
  }
  const { client, bucket } = await getS3Client();
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Signed GET URL (S3) or local absolute path metadata.
 * @returns {{ mode: 'redirect'|'file', url?: string, path?: string, contentType?: string }}
 */
export async function resolveDownload(
  storageKey,
  { legacyPrefix = null, downloadName = null, contentType = null, expiresInSeconds = null } = {}
) {
  const key = normalizeStorageKey(storageKey, legacyPrefix);
  if (!key) return null;

  if (getStorageDriver() === 'local') {
    const abs = localAbsolutePath(key);
    if (!fs.existsSync(abs)) return null;
    return { mode: 'file', path: abs, contentType };
  }

  const ttl = Math.max(
    60,
    Number(expiresInSeconds) || Number(process.env.S3_SIGNED_URL_TTL_SECONDS) || 900
  );
  const { client, bucket } = await getS3Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: contentType || undefined,
    ResponseContentDisposition: downloadName
      ? `attachment; filename="${String(downloadName).replace(/"/g, '')}"`
      : undefined,
  });
  const url = await getSignedUrl(client, command, { expiresIn: ttl });
  return { mode: 'redirect', url, contentType };
}

/** Stream object body (S3) or create read stream (local) — for in-process piping. */
export async function openObjectStream(storageKey, legacyPrefix = null) {
  const key = normalizeStorageKey(storageKey, legacyPrefix);
  if (!key) return null;
  if (getStorageDriver() === 'local') {
    const abs = localAbsolutePath(key);
    if (!fs.existsSync(abs)) return null;
    return { stream: fs.createReadStream(abs), contentType: null };
  }
  const { client, bucket } = await getS3Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return { stream: out.Body, contentType: out.ContentType || null };
}

/** Read entire object into a Buffer (local or S3). */
export async function readObjectBuffer(storageKey, legacyPrefix = null) {
  const key = normalizeStorageKey(storageKey, legacyPrefix);
  if (!key) return null;
  if (getStorageDriver() === 'local') {
    const abs = localAbsolutePath(key);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs);
  }
  const opened = await openObjectStream(key);
  if (!opened?.stream) return null;
  const chunks = [];
  for await (const chunk of opened.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
