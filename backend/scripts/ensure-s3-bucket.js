/**
 * Create the S3/MinIO bucket if missing.
 * Usage: STORAGE_DRIVER=s3 S3_BUCKET=campus S3_… node scripts/ensure-s3-bucket.js
 */
import "dotenv/config";
import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
if (!bucket) {
  console.error("S3_BUCKET is required");
  process.exit(1);
}

const client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() !== "false",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(JSON.stringify({ ok: true, bucket, existed: true }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(JSON.stringify({ ok: true, bucket, created: true }));
}
